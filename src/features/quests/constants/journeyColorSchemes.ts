import type { JourneyColorSchemeId } from "../../../shared/types/domain";

export type JourneyColorSchemePreset = {
  id: JourneyColorSchemeId;
  number: string;
  label: string;
  description: string;
  rim: string;
  rimLight: string;
  rimDark: string;
  progress: string;
  text: string;
  glow: string;
};

export const JOURNEY_COLOR_SCHEMES: JourneyColorSchemePreset[] = [
  {
    id: "forest",
    number: "01",
    label: "Forest",
    description: "Nature • Growth • Calm",
    rim: "#718A60",
    rimLight: "#C5D49C",
    rimDark: "#2E4327",
    progress: "#AFCB89",
    text: "#A9BE87",
    glow: "rgba(197, 212, 156, 0.62)"
  },
  {
    id: "ocean",
    number: "02",
    label: "Ocean",
    description: "Exploration • Depth • Freedom",
    rim: "#617BAA",
    rimLight: "#AFC4EA",
    rimDark: "#1B2B45",
    progress: "#91B1DD",
    text: "#91ADD6",
    glow: "rgba(145, 177, 221, 0.62)"
  },
  {
    id: "terracotta",
    number: "03",
    label: "Terracotta",
    description: "Warmth • Culture • Connection",
    rim: "#D47D59",
    rimLight: "#F0B08E",
    rimDark: "#7B311C",
    progress: "#F0A171",
    text: "#EF855E",
    glow: "rgba(240, 161, 113, 0.62)"
  },
  {
    id: "sandstone",
    number: "04",
    label: "Sandstone",
    description: "Adventure • Earth • Timeless",
    rim: "#D7B582",
    rimLight: "#F0D6AC",
    rimDark: "#8A6536",
    progress: "#EAC890",
    text: "#E0AF77",
    glow: "rgba(234, 200, 144, 0.62)"
  },
  {
    id: "slate",
    number: "05",
    label: "Slate",
    description: "Focus • Balance • Clarity",
    rim: "#87949B",
    rimLight: "#C3CDD2",
    rimDark: "#303940",
    progress: "#A9B8BE",
    text: "#99A3AA",
    glow: "rgba(169, 184, 190, 0.62)"
  },
  {
    id: "plum",
    number: "06",
    label: "Plum",
    description: "Creativity • Curiosity • Imagination",
    rim: "#9D6C98",
    rimLight: "#D1A6CF",
    rimDark: "#3E253F",
    progress: "#C18BBE",
    text: "#BB8FB9",
    glow: "rgba(193, 139, 190, 0.62)"
  },
  {
    id: "coastal",
    number: "07",
    label: "Coastal",
    description: "Fresh • Freedom • Flow",
    rim: "#4FA7A6",
    rimLight: "#66B8B6",
    rimDark: "#2D6F6E",
    progress: "#A6E0DE",
    text: "#4FA7A6",
    glow: "rgba(166, 224, 222, 0.62)"
  },
  {
    id: "dawn",
    number: "08",
    label: "Dawn",
    description: "Optimism • Clarity • New Beginnings",
    rim: "#D4A23A",
    rimLight: "#E6B458",
    rimDark: "#8A6A1F",
    progress: "#F7DDA1",
    text: "#E6B458",
    glow: "rgba(247, 221, 161, 0.62)"
  },
  {
    id: "midnight",
    number: "10",
    label: "Midnight",
    description: "Depth • Mystery • Focus",
    rim: "#2C3A5A",
    rimLight: "#3D4D77",
    rimDark: "#1E2A44",
    progress: "#6B7FB2",
    text: "#526694",
    glow: "rgba(107, 127, 178, 0.62)"
  },
  {
    id: "blossom",
    number: "11",
    label: "Blossom",
    description: "Softness • Growth • Renewal",
    rim: "#B9788A",
    rimLight: "#C994A4",
    rimDark: "#8A5A6A",
    progress: "#E8CAD4",
    text: "#C994A4",
    glow: "rgba(232, 202, 212, 0.62)"
  },
  {
    id: "aurora",
    number: "12",
    label: "Aurora",
    description: "Wonder • Inspiration • Dream",
    rim: "#6D5BA6",
    rimLight: "#8A78C5",
    rimDark: "#4B3B6E",
    progress: "#C0B7E8",
    text: "#8A78C5",
    glow: "rgba(192, 183, 232, 0.62)"
  }
];

export const DEFAULT_JOURNEY_COLOR_SCHEME_ID: JourneyColorSchemeId = "forest";

export function getJourneyColorScheme(id?: string | null) {
  return JOURNEY_COLOR_SCHEMES.find((scheme) => scheme.id === id) ?? JOURNEY_COLOR_SCHEMES[0];
}
