import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        "inverse-on-surface": "#313030",
        "surface-container-high": "#2a2a2a",
        "surface-container-lowest": "#0e0e0e",
        "primary-fixed-dim": "#ffb3b4",
        "surface-bright": "#393939",
        "inverse-primary": "#ba1434",
        "on-primary": "#680016",
        "on-secondary-container": "#b1bb7c",
        "on-tertiary": "#3a3000",
        "on-error-container": "#ffdad6",
        "background": "#131313",
        "on-primary-fixed": "#40000a",
        "secondary-fixed": "#dfe8a6",
        "on-error": "#690005",
        "surface-container": "#201f1f",
        "error-container": "#93000a",
        "tertiary-container": "#c9a900",
        "primary-container": "#c41e3a",
        "on-background": "#e5e2e1",
        "secondary-container": "#434b18",
        "outline": "#aa8989",
        "on-secondary-fixed-variant": "#434b18",
        "outline-variant": "#5b4040",
        "surface-tint": "#ffb3b4",
        "on-surface": "#e5e2e1",
        "tertiary-fixed": "#ffe16d",
        "on-primary-fixed-variant": "#920023",
        "on-tertiary-fixed-variant": "#544600",
        "error": "#ffb4ab",
        "tertiary": "#e9c400",
        "on-secondary-fixed": "#191e00",
        "primary-fixed": "#ffdad9",
        "on-secondary": "#2d3404",
        "surface-container-highest": "#353534",
        "primary": "#ffb3b4",
        "surface-variant": "#353534",
        "on-primary-container": "#ffdada",
        "surface-container-low": "#1c1b1b",
        "tertiary-fixed-dim": "#e9c400",
        "surface-dim": "#131313",
        "on-tertiary-container": "#4c3e00",
        "on-tertiary-fixed": "#221b00",
        "surface": "#131313",
        "on-surface-variant": "#e3bebd",
        "inverse-surface": "#e5e2e1",
        "secondary": "#c3cc8c",
        "secondary-fixed-dim": "#c3cc8c"
      },
      fontFamily: {
        headline: ['var(--font-lexend)', 'sans-serif'],
        body: ['var(--font-manrope)', 'sans-serif'],
        label: ['var(--font-manrope)', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      }
    },
  },
  plugins: [],
};

export default config;
