/**
 * Sistema de Design Unificado para Relatórios
 * Paleta de cores, tipografia e espaçamentos padronizados
 * para PDFs, Slides e componentes visuais.
 */
import { chartPalette, scales, semanticPalette } from '@/theme/palette';

// ================ COLOR PALETTE ================

export const REPORT_COLORS = {
    // Primary Brand
    primary: semanticPalette.primary.hex,
    primaryDark: scales.brand[700],
    primaryLight: scales.brand[400],

    // Semantic Colors
    success: scales.success[600],
    successLight: scales.success[500],
    warning: scales.warning[600],
    warningLight: scales.warning[500],
    danger: scales.danger[600],
    dangerLight: scales.danger[500],

    // Neutral Palette
    text: {
        primary: scales.neutral[900],
        secondary: scales.neutral[700],
        tertiary: scales.neutral[500],
        inverted: '#FFFFFF',
    },

    background: {
        page: semanticPalette.background.hex,
        surface: scales.neutral[100],
        card: semanticPalette.card.hex,
        header: scales.brand[900],
        muted: scales.neutral[200],
    },

    border: semanticPalette.border.hex,

    // Chart-specific Palette (accessible, distinct)
    chart: [
        chartPalette[1].hex,
        chartPalette[2].hex,
        chartPalette[3].hex,
        chartPalette[4].hex,
        chartPalette[5].hex,
        scales.success[500],
        scales.warning[500],
        scales.brand[300],
    ],
};

// ================ TYPOGRAPHY ================

export const REPORT_FONTS = {
    family: {
        sans: 'Inter, system-ui, -apple-system, sans-serif',
        mono: 'JetBrains Mono, Menlo, monospace',
    },
    size: {
        '2xl': 28,
        xl: 24,
        lg: 18,
        md: 14,
        sm: 12,
        xs: 10,
        '2xs': 8,
    },
    weight: {
        bold: 700,
        semibold: 600,
        medium: 500,
        normal: 400,
    },
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// ================ SPACING ================

export const REPORT_SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
};

// ================ SHADOWS ================

export const REPORT_SHADOWS = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};

// ================ BORDER RADIUS ================

export const REPORT_RADIUS = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
};

// ================ GRADIENTS ================

export const REPORT_GRADIENTS = {
    primary: `linear-gradient(135deg, ${scales.brand[500]} 0%, ${scales.brand[700]} 100%)`,
    success: `linear-gradient(135deg, ${scales.success[600]} 0%, ${scales.success[800]} 100%)`,
    danger: `linear-gradient(135deg, ${scales.danger[600]} 0%, ${scales.danger[800]} 100%)`,
    dark: `linear-gradient(135deg, ${scales.brand[900]} 0%, ${scales.brand[700]} 100%)`,
    surface: `linear-gradient(180deg, ${scales.neutral[100]} 0%, ${scales.neutral[200]} 100%)`,
};

// ================ CHART CONFIG ================

export const CHART_CONFIG = {
    // Default chart dimensions
    defaultWidth: 400,
    defaultHeight: 250,

    // Axis styling
    axis: {
        stroke: REPORT_COLORS.border,
        tickColor: REPORT_COLORS.text.tertiary,
        fontSize: 11,
    },

    // Grid styling
    grid: {
        stroke: REPORT_COLORS.border,
        strokeDasharray: '3 3',
    },

    // Tooltip styling
    tooltip: {
        backgroundColor: REPORT_COLORS.background.card,
        borderColor: REPORT_COLORS.border,
        borderRadius: REPORT_RADIUS.md,
        boxShadow: REPORT_SHADOWS.lg,
    },

    // Legend styling
    legend: {
        fontSize: 12,
        iconSize: 12,
    },

    // Animation
    animationDuration: 800,
    animationEasing: 'ease-out',
};

// ================ SEMANTIC STATUS COLORS ================

export const STATUS_COLORS = {
    excellence: {
        bg: scales.accent[100],
        text: scales.brand[800],
        border: scales.accent[300],
        solid: scales.brand[500],
    },
    approved: {
        bg: scales.success[100],
        text: scales.success[800],
        border: scales.success[300],
        solid: scales.success[500],
    },
    attention: {
        bg: scales.warning[100],
        text: scales.warning[800],
        border: scales.warning[300],
        solid: scales.warning[500],
    },
    critical: {
        bg: scales.danger[100],
        text: scales.danger[800],
        border: scales.danger[300],
        solid: scales.danger[500],
    },
    neutral: {
        bg: scales.neutral[100],
        text: scales.neutral[700],
        border: scales.neutral[300],
        solid: scales.neutral[500],
    },
};

// ================ STUDENT CLASSIFICATION ================

export type StudentClassification = 'excellence' | 'approved' | 'attention' | 'critical';

/**
 * Classifica um aluno com base na média geral e quantidade de disciplinas abaixo de 6.
 * Regras (iguais a advancedAnalytics.ts):
 * - Crítico (critical): 3+ disciplinas com média < 6.0
 * - Atenção (attention): 1-2 disciplinas com média < 6.0
 * - Aprovado (approved): Todas disciplinas >= 6.0, média geral < 8.0
 * - Excelência (excellence): Todas disciplinas >= 6.0 E média geral >= 8.0
 */
export function classifyStudent(overallAvg: number, redGradesCount: number): StudentClassification {
    if (redGradesCount >= 3) return 'critical';
    if (redGradesCount >= 1) return 'attention';
    if (overallAvg >= 8.0) return 'excellence';
    return 'approved';
}

/**
 * Retorna as cores de status baseado na classificação.
 */
export function getStatusColor(classification: StudentClassification) {
    return STATUS_COLORS[classification];
}

// ================ HELPERS ================

/**
 * Retorna a cor do gráfico para um índice.
 */
export function getChartColor(index: number): string {
    return REPORT_COLORS.chart[index % REPORT_COLORS.chart.length];
}

/**
 * Retorna cor baseada no valor (para notas).
 */
export function getGradeColor(grade: number): string {
    if (grade >= 7) return REPORT_COLORS.success;
    if (grade >= 6) return REPORT_COLORS.warning;
    return REPORT_COLORS.danger;
}
