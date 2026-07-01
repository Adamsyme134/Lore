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
        // Semantic background colors
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        stone: "var(--color-surface-alt)", // kept 'stone' for compatibility if you prefer
        
        // Semantic text colors
        ink: "var(--color-text)",
        muted: "var(--color-text-muted)",
        
        // Semantic borders
        line: "var(--color-border)",
        
        // Retained hardcoded references just in case, but map primary usage to semantic
        charcoal: "#20201E",
        ivory: "#F5F0E7",
        cream: "#EFE6D8",

        // Accents
        forest: "var(--color-forest)",
        navy: "var(--color-navy)",
        orange: "var(--color-orange)",
        burgundy: "var(--color-burgundy)",
        gold: "var(--color-gold)"
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