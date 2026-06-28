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
        ivory: "#F5F0E7",
        cream: "#EFE6D8",
        stone: "#D3C7B5",
        charcoal: "#20201E",
        ink: "#171612",
        muted: "#787267",
        line: "#DDD3C2",
        forest: "#284D3A",
        navy: "#1F3446",
        orange: "#A5542A",
        burgundy: "#6C2638",
        gold: "#B88A44"
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
