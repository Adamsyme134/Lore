/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        secondary: "rgb(var(--color-background-secondary) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        stone: "rgb(var(--color-surface-alt) / <alpha-value>)",
        elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
        ui: "rgb(var(--color-ui-secondary) / <alpha-value>)",
        ink: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        tertiary: "rgb(var(--color-text-tertiary) / <alpha-value>)",
        disabled: "rgb(var(--color-text-disabled) / <alpha-value>)",
        line: "rgb(var(--color-border) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        accentText: "rgb(var(--color-accent-text) / <alpha-value>)",
        charcoal: "rgb(var(--color-background-secondary) / <alpha-value>)",
        ivory: "#F5F0E7",
        cream: "#EFE6D8",
        forest: "rgb(var(--color-forest) / <alpha-value>)",
        navy: "rgb(var(--color-navy) / <alpha-value>)",
        orange: "rgb(var(--color-orange) / <alpha-value>)",
        burgundy: "rgb(var(--color-burgundy) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)"
      },
      fontFamily: {
        serif: ["PlayfairDisplay_700Bold"],
        serifSemi: ["PlayfairDisplay_600SemiBold"],
        sans: ["Inter_400Regular"],
        sansMedium: ["Inter_500Medium"],
        sansSemi: ["Inter_600SemiBold"],
        sansBold: ["Inter_700Bold"]
      },
      borderRadius: {
        lore: "28px",
        card: "32px"
      },
      letterSpacing: {
        editorial: "0.08em"
      }
    }
  },
  plugins: []
};
