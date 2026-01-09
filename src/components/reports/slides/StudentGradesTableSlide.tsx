/**
 * StudentGradesTableSlide - Tabela de Notas do Aluno
 * Exibe tabela detalhada de notas por disciplina.
 * Usa inline styles para compatibilidade com exportação PDF.
 */

import { useMemo } from 'react';
import { Student, Grade } from '@/types';
import { SlideLayout } from './SlideLayout';
import { REPORT_COLORS, STATUS_COLORS, getGradeColor } from '@/lib/reportDesignSystem';

interface StudentGradesTableSlideProps {
  student: Student;
  grades: Grade[];
  period: string;
}

export const StudentGradesTableSlide = ({ student, grades, period }: StudentGradesTableSlideProps) => {
  const { sortedSubjects, overallAverage, approvedCount, recoveryCount } = useMemo(() => {
    const filteredGrades = period === 'all'
      ? grades
      : grades.filter(g => g.quarter === period);

    const studentGrades = filteredGrades.filter(g => g.studentId === student.id);

    // Group grades by subject
    const gradesBySubject = studentGrades.reduce((acc, grade) => {
      if (!acc[grade.subject]) acc[grade.subject] = [];
      acc[grade.subject].push(grade);
      return acc;
    }, {} as Record<string, Grade[]>);

    // Sort subjects by average (lowest to highest)
    const sorted = Object.entries(gradesBySubject)
      .map(([subject, subjectGrades]) => ({
        subject,
        grades: subjectGrades,
        average: subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length
      }))
      .sort((a, b) => a.average - b.average);

    const overall = sorted.length > 0
      ? sorted.reduce((sum, s) => sum + s.average, 0) / sorted.length
      : 0;

    return {
      sortedSubjects: sorted,
      overallAverage: overall,
      approvedCount: sorted.filter(s => s.average >= 6).length,
      recoveryCount: sorted.filter(s => s.average < 6).length,
    };
  }, [grades, period, student.id]);

  const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const quarters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

  const GradeBadge = ({ value }: { value: number }) => {
    const color = getGradeColor(value);
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: 6,
        background: `${color}15`,
        color: color,
        fontWeight: 600,
        fontSize: 13,
      }}>
        {value.toFixed(1)}
      </span>
    );
  };

  const StatusBadge = ({ approved }: { approved: boolean }) => {
    const colors = approved ? STATUS_COLORS.approved : STATUS_COLORS.critical;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: 6,
        background: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: 12,
      }}>
        {approved ? 'Aprovado' : 'Recuperação'}
      </span>
    );
  };

  return (
    <SlideLayout
      title="Boletim Detalhado por Disciplina"
      subtitle={`${period === 'all' ? 'Todas as Notas' : period} • Ordenado do pior para o melhor`}
      footer="MAVIC - Sistema de Acompanhamento Escolar"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header with Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.name}
              style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: `${REPORT_COLORS.primary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: REPORT_COLORS.primary,
            }}>
              {initials}
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontSize: 14, color: REPORT_COLORS.text.secondary }}>
              Matrícula: {student.enrollment || 'Não informada'}
            </p>
          </div>
        </div>

        {/* Table */}
        <div style={{
          flex: 1,
          background: REPORT_COLORS.background.card,
          borderRadius: 12,
          border: `1px solid ${REPORT_COLORS.border}`,
          overflowY: 'auto',
          maxHeight: '520px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: REPORT_COLORS.background.surface }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: REPORT_COLORS.text.secondary, width: 50 }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: REPORT_COLORS.text.secondary }}>Disciplina</th>
                {period === 'all' && quarters.map(q => (
                  <th key={q} style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: REPORT_COLORS.text.secondary, width: 80 }}>
                    {q.replace(' Bimestre', '')}
                  </th>
                ))}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: REPORT_COLORS.text.secondary, width: 90 }}>Média</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: REPORT_COLORS.text.secondary, width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.map((item, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: `1px solid ${REPORT_COLORS.border}`,
                    background: index % 2 === 0 ? 'transparent' : REPORT_COLORS.background.surface,
                  }}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13, color: REPORT_COLORS.text.tertiary }}>{index + 1}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: REPORT_COLORS.text.primary }}>{item.subject}</td>
                  {period === 'all' && quarters.map(quarter => {
                    const quarterGrade = item.grades.find(g => g.quarter === quarter);
                    return (
                      <td key={quarter} style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {quarterGrade ? (
                          <GradeBadge value={quarterGrade.grade} />
                        ) : (
                          <span style={{ color: REPORT_COLORS.text.tertiary }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <GradeBadge value={item.average} />
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <StatusBadge approved={item.average >= 6} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginTop: 24,
          padding: 20,
          background: REPORT_COLORS.background.surface,
          borderRadius: 12,
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary }}>Total Disciplinas</p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: REPORT_COLORS.text.primary }}>{sortedSubjects.length}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary }}>Aprovado</p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: STATUS_COLORS.approved.solid }}>{approvedCount}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary }}>Recuperação</p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: STATUS_COLORS.critical.solid }}>{recoveryCount}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: REPORT_COLORS.text.secondary }}>Média Geral</p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: REPORT_COLORS.text.primary }}>{overallAverage.toFixed(1)}</p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};
