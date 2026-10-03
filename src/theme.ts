// Dark gaming theme for BacklogDeck.
// Keys follow design_guidelines.json structure.
// Use colors from here, do not inline hex values in screens.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  // Surfaces
  surface: "#07050D", // deepest canvas
  onSurface: "#F3F0FF",
  surfaceSecondary: "#120E1F", // elevated panel
  onSurfaceSecondary: "#E5E0F5",
  surfaceTertiary: "#1C1630", // cards
  onSurfaceTertiary: "#C8C2E0",
  surfaceElevated: "#241B3B", // chip, modal
  onSurfaceElevated: "#F3F0FF",
  surfaceInverse: "#F3F0FF",
  onSurfaceInverse: "#07050D",
  muted: "#8B82A8",

  // Brand - vibrant purple with neon accents
  brand: "#A855F7",
  onBrand: "#FFFFFF",
  brandPrimary: "#A855F7",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#C084FC",
  onBrandSecondary: "#120E1F",
  brandTertiary: "#581C87",
  onBrandTertiary: "#F3F0FF",

  // Accent colors for status / categories
  neonCyan: "#22D3EE",
  neonPink: "#EC4899",
  neonLime: "#A3E635",
  neonAmber: "#FBBF24",

  // Status
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#1A1206",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  // Lines
  border: "#2A1F4D",
  borderStrong: "#4C2E8C",
  divider: "#1C1630",

  // Status badge pairs (for library statuses)
  statusBacklog: "#A855F7",
  statusPlaying: "#F59E0B",
  statusCompleted: "#10B981",
  statusDropped: "#EF4444",
};

const light = dark; // Dark-only app

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark: ThemeColors } = {
  light,
  dark,
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme =
    system === "light" || system === "dark" ? system : defaultScheme;
  return { scheme, colors: themes[scheme] };
}

export function makeStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};
