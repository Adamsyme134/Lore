export const palette = {
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
} as const;

export type Accent = "forest" | "navy" | "orange" | "burgundy" | "gold";

export const accentClass: Record<Accent, { bg: string; text: string; border: string; subtle: string }> = {
  forest: { bg: "bg-forest", text: "text-forest", border: "border-forest", subtle: "bg-forest/10" },
  navy: { bg: "bg-navy", text: "text-navy", border: "border-navy", subtle: "bg-navy/10" },
  orange: { bg: "bg-orange", text: "text-orange", border: "border-orange", subtle: "bg-orange/10" },
  burgundy: { bg: "bg-burgundy", text: "text-burgundy", border: "border-burgundy", subtle: "bg-burgundy/10" },
  gold: { bg: "bg-gold", text: "text-gold", border: "border-gold", subtle: "bg-gold/10" }
};
