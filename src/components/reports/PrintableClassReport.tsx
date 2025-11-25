import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AttendanceRecord, Class, Grade, Incident, Student } from '@/types';
import { SUBJECT_AREAS } from '@/lib/subjects';
import { calculateSummaryStatistics } from '@/lib/advancedCalculations';

interface PrintableClassReportProps {
  classData: Class;
  students: Student[];
  grades: Grade[];
  incidents: Incident[];
  attendance: AttendanceRecord[];
}

interface StudentMetric {
  student: Student;
  average: number;
  recoverySubjects: { subject: string; grade: number }[];
  incidentsCount: number;
  absences: number;
  presenceRate: number;
  photo?: string;
}

const getStatusStyles = (metric: StudentMetric) => {
  const recovery = metric.recoverySubjects.length;
  if (recovery === 0) {
    return {
      label: 'Aprovado em todas',
      badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    };
  }
  if (recovery <= 2) {
    return {
      label: 'Recuperação pontual',
      badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
  }
  return {
    label: 'Risco alto',
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
  };
};

const createAvatar = (name: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#dbeafe';
  ctx.beginPath();
  ctx.arc(60, 60, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 42px Helvetica';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  ctx.fillText(initials, 60, 66);
  return canvas.toDataURL('image/png');
};

export const PrintableClassReport = ({
  classData,
  students,
  grades,
  incidents,
  attendance,
}: PrintableClassReportProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const metrics = useMemo(() => {
    return students.map((student) => {
      const studentGrades = grades.filter((g) => g.studentId === student.id);
      const subjects = [...new Set(studentGrades.map((g) => g.subject))];
      const subjectAverages = subjects.map((subject) => {
        const subjectGrades = studentGrades.filter((g) => g.subject === subject);
        const average = subjectGrades.length
          ? subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length
          : 0;
        return { subject, average };
      });

      const average =
        subjectAverages.length > 0
          ? subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length
          : 0;

      const recoverySubjects = subjectAverages
        .filter((s) => s.average < 6)
        .map((s) => ({ subject: s.subject, grade: s.average }));

      const incidentsCount = incidents.filter((i) => i.studentIds.includes(student.id)).length;
      const attendanceRecords = attendance.filter((a) => a.studentId === student.id);
      const absences = attendanceRecords.filter((a) => a.status !== 'presente').length;
      const presenceRate = attendanceRecords.length
        ? ((attendanceRecords.length - absences) / attendanceRecords.length) * 100
        : 100;

      return {
        student,
        average,
        recoverySubjects,
        incidentsCount,
        absences,
        presenceRate,
        photo: student.photoUrl || createAvatar(student.name),
      } as StudentMetric;
    });
  }, [students, grades, incidents, attendance]);

  const gradeRanking = useMemo(
    () => [...metrics].sort((a, b) => b.average - a.average),
    [metrics]
  );
  const frequencyRanking = useMemo(
    () => [...metrics].sort((a, b) => b.presenceRate - a.presenceRate),
    [metrics]
  );

  const gradeRankMap = useMemo(() => {
    const map = new Map<string, number>();
    gradeRanking.forEach((metric, index) => map.set(metric.student.id, index + 1));
    return map;
  }, [gradeRanking]);

  const frequencyRankMap = useMemo(() => {
    const map = new Map<string, number>();
    frequencyRanking.forEach((metric, index) => map.set(metric.student.id, index + 1));
    return map;
  }, [frequencyRanking]);

  const summary = useMemo(() => {
    const average =
      grades.length > 0 ? grades.reduce((sum, g) => sum + g.grade, 0) / grades.length : 0;
    const approvalRate =
      grades.length > 0 ? (grades.filter((g) => g.grade >= 6).length / grades.length) * 100 : 0;
    const frequency =
      metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.presenceRate, 0) / metrics.length : 0;
    return {
      average,
      approvalRate,
      frequency,
    };
  }, [grades, metrics]);

  const topIncidents = useMemo(
    () =>
      [...metrics]
        .filter((m) => m.incidentsCount > 0)
        .sort((a, b) => b.incidentsCount - a.incidentsCount)
        .slice(0, 5),
    [metrics]
  );

  const topAbsences = useMemo(
    () =>
      [...metrics]
        .sort((a, b) => b.absences - a.absences)
        .slice(0, 5),
    [metrics]
  );

  const areaSummaries = useMemo(() => {
    return SUBJECT_AREAS.map((area) => {
      const areaGrades = grades.filter((g) => area.subjects.includes(g.subject));
      if (!areaGrades.length) return null;
      const stats = calculateSummaryStatistics(areaGrades.map((g) => g.grade));
      const disciplineStats = area.subjects.map((subject) => {
        const subjectGrades = areaGrades.filter((g) => g.subject === subject);
        if (!subjectGrades.length) return null;
        const avg = subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length;
        return { subject, average: avg };
      });
      return {
        area: area.name,
        stats,
        disciplineStats: disciplineStats.filter(Boolean) as { subject: string; average: number }[],
      };
    }).filter(Boolean) as {
      area: string;
      stats: ReturnType<typeof calculateSummaryStatistics>;
      disciplineStats: { subject: string; average: number }[];
    }[];
  }, [grades]);

  const handleDownload = async () => {
    if (!containerRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(containerRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`relatorio-${classData.name}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <button
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={handleDownload}
          disabled={isGenerating}
        >
          {isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm print:border-0"
      >
        <div className="rounded-t-xl bg-slate-900 px-10 py-12 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Relatório Acadêmico</p>
          <h1 className="mt-2 text-3xl font-semibold">{classData.name}</h1>
          <p className="text-slate-300">Ano letivo {new Date().getFullYear()}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-200">Total de alunos</p>
              <p className="text-2xl font-semibold">{students.length}</p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-200">Média geral</p>
              <p className="text-2xl font-semibold">{summary.average.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-200">Aprovação</p>
              <p className="text-2xl font-semibold">{summary.approvalRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-10 px-8 py-10">
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Alunos da turma</h2>
              <p className="text-sm text-slate-500">
                Ordenados alfabeticamente com status, ranking e disciplinas em recuperação.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[...metrics]
                .sort((a, b) => a.student.name.localeCompare(b.student.name))
                .map((metric) => {
                  const styles = getStatusStyles(metric);
                  const recoveryText = metric.recoverySubjects.length
                    ? metric.recoverySubjects
                        .map((item) => `${item.subject} (${item.grade.toFixed(1)})`)
                        .join(', ')
                    : 'Sem disciplinas em recuperação';
                  const rank = gradeRankMap.get(metric.student.id) || 0;
                  const freqRank = frequencyRankMap.get(metric.student.id) || 0;

                  return (
                    <div
                      key={metric.student.id}
                      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-100 bg-slate-50">
                        {metric.photo && (
                          <img
                            src={metric.photo}
                            alt={metric.student.name}
                            className="h-16 w-16 object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{metric.student.name}</p>
                            <p className="text-sm text-slate-500">
                              Média {metric.average.toFixed(1)} • Faltas {metric.absences} • Presença{' '}
                              {metric.presenceRate.toFixed(1)}%
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles.badge}`}>
                            {styles.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Ranking notas: #{rank}</span>
                          <span>Ranking frequência: #{freqRank}</span>
                          <span>Ocorrências: {metric.incidentsCount}</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p className="font-medium text-slate-700">Disciplinas em atenção</p>
                          <p>{recoveryText}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Top ocorrências</h3>
              <p className="text-sm text-slate-500">
                Estudantes com maior número de registros disciplinar.
              </p>
              <div className="mt-4 space-y-3">
                {topIncidents.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum registro de ocorrência.</p>
                ) : (
                  topIncidents.map((metric, index) => (
                    <div
                      key={`${metric.student.id}-incident`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          #{index + 1} • {metric.student.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {metric.incidentsCount} ocorrência(s) registradas
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Maior incidência de faltas</h3>
              <p className="text-sm text-slate-500">
                Ranking dos estudantes com mais ausências no período.
              </p>
              <div className="mt-4 space-y-3">
                {topAbsences.map((metric, index) => (
                  <div
                    key={`${metric.student.id}-attendance`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-amber-50 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        #{index + 1} • {metric.student.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {metric.absences} falta(s) • {metric.presenceRate.toFixed(1)}% de presença
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Áreas do conhecimento</h3>
              <p className="text-sm text-slate-500">
                Médias por disciplina e destaques de cada área curricular.
              </p>
            </div>
            <div className="space-y-4">
              {areaSummaries.map((area) => (
                <div key={area.area} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{area.area}</h4>
                      <p className="text-sm text-slate-500">
                        Média {area.stats.mean.toFixed(1)} • Mediana {area.stats.median.toFixed(1)} •
                        Desvio {area.stats.stdDev.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {area.disciplineStats.map((discipline) => (
                      <div key={discipline.subject}>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{discipline.subject}</span>
                          <span className="font-semibold text-slate-900">
                            {discipline.average.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-700"
                            style={{ width: `${(discipline.average / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

