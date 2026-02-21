import { PDF_COLORS } from "./pdfGenerator";

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const resolveReportAccentColor = (themeColor?: string): string => {
  const trimmed = (themeColor || "").trim();
  if (!trimmed) return PDF_COLORS.primary;
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : PDF_COLORS.primary;
};
