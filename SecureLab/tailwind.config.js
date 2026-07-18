/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Our design system's colors/spacing/animations live in src/styles/*.css
  // as hand-authored CSS (see src/styles/README.md). Tailwind is available
  // for any NEW utility-class styling you add going forward.
  corePlugins: {
    preflight: true,
  },
};
