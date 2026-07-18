export const MODEL_FALLBACKS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];

export function buildScanPrompt(input) {
  let target = '';
  if (input.type === 'url') {
    target = `INPUT TYPE: URL / Domain
TARGET URL : ${input.url}
APP TYPE   : ${input.appType || 'Auto-detect from URL patterns'}
EXTRA NOTES: ${input.ctx || 'None provided'}

Analyse this URL deeply. Infer the tech stack from URL patterns (.php, .asp, /api/, /graphql, /admin, query-param names, port numbers). Identify: parameter injection points, authentication endpoints, likely admin paths, SSRF via redirect/url params, open redirect indicators, and any security signals in the URL.`;
  } else if (input.type === 'code') {
    target = `INPUT TYPE : Source Code
LANGUAGE   : ${input.lang}

\`\`\`${input.lang}
${input.code}
\`\`\`

Analyse every statement in this code. Reference exact variable names, function names, and line patterns from the code above in your evidence fields.`;
  } else {
    target = `INPUT TYPE : Raw HTTP Request

\`\`\`http
${input.http}
\`\`\`
ANALYST NOTES: ${input.notes || 'None'}

Analyse: HTTP method, URL path, every header present (Authorization, Cookie, Content-Type, CORS headers, security headers that are MISSING), body parameters, and technology fingerprints. Note which security headers are absent.`;
  }

  return `You are a senior OWASP-certified penetration tester. Analyse the input and produce a structured JSON security report.

${target}

YOU MUST respond with ONLY a valid JSON object. First character = { and last character = }. No markdown fences, no explanation, no text outside the JSON.

REQUIRED JSON STRUCTURE:
{
  "executive_summary": "2-3 sentences on overall security posture, specific to this exact input",
  "overall_risk": "critical",
  "findings": [
    {
      "id": "F001",
      "title": "Concise vulnerability name",
      "severity": "critical",
      "owasp": "A03:2021 - Injection",
      "icon": "💉",
      "location": "Exact location: parameter name / line / function / header",
      "description": "Technical explanation of WHY this is vulnerable in this specific input",
      "evidence": "Verbatim text from the input that proves this vulnerability exists",
      "impact": "Concrete attacker impact: what they can steal, execute, or bypass",
      "remediation_steps": "1. Specific fix step\\n2. Next step\\n3. Verification step",
      "secure_code_example": "Real implementable code fix — language-specific, copy-paste ready",
      "references": "CWE-XXX | OWASP: https://owasp.org/Top10/AXXX"
    }
  ],
  "remediation_roadmap": "IMMEDIATE (0-24h): Fix X because critical...\\nSHORT-TERM (1 week): Address Y...\\nLONG-TERM (1 month): Implement Z...",
  "positive_observations": "Security measures already in place, or 'None identified'"
}

SEVERITY DEFINITIONS:
- critical = RCE, auth bypass, mass data breach possible right now
- high     = SQLi, stored XSS, significant auth/authz flaw, sensitive data leak  
- medium   = Reflected XSS, CSRF, insecure config, missing important security headers
- low      = Minor info disclosure, verbose errors, weak cipher suites
- info     = Best practices, defence-in-depth, hardening suggestions

MANDATORY RULES:
1. Each finding MUST have specific evidence copied verbatim from the input — zero generic findings
2. URL input → cite URL components, params, path segments in evidence
3. Code input → cite exact variable/function/class names from the code
4. HTTP input → cite exact header names, cookie names, parameter values
5. Provide 5-8 findings, ordered critical → info
6. secure_code_example must be real, runnable, language-appropriate code
7. Use \\n inside JSON strings for line breaks — never literal newlines inside string values
8. overall_risk must match the highest finding severity`;
}

/*
 - Calls the Groq API, trying each model in MODEL_FALLBACKS in order.
 - Only advances to the next model on a model_decommissioned error;
 - any other error (bad key, rate limit, etc.) fails fast.
 */
export async function callGroqScan(input, apiKey) {
  let response, lastErrMsg = '';
  for (let i = 0; i < MODEL_FALLBACKS.length; i++) {
    const candidate = MODEL_FALLBACKS[i];
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: candidate,
        max_tokens: 4096,
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an expert OWASP penetration tester. You ONLY respond with a raw JSON object — no markdown code fences, no preamble, no text outside the JSON. The first character of every response must be { and the last must be }.',
          },
          { role: 'user', content: buildScanPrompt(input) },
        ],
      }),
    });
    if (response.ok) return { response, lastErrMsg: '' };
    const errBody = await response.clone().json().catch(() => ({}));
    lastErrMsg = errBody?.error?.message || `Groq API error: HTTP ${response.status}`;
    const isDecommissioned = errBody?.error?.code === 'model_decommissioned' || /decommissioned/i.test(lastErrMsg);
    if (!isDecommissioned) break;
  }
  return { response, lastErrMsg };
}

export function friendlyErrorMessage(msg) {
  if (/request too large|rate limit|tokens per minute|TPM/i.test(msg)) {
    return 'This input is too large for the free-tier token limit on this model. Try pasting a shorter snippet, or wait about a minute and try again. (' + msg + ')';
  }
  if (/decommissioned/i.test(msg)) {
    return 'All configured AI models are currently unavailable on Groq (they may have been retired). This site needs its model list updated — please try again later or contact the site owner. (' + msg + ')';
  }
  return msg;
}

export function parseScanResponse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (_) {
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const clean = fenced ? fenced[1].trim() : rawText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    try {
      return JSON.parse(clean);
    } catch (e2) {
      throw new Error(`Could not parse AI response as JSON. First 200 chars: ${rawText.slice(0, 200)}`);
    }
  }
}
