/**
 * Sistema de Design Unificado para Relatórios
 * Paleta de cores, tipografia e espaçamentos padronizados
 * para PDFs, Slides e componentes visuais.
 */

// ================ COLOR PALETTE ================

export const REPORT_COLORS = {
    // Primary Brand
    primary: '#2563EB',       // Blue 600
    primaryDark: '#1D4ED8',   // Blue 700
    primaryLight: '#3B82F6',  // Blue 500

    // Semantic Colors
    success: '#059669',       // Emerald 600
    successLight: '#10B981',  // Emerald 500
    warning: '#D97706',       // Amber 600
    warningLight: '#F59E0B',  // Amber 500
    danger: '#DC2626',        // Red 600
    dangerLight: '#EF4444',   // Red 500

    // Neutral Palette
    text: {
        primary: '#0F172A',     // Slate 900
        secondary: '#475569',   // Slate 600
        tertiary: '#94A3B8',    // Slate 400
        inverted: '#FFFFFF',
    },

    background: {
        page: '#FFFFFF',
        surface: '#F8FAFC',     // Slate 50
        card: '#FFFFFF',
        header: '#0F172A',      // Slate 900 (dark headers)
        muted: '#F1F5F9',       // Slate 100
    },

    border: '#E2E8F0',        // Slate 200

    // Chart-specific Palette (accessible, distinct)
    chart: [
        '#3B82F6', // Blue
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#8B5CF6', // Violet
        '#EC4899', // Pink
        '#14B8A6', // Teal
        '#F97316', // Orange
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
    primary: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    success: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    danger: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    dark: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    surface: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
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
    approved: {
        bg: '#D1FAE5',      // Emerald 100
        text: '#065F46',    // Emerald 800
        border: '#6EE7B7',  // Emerald 300
    },
    recovery: {
        bg: '#FEF3C7',      // Amber 100
        text: '#92400E',    // Amber 800
        border: '#FCD34D',  // Amber 300
    },
    risk: {
        bg: '#FEE2E2',      // Red 100
        text: '#991B1B',    // Red 800
        border: '#FCA5A5',  // Red 300
    },
    neutral: {
        bg: '#F1F5F9',      // Slate 100
        text: '#475569',    // Slate 600
        border: '#CBD5E1',  // Slate 300
    },
};

// ================ HELPERS ================

/**
 * Retorna a cor de status baseada na quantidade de disciplinas em recuperação.
 */
export function getStatusColor(recoveryCount: number) {
    if (recoveryCount === 0) return STATUS_COLORS.approved;
    if (recoveryCount <= 2) return STATUS_COLORS.recovery;
    return STATUS_COLORS.risk;
}

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
