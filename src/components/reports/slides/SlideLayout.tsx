/**
 * SlideLayout - Container padronizado para todos os slides
 * Garante consistência visual e estrutura comum.
 */

import React from 'react';
import { REPORT_COLORS, REPORT_GRADIENTS } from '@/lib/reportDesignSystem';

type SlideVariant = 'cover' | 'content' | 'chart' | 'table';

interface SlideLayoutProps {
    children: React.ReactNode;
    variant?: SlideVariant;
    title?: string;
    subtitle?: string;
    footer?: string;
    className?: string;
}

export const SlideLayout: React.FC<SlideLayoutProps> = ({
    children,
    variant = 'content',
    title,
    subtitle,
    footer,
    className = '',
}) => {
    const isCover = variant === 'cover';

    const baseStyles: React.CSSProperties = {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
    };

    const coverStyles: React.CSSProperties = {
        ...baseStyles,
        background: REPORT_GRADIENTS.dark,
        color: REPORT_COLORS.text.inverted,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: 48,
    };

    const contentStyles: React.CSSProperties = {
        ...baseStyles,
        background: REPORT_COLORS.background.surface,
        color: REPORT_COLORS.text.primary,
        padding: 40,
    };

    return (
        <div style={isCover ? coverStyles : contentStyles} className={className}>
            {/* Decorative Element for Cover */}
            {isCover && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            top: -100,
                            right: -100,
                            width: 300,
                            height: 300,
                            borderRadius: '50%',
                            background: REPORT_COLORS.primary,
                            opacity: 0.1,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -50,
                            left: -50,
                            width: 200,
                            height: 200,
                            borderRadius: '50%',
                            background: REPORT_COLORS.primaryLight,
                            opacity: 0.08,
                        }}
                    />
                </>
            )}

            {/* Header for Content Slides */}
            {!isCover && (title || subtitle) && (
                <div style={{ marginBottom: 28 }}>
                    {title && (
                        <h1
                            style={{
                                fontSize: 32,
                                fontWeight: 700,
                                margin: 0,
                                color: REPORT_COLORS.text.primary,
                                lineHeight: 1.2,
                            }}
                        >
                            {title}
                        </h1>
                    )}
                    {subtitle && (
                        <p
                            style={{
                                fontSize: 16,
                                margin: '8px 0 0',
                                color: REPORT_COLORS.text.secondary,
                            }}
                        >
                            {subtitle}
                        </p>
                    )}
                    <div
                        style={{
                            width: 72,
                            height: 4,
                            background: REPORT_COLORS.primary,
                            borderRadius: 2,
                            marginTop: 16,
                        }}
                    />
                </div>
            )}

            {/* Main Content */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 1 }}>{children}</div>

            {/* Footer */}
            {footer && (
                <div
                    style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: `1px solid ${REPORT_COLORS.border}`,
                        fontSize: 11,
                        color: REPORT_COLORS.text.tertiary,
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <span>{footer}</span>
                    <span>{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
            )}
        </div>
    );
};
