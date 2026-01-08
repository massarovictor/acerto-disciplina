/**
 * ClassOverviewSlide 2.0 - Visual Dashboard
 * Slide principal com KPIs e gráfico de distribuição.
 */

import { useMemo } from 'react';
import { Class, Student, Grade, Incident } from '@/types';
import { SlideLayout } from './SlideLayout';
import { ReportDonutChart } from '@/lib/reportCharts';
import { REPORT_COLORS } from '@/lib/reportDesignSystem';
import { Users, TrendingUp, AlertTriangle, Award } from 'lucide-react';

interface ClassOverviewSlideProps {
  classData: Class;
  students: Student[];
  grades: Grade[];
  incidents: Incident[];
  period: string;
}

export const ClassOverviewSlide = ({
  classData,
  students,
  grades,
  incidents,
  period,
}: ClassOverviewSlideProps) => {
  const metrics = useMemo(() => {
    const filteredGrades = period === 'all' ? grades : grades.filter((g) => g.quarter === period);

    const totalGrades = filteredGrades.length;
    const average =
      filteredGrades.length > 0
        ? filteredGrades.reduce((sum, g) => sum + g.grade, 0) / filteredGrades.length
        : 0;

    const approvalRate =
      filteredGrades.length > 0
        ? (filteredGrades.filter((g) => g.grade >= 6).length / filteredGrades.length) * 100
        : 0;

    // Count students by status
    const studentStats = students.map((student) => {
      const studentGrades = filteredGrades.filter((g) => g.studentId === student.id);
      const subjects = [...new Set(studentGrades.map((g) => g.subject))];
      const avgBySubject = subjects.map((sub) => {
        const subGrades = studentGrades.filter((g) => g.subject === sub);
        return subGrades.length
          ? subGrades.reduce((s, g) => s + g.grade, 0) / subGrades.length
          : 0;
      });
      const recoveryCount = avgBySubject.filter((a) => a < 6).length;
      return { student, recoveryCount };
    });

    const approved = studentStats.filter((s) => s.recoveryCount === 0).length;
    const recovery = studentStats.filter((s) => s.recoveryCount > 0 && s.recoveryCount <= 2).length;
    const risk = studentStats.filter((s) => s.recoveryCount > 2).length;

    const criticalIncidents = incidents.filter(
      (i) => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
    ).length;

    return { average, approvalRate, approved, recovery, risk, criticalIncidents, totalGrades };
  }, [grades, students, incidents, period]);

  const pieData = [
    { name: 'Aprovados', value: metrics.approved, color: REPORT_COLORS.success },
    { name: 'Recuperação', value: metrics.recovery, color: REPORT_COLORS.warning },
    { name: 'Risco', value: metrics.risk, color: REPORT_COLORS.danger },
  ];
  const hasStatusData = metrics.totalGrades > 0;

  const KPICard = ({
    icon: Icon,
    label,
    value,
    color,
    suffix = '',
  }: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    suffix?: string;
  }) => (
    <div
      style={{
        background: REPORT_COLORS.background.card,
        borderRadius: 12,
        padding: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: `1px solid ${REPORT_COLORS.border}`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 14, color: REPORT_COLORS.text.secondary, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 36, fontWeight: 700, color: REPORT_COLORS.text.primary, margin: 0 }}>
          {value}
          {suffix && <span style={{ fontSize: 22, fontWeight: 500 }}>{suffix}</span>}
        </p>
      </div>
    </div>
  );

  return (
    <SlideLayout
      title={`${classData.name} — Visão Geral`}
      subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • ${new Date().getFullYear()}`}
      footer="MAVIC - Sistema de Acompanhamento Escolar"
    >
      <div style={{ display: 'flex', gap: 32, height: '100%' }}>
        {/* Left Column: KPIs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <KPICard
            icon={Users}
            label="Total de Alunos"
            value={students.length}
            color={REPORT_COLORS.primary}
          />
          <KPICard
            icon={TrendingUp}
            label="Média Geral"
            value={metrics.average.toFixed(1)}
            color={metrics.average >= 6 ? REPORT_COLORS.success : REPORT_COLORS.danger}
          />
          <KPICard
            icon={Award}
            label="Taxa de Aprovação"
            value={metrics.approvalRate.toFixed(0)}
            suffix="%"
            color={REPORT_COLORS.success}
          />
          <KPICard
            icon={AlertTriangle}
            label="Ocorrências Críticas"
            value={metrics.criticalIncidents}
            color={REPORT_COLORS.danger}
          />
        </div>

        {/* Right Column: Chart */}
        <div
          style={{
            flex: 1,
            background: REPORT_COLORS.background.card,
            borderRadius: 12,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: `1px solid ${REPORT_COLORS.border}`,
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: REPORT_COLORS.text.primary,
              margin: '0 0 16px',
            }}
          >
            Distribuição de Status
          </h3>
          {hasStatusData ? (
            <>
              <ReportDonutChart data={pieData} height={360} showLegend />
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 13,
                  color: REPORT_COLORS.text.secondary,
                  textAlign: 'center',
                }}
              >
                Aprovados: sem disciplinas abaixo de 6. Recuperação: 1 a 2 disciplinas abaixo de 6.
                Risco: mais de 2 disciplinas abaixo de 6.
              </p>
            </>
          ) : (
            <div
              style={{
                height: 360,
                width: '100%',
                border: `1px dashed ${REPORT_COLORS.border}`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: REPORT_COLORS.text.tertiary,
                fontSize: 14,
                textAlign: 'center',
                padding: 16,
              }}
            >
              Sem dados de notas para o período selecionado.
            </div>
          )}
        </div>
      </div>
    </SlideLayout>
  );
};
