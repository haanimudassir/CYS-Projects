import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { MODULES } from '../data/constants.js';
import { randHex } from '../utils/helpers.js';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function genCsrfToken() { return 'csrf_' + randHex(18); }
function genCsrfSession() { return 'sess_' + randHex(4); }

export function AppProvider({ children }) {
  const [activePanel, setActivePanel] = useState('dashboard');
  const [mode, setMode] = useState('vulnerable');
  const [solved, setSolved] = useState({});
  const [authAttempts, setAuthAttempts] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifId = useRef(0);

  // CSRF-specific state (reset whenever mode toggles, same as original)
  const [csrfToken, setCsrfToken] = useState(genCsrfToken());
  const [csrfBalance, setCsrfBalance] = useState(0);
  const [csrfSession, setCsrfSession] = useState(genCsrfSession());
  const [csrfUsedTokens, setCsrfUsedTokens] = useState(() => new Set());

  const notify = useCallback((msg, type) => {
    const id = ++notifId.current;
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3500);
  }, []);

  const markSolved = useCallback((key) => {
  if (solved[key]) return;

  setSolved(prev => ({ ...prev, [key]: true }));

  notify(
    '⚡ Exploit found! [' + key.toUpperCase() + '] module solved.',
    'solve'
  );
}, [solved, notify]);

  const csrfInit = useCallback(() => {
    setCsrfBalance(0);
    setCsrfSession(genCsrfSession());
    setCsrfToken(genCsrfToken());
    setCsrfUsedTokens(new Set());
  }, []);


  const toggleMode = useCallback(() => {
  const next = mode === 'vulnerable' ? 'secure' : 'vulnerable';

  setMode(next);

  notify(
    next === 'secure' ? '🔒 Secure mode active — attacks blocked' : '⚠ Vulnerable mode active — attacks enabled',
    next === 'secure' ? 'sec' : 'vuln'
  );

  setAuthAttempts(0);
  csrfInit();
}, [mode, notify, csrfInit]);

  const goPanel = useCallback((id) => {
    setActivePanel(id);
    setMobileNavOpen(false);
  }, []);

  const toggleMobileNav = useCallback(() => setMobileNavOpen(v => !v), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const solvedCount = Object.keys(solved).length;
  const totalModules = MODULES.length;

  const value = {
    activePanel, goPanel,
    mode, toggleMode,
    solved, markSolved, solvedCount, totalModules,
    authAttempts, setAuthAttempts,
    mobileNavOpen, toggleMobileNav, closeMobileNav,
    notifications, notify,
    csrfToken, setCsrfToken,
    csrfBalance, setCsrfBalance,
    csrfSession, setCsrfSession,
    csrfUsedTokens, setCsrfUsedTokens,
    csrfInit,
    genCsrfToken, genCsrfSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
