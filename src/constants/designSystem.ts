export const DESIGN_TOKENS = {
  colors: {
    background: "#F7F7F3",
    surface: "#F1F2ED",
    surfaceMuted: "#ECEDE8",
    foreground: "#1E211F",
    secondaryText: "#737A74",
    muted: "#949A94",
    sage: "#73866F",
    sageSoft: "#DDE5DA",
    border: "#DADDD6",
    darkAccent: "#252A26",
  },
  spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  radius: { sm: 6, md: 10, lg: 16, xl: 20 },
  motion: { fast: 140, normal: 240, slow: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
} as const
