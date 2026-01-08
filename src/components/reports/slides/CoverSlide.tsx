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
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <GraduationCap size={48} color={REPORT_COLORS.text.inverted} />
      </div>

      {/* Class Name */}
      <h1
        style={{
          fontSize: 72,
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {classData.name}
      </h1>

      {/* Course & Series */}
      <p
        style={{
          fontSize: 24,
          margin: '16px 0 0',
          opacity: 0.9,
          fontWeight: 500,
        }}
      >
        {classData.course} • {classData.series}
      </p>

      {/* Divider */}
      <div
        style={{
          width: 96,
          height: 5,
          background: REPORT_COLORS.primary,
          borderRadius: 2,
          margin: '32px 0',
        }}
      />

      {/* Period */}
      <div>
        <p
          style={{
          fontSize: 18,
            fontWeight: 600,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Relatório de Desempenho
        </p>
        <p
          style={{
          fontSize: 22,
            margin: '8px 0 0',
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
