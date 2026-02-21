/**
 * ClassOverviewSlide 2.0 - Visual Dashboard
 * Slide principal com KPIs e gráfico de distribuição.
 */

import { useMemo } from 'react';
import { Class, Student, Grade, Incident } from '@/types';
import { SlideLayout } from './SlideLayout';
import { ReportDonutChart } from '@/lib/reportCharts';
import { REPORT_COLORS, STATUS_COLORS, classifyStudent } from '@/lib/reportDesignSystem';
import { Users, TrendingUp, AlertTriangle, Award, type LucideIcon } from 'lucide-react';

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

    // 1. Calcular estatísticas individuais de cada aluno primeiro
    const studentStats = students.map((student) => {
      const studentGrades = filteredGrades.filter((g) => g.studentId === student.id);

      if (studentGrades.length === 0) {
        return {
          student,
          recoveryCount: 0,
          overallAvg: 0,
          hasGrades: false,
          classification: null as 'excellence' | 'approved' | 'attention' | 'critical' | null,
        };
      }

      const subjects = [...new Set(studentGrades.map((g) => g.subject))];
      const avgBySubject = subjects.map((sub) => {
        const subGrades = studentGrades.filter((g) => g.subject === sub);
        return subGrades.length
          ? subGrades.reduce((s, g) => s + g.grade, 0) / subGrades.length
          : 0;
      });

      const overallAvg = avgBySubject.length > 0
        ? avgBySubject.reduce((sum, avg) => sum + avg, 0) / avgBySubject.length
        : 0;

      const recoveryCount = avgBySubject.filter((a) => a < 6).length;
      const classification = classifyStudent(overallAvg, recoveryCount);
      return { student, recoveryCount, overallAvg, hasGrades: true, classification };
    });

    const activeStudents = studentStats.filter((student) => student.hasGrades);
    const classifiedStudents = activeStudents.filter(
      (student): student is typeof student & {
        classification: 'excellence' | 'approved' | 'attention' | 'critical';
      } => student.classification !== null,
    );

    const excellence = classifiedStudents.filter((student) => student.classification === 'excellence').length;
    const approved = classifiedStudents.filter((student) => student.classification === 'approved').length;
    const attention = classifiedStudents.filter((student) => student.classification === 'attention').length;
    const critical = classifiedStudents.filter((student) => student.classification === 'critical').length;

    // 3. Média Geral da Turma (Média das médias dos alunos)
    const classAverage = activeStudents.length > 0
      ? activeStudents.reduce((sum, s) => sum + s.overallAvg, 0) / activeStudents.length
      : 0;

    // 4. Taxa de aprovação entre alunos com notas no período.
    const approvalRate = activeStudents.length > 0
      ? ((excellence + approved) / activeStudents.length) * 100
      : 0;

    const criticalIncidents = incidents.filter(
      (i) => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
    ).length;

    return {
      average: classAverage,
      approvalRate,
      excellence,
      approved,
      attention,
      critical,
      criticalIncidents,
      totalGrades,
      studentsWithGrades: activeStudents.length,
    };
  }, [grades, students, incidents, period]);

  const pieData = [
    { name: 'Excelência', value: metrics.excellence, color: STATUS_COLORS.excellence.solid },
    { name: 'Aprovado', value: metrics.approved, color: STATUS_COLORS.approved.solid },
    { name: 'Atenção', value: metrics.attention, color: STATUS_COLORS.attention.solid },
    { name: 'Crítico', value: metrics.critical, color: STATUS_COLORS.critical.solid },
  ];

  // Filtrar categorias zeradas para visualização mais limpa no gráfico
  const activePieData = pieData.filter(d => d.value > 0);
  const hasStatusData = metrics.studentsWithGrades > 0;

  const KPICard = ({
    icon: Icon,
    label,
    value,
    color,
    suffix = '',
    subtext = ''
  }: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color: string;
    suffix?: string;
    subtext?: string;
  }) => (
    <div
      style={{
        background: REPORT_COLORS.background.card,
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        boxShadow: REPORT_COLORS.background.muted === '#F1F5F9' ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
        border: `1px solid ${REPORT_COLORS.border}`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={32} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: REPORT_COLORS.text.secondary, margin: '0 0 4px 0' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <p style={{ fontSize: 40, fontWeight: 700, color: REPORT_COLORS.text.primary, margin: 0, lineHeight: 1 }}>
            {value}
            {suffix && <span style={{ fontSize: 24, fontWeight: 500, marginLeft: 2 }}>{suffix}</span>}
          </p>
        </div>
        {subtext && <p style={{ fontSize: 12, color: REPORT_COLORS.text.tertiary, margin: '4px 0 0' }}>{subtext}</p>}
      </div>
    </div>
  );

  return (
    <SlideLayout
      title={`${classData.name} — Visão Geral da Turma`}
      subtitle={`${period === 'all' ? 'Ano Letivo Completo' : period} • ${students.length} Alunos Matriculados`}
      footer="MAVIC - Sistema de Acompanhamento Escolar"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 2.2fr', gap: 32, height: '100%' }}>
        {/* Left Column: KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <KPICard
              icon={Users}
              label="Total de Alunos"
              value={students.length}
              color={REPORT_COLORS.primary}
              subtext="Matriculados"
            />
            <KPICard
              icon={TrendingUp}
              label="Média da Turma"
              value={metrics.average.toFixed(1)}
              color={metrics.average >= 6 ? REPORT_COLORS.success : REPORT_COLORS.warning}
              subtext="Média global"
            />
          </div>

          <KPICard
            icon={Award}
            label="Taxa de Aprovação"
            value={metrics.approvalRate.toFixed(1)}
            suffix="%"
            color={metrics.approvalRate >= 70 ? REPORT_COLORS.success : REPORT_COLORS.danger}
            subtext="Aprovados + Excelência"
          />

          <KPICard
            icon={AlertTriangle}
            label="Acompanhamentos Críticos"
            value={metrics.criticalIncidents}
            color={REPORT_COLORS.danger}
            subtext="Graves registrados"
          />
        </div>

        {/* Right Column: Chart */}
        <div
          style={{
            background: REPORT_COLORS.background.card,
            borderRadius: 24,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${REPORT_COLORS.border}`,
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 32, left: 32 }}>
            <h3
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: REPORT_COLORS.text.primary,
                margin: 0,
              }}
            >
              Status Acadêmico
            </h3>
          </div>

          <div style={{ marginTop: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {hasStatusData ? (
              <>
                <div style={{
                  width: 650,
                  height: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 300,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.02)'
                }}>
                  {activePieData.length > 0 ? (
                    <ReportDonutChart
                      data={activePieData}
                      width={600}
                      height={500}
                      innerRadius={130}
                      outerRadius={240}
                      showLegend={false}
                      animate={false}
                    />
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <p style={{ fontSize: 20, color: REPORT_COLORS.text.secondary }}>Sem dados de status</p>
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 16,
                  width: '100%',
                  padding: '0 32px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: STATUS_COLORS.critical.solid }} />
                    <div style={{ fontSize: 14, color: REPORT_COLORS.text.secondary }}>
                      <span style={{ fontWeight: 700, color: REPORT_COLORS.text.primary }}>Crítico</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: STATUS_COLORS.attention.solid }} />
                    <div style={{ fontSize: 14, color: REPORT_COLORS.text.secondary }}>
                      <span style={{ fontWeight: 700, color: REPORT_COLORS.text.primary }}>Atenção</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: STATUS_COLORS.approved.solid }} />
                    <div style={{ fontSize: 14, color: REPORT_COLORS.text.secondary }}>
                      <span style={{ fontWeight: 700, color: REPORT_COLORS.text.primary }}>Aprovado</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: STATUS_COLORS.excellence.solid }} />
                    <div style={{ fontSize: 14, color: REPORT_COLORS.text.secondary }}>
                      <span style={{ fontWeight: 700, color: REPORT_COLORS.text.primary }}>Excelência</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.5, textAlign: 'center', fontSize: 20 }}>Sem dados suficientes para exibir o gráfico</div>
            )}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};
