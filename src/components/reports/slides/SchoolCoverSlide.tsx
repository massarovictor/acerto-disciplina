/**
 * SchoolCoverSlide - Cover slide for school-wide reports
 * Shows school name, period, and generation date
 */

import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { School } from 'lucide-react';

interface SchoolCoverSlideProps {
    schoolName: string;
    period: string;
    totalClasses: number;
    totalStudents: number;
}

export const SchoolCoverSlide = ({ schoolName, period, totalClasses, totalStudents }: SchoolCoverSlideProps) => {
    return (
        <SlideLayout variant="cover">
            {/* Icon */}
            <div
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 40px',
                }}
            >
                <School size={64} color={REPORT_COLORS.text.inverted} />
            </div>

            {/* School Name */}
            <h1
                style={{
                    fontSize: 72,
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    textAlign: 'center',
                }}
            >
                {schoolName}
            </h1>

            {/* Stats */}
            <p
                style={{
                    fontSize: 28,
                    margin: '24px 0 0',
                    opacity: 0.9,
                    fontWeight: 500,
                    textAlign: 'center',
                }}
            >
                {totalClasses} Turmas • {totalStudents} Alunos
            </p>

            {/* Divider */}
            <div
                style={{
                    width: 120,
                    height: 6,
                    background: REPORT_COLORS.primary,
                    borderRadius: 3,
                    margin: '48px auto',
                }}
            />

            {/* Period */}
            <div style={{ textAlign: 'center' }}>
                <p
                    style={{
                        fontSize: 24,
                        fontWeight: 600,
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                    }}
                >
                    Relatório Institucional
                </p>
                <p
                    style={{
                        fontSize: 28,
                        margin: '12px 0 0',
                        opacity: 0.8,
                    }}
                >
                    {period === 'all' ? 'Ano Letivo Completo' : period} • {new Date().getFullYear()}
                </p>
            </div>

            {/* Footer Date */}
            <p
                style={{
                    position: 'absolute',
                    bottom: 24,
                    fontSize: 12,
                    opacity: 0.5,
                }}
            >
                Gerado em {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
        </SlideLayout>
    );
};
