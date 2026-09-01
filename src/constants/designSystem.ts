export const DESIGN_TOKENS = {
  colors: {
    background: "#F5F5F5",
    surface: "#FFFFFF",
    surfaceMuted: "#E9E9E7",
    foreground: "#1D1D1F",
    secondaryText: "#6E6E73",
    muted: "#929292",
    border: "#D7D7D4",
    darkCanvas: "#171717",
  },
  spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  radius: { sm: 4, md: 6, lg: 8, xl: 10 },
  motion: { fast: 140, normal: 240, slow: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
} as const
