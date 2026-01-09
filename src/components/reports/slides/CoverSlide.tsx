/**
 * CoverSlide 2.0 - Design Premium
 * Capa moderna com gradiente, grafismos e tipografia de impacto.
 */

import { Class } from '@/types';
import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { GraduationCap } from 'lucide-react';

interface CoverSlideProps {
  classData: Class;
  period: string;
}

export const CoverSlide = ({ classData, period }: CoverSlideProps) => {
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
        <GraduationCap size={64} color={REPORT_COLORS.text.inverted} />
      </div>

      {/* Class Name */}
      <h1
        style={{
          fontSize: 84,
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          textAlign: 'center',
        }}
      >
        {classData.name}
      </h1>

      {/* Course & Series */}
      <p
        style={{
          fontSize: 32,
          margin: '24px 0 0',
          opacity: 0.9,
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {classData.course} • {classData.series}
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
          Relatório de Desempenho
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
