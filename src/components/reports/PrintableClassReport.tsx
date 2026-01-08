import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AttendanceRecord, Class, Grade, Incident, Student } from '@/types';

interface PrintableClassReportProps {
  classData: Class;
  students: Student[];
  grades: Grade[];
  incidents: Incident[];
  attendance: AttendanceRecord[];
  subjects?: string[];
}

const calculateAverage = (values: number[]) => {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const PrintableClassReport = ({
  classData,
  students,
  grades,
  incidents,
  attendance: _attendance,
  subjects,
}: PrintableClassReportProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const subjectList = useMemo(() => {
    if (subjects && subjects.length > 0) return [...subjects].sort();
    return [...new Set(grades.map((grade) => grade.subject))].sort();
  }, [grades, subjects]);

  const gradeMap = useMemo(() => {
    const map = new Map<string, Map<string, number[]>>();
    grades.forEach((grade) => {
      const studentMap = map.get(grade.studentId) || new Map();
      const subjectGrades = studentMap.get(grade.subject) || [];
      subjectGrades.push(grade.grade);
      studentMap.set(grade.subject, subjectGrades);
      map.set(grade.studentId, studentMap);
    });
    return map;
  }, [grades]);

  const attentionSubjects = useMemo(() => {
    return subjectList.filter((subject) => {
      const values = grades.filter((grade) => grade.subject === subject).map((grade) => grade.grade);
      const average = calculateAverage(values);
      return average !== null && average < 6;
    });
  }, [grades, subjectList]);

  const handleDownload = async () => {
    if (!containerRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(containerRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'pt', 'a4');
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

      pdf.save(`boletim-${classData.name}.pdf`);
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

      <div ref={containerRef} className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm">
        <div className="rounded-t-xl bg-slate-900 px-10 py-10 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Instituição de Ensino</p>
          <h1 className="mt-2 text-3xl font-semibold">Boletim da Turma</h1>
          <p className="text-slate-300">{classData.name} • Ano letivo {new Date().getFullYear()}</p>
        </div>

        <div className="space-y-8 px-8 py-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Resumo</h2>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Disciplinas em atenção</p>
              <p>{attentionSubjects.length > 0 ? attentionSubjects.join(', ') : 'Nenhuma'}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-800">Ocorrências</p>
                  <p>{incidents.length} registro(s)</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Total de alunos</p>
                  <p>{students.length} aluno(s)</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Notas do Ano</h2>
            {students.length === 0 || subjectList.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma nota registrada no período.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Aluno</th>
                      {subjectList.map((subject) => (
                        <th key={subject} className="px-3 py-2">
                          {subject}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...students]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((student, index) => {
                        const studentGrades = gradeMap.get(student.id) || new Map();
                        return (
                          <tr
                            key={student.id}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className="px-3 py-2 font-medium text-slate-800">{student.name}</td>
                            {subjectList.map((subject) => {
                              const values = studentGrades.get(subject) || [];
                              const average = calculateAverage(values);
                              return (
                                <td key={`${student.id}-${subject}`} className="px-3 py-2">
                                  {average === null ? '-' : average.toFixed(1)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
