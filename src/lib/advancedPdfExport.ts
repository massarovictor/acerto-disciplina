// Advanced PDF Export Functions
// Specialized PDF generation with detailed analysis

import jsPDF from 'jspdf';
import { Grade, Student, Incident, Class, AttendanceRecord } from '@/types';
import { SUBJECT_AREAS } from './subjects';
import { calculateSummaryStatistics } from './advancedCalculations';
import { analyzeStudentPerformance } from './performancePrediction';
import { QUARTERS } from './subjects';
import { generateBarChartImage, generateLineChartImage } from './pdfChartGenerator';

/**
 * Configuração padrão de PDF
 */
const PDF_CONFIG = {
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  lineHeight: 7,
  fontSize: {
    title: 20,
    subtitle: 16,
    heading: 14,
    body: 10,
    small: 8,
  },
};

/**
 * Adiciona cabeçalho padrão
 */
function addHeader(pdf: jsPDF, title: string, page: number) {
  pdf.setFontSize(PDF_CONFIG.fontSize.small);
  pdf.setTextColor(100);
  pdf.text(title, PDF_CONFIG.margins.left, 10);
  pdf.text(`Página ${page}`, pdf.internal.pageSize.width - PDF_CONFIG.margins.right, 10, { align: 'right' });
}

/**
 * Adiciona rodapé padrão
 */
function addFooter(pdf: jsPDF) {
  const pageHeight = pdf.internal.pageSize.height;
  pdf.setFontSize(PDF_CONFIG.fontSize.small);
  pdf.setTextColor(100);
  pdf.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    pdf.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}

/**
 * Verifica se precisa de nova página
 */
function checkNewPage(pdf: jsPDF, yPosition: number, requiredSpace: number = 30): number {
  const pageHeight = pdf.internal.pageSize.height;
  if (yPosition + requiredSpace > pageHeight - PDF_CONFIG.margins.bottom - 20) {
    pdf.addPage();
    return PDF_CONFIG.margins.top + 15;
  }
  return yPosition;
}

/**
 * Gera PDF com análise detalhada de uma área do conhecimento
 */
export function generateAreaAnalysisPDF(
  areaName: string,
  grades: Grade[],
  classData: Class,
  students: Student[]
): jsPDF {
  const pdf = new jsPDF();
  let yPos = PDF_CONFIG.margins.top;
  let pageCount = 1;

  // Capa
  pdf.setFontSize(PDF_CONFIG.fontSize.title);
  pdf.setTextColor(0);
  pdf.text(`Análise Detalhada: ${areaName}`, pdf.internal.pageSize.width / 2, yPos + 40, { align: 'center' });
  
  pdf.setFontSize(PDF_CONFIG.fontSize.subtitle);
  pdf.text(classData.name, pdf.internal.pageSize.width / 2, yPos + 55, { align: 'center' });
  
  pdf.setFontSize(PDF_CONFIG.fontSize.body);
  pdf.text(`Ano Letivo ${new Date().getFullYear()}`, pdf.internal.pageSize.width / 2, yPos + 70, { align: 'center' });

  addFooter(pdf);

  // Página 2: Análise Estatística
  pdf.addPage();
  pageCount++;
  yPos = PDF_CONFIG.margins.top + 15;
  addHeader(pdf, `${classData.name} - ${areaName}`, pageCount);

  const area = SUBJECT_AREAS.find(a => a.name === areaName);
  if (!area) return pdf;

  const areaGrades = grades.filter(g => area.subjects.includes(g.subject));
  const areaValues = areaGrades.map(g => g.grade);
  const stats = calculateSummaryStatistics(areaValues);

  pdf.setFontSize(PDF_CONFIG.fontSize.heading);
  pdf.text('Estatísticas Gerais da Área', PDF_CONFIG.margins.left, yPos);
  yPos += 10;

  pdf.setFontSize(PDF_CONFIG.fontSize.body);
  pdf.text(`Média Geral: ${stats.mean.toFixed(2)}`, PDF_CONFIG.margins.left, yPos);
  yPos += PDF_CONFIG.lineHeight;
  pdf.text(`Mediana: ${stats.median.toFixed(2)}`, PDF_CONFIG.margins.left, yPos);
  yPos += PDF_CONFIG.lineHeight;
  pdf.text(`Desvio Padrão: ${stats.stdDev.toFixed(2)}`, PDF_CONFIG.margins.left, yPos);
  yPos += PDF_CONFIG.lineHeight;
  pdf.text(`Nota Mínima: ${stats.min.toFixed(1)} | Nota Máxima: ${stats.max.toFixed(1)}`, PDF_CONFIG.margins.left, yPos);
  yPos += 15;

  // Análise por disciplina
  pdf.setFontSize(PDF_CONFIG.fontSize.heading);
  pdf.text('Desempenho por Disciplina', PDF_CONFIG.margins.left, yPos);
  yPos += 10;

  area.subjects.forEach(subject => {
    yPos = checkNewPage(pdf, yPos, 15);
    
    const subjectGrades = areaGrades.filter(g => g.subject === subject);
    if (subjectGrades.length === 0) return;

    const values = subjectGrades.map(g => g.grade);
    const subjectStats = calculateSummaryStatistics(values);
    const approvalRate = ((values.filter(v => v >= 6).length / values.length) * 100).toFixed(0);

    pdf.setFontSize(PDF_CONFIG.fontSize.body);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${subject}:`, PDF_CONFIG.margins.left, yPos);
    pdf.setFont(undefined, 'normal');
    pdf.text(
      `Média ${subjectStats.mean.toFixed(1)} | Aprovação ${approvalRate}% | DP ${subjectStats.stdDev.toFixed(2)}`,
      PDF_CONFIG.margins.left + 60,
      yPos
    );
    yPos += PDF_CONFIG.lineHeight;
  });

  addFooter(pdf);

  return pdf;
}

/**
 * Gera PDF completo com predições e análises de risco
 */
export function generateCompletePredictionReport(
  grades: Grade[],
  students: Student[],
  classData: Class
): jsPDF {
  const pdf = new jsPDF();
  let yPos = PDF_CONFIG.margins.top;
  let pageCount = 1;

  // Capa
  pdf.setFontSize(PDF_CONFIG.fontSize.title);
  pdf.text('Relatório de Predição e Análise de Risco', pdf.internal.pageSize.width / 2, yPos + 40, { align: 'center' });
  
  pdf.setFontSize(PDF_CONFIG.fontSize.subtitle);
  pdf.text(classData.name, pdf.internal.pageSize.width / 2, yPos + 55, { align: 'center' });

  addFooter(pdf);

  // Análise por aluno
  const currentQuarter = QUARTERS.find(q => grades.some(g => g.quarter === q)) || QUARTERS[0];

  students.forEach((student, index) => {
    if (index > 0 || index === 0) {
      pdf.addPage();
      pageCount++;
      yPos = PDF_CONFIG.margins.top + 15;
      addHeader(pdf, `${classData.name} - Análise de Risco`, pageCount);
    }

    const studentGrades = grades.filter(g => g.studentId === student.id);
    const analysis = analyzeStudentPerformance(studentGrades, currentQuarter);

    pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    pdf.text(`Aluno: ${student.name}`, PDF_CONFIG.margins.left, yPos);
    yPos += 10;

    pdf.setFontSize(PDF_CONFIG.fontSize.body);
    pdf.text(`Risco de Reprovação: ${analysis.risk.toFixed(0)}%`, PDF_CONFIG.margins.left, yPos);
    yPos += PDF_CONFIG.lineHeight;
    pdf.text(`Tendência: ${analysis.trend.trend}`, PDF_CONFIG.margins.left, yPos);
    yPos += PDF_CONFIG.lineHeight;
    pdf.text(`Predição de Nota Final: ${analysis.prediction.predicted.toFixed(1)}`, PDF_CONFIG.margins.left, yPos);
    yPos += PDF_CONFIG.lineHeight;
    pdf.text(`Potencial de Recuperação: ${analysis.recovery.potential}`, PDF_CONFIG.margins.left, yPos);
    yPos += 10;

    // Ações recomendadas
    pdf.setFontSize(PDF_CONFIG.fontSize.body);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Prioridade de Intervenção: ${analysis.intervention.priority}`, PDF_CONFIG.margins.left, yPos);
    pdf.setFont(undefined, 'normal');
    yPos += PDF_CONFIG.lineHeight + 2;

    analysis.intervention.actions.forEach(action => {
      yPos = checkNewPage(pdf, yPos, 10);
      pdf.text(`• ${action}`, PDF_CONFIG.margins.left + 5, yPos);
      yPos += PDF_CONFIG.lineHeight;
    });

    addFooter(pdf);
  });

  return pdf;
}

/**
 * Gera relatório acadêmico completo com todas as análises
 */
export async function generateCompleteAcademicReport(
  grades: Grade[],
  students: Student[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  classData: Class,
  professionalSubjects: string[]
): Promise<jsPDF> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let yPos = margin;

  const ensureSpace = (needed = 32) => {
    if (yPos + needed > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      renderPageHeader();
    }
  };

  const renderDivider = () => {
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
  };

  const renderPageHeader = () => {
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Sistema Disciplina • ${classData.name} • Ano ${new Date().getFullYear()}`, margin, yPos);
    yPos += 6;
    renderDivider();
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 28 : 20);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);
    pdf.text(title, margin, yPos);
    yPos += 8;
    if (subtitle) {
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(subtitle, margin, yPos);
      yPos += 6;
    }
    renderDivider();
  };

  const drawBadge = (label: string, value: string, index: number) => {
    const badgeWidth = (pageWidth - margin * 2 - 10) / 3;
    const x = margin + index * (badgeWidth + 5);
    const y = 72;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, badgeWidth, 26, 3, 3, 'F');
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(17, 24, 39);
    pdf.text(value, x + 4, y + 15);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(label.toUpperCase(), x + 4, y + 22);
  };

  const createAvatar = (student: Student) => {
    if (student.photoUrl?.startsWith('data:')) {
      return student.photoUrl;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#e0e7ff';
    ctx.beginPath();
    ctx.arc(60, 60, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#312e81';
    ctx.font = 'bold 44px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = student.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    ctx.fillText(initials, 60, 64);
    return canvas.toDataURL('image/png');
  };

  const studentMetrics = await Promise.all(
    students.map(async (student) => {
      const studentGrades = grades.filter((g) => g.studentId === student.id);
      const subjects = [...new Set(studentGrades.map((g) => g.subject))];
      const subjectAverages = subjects.map((subject) => {
        const gradesBySubject = studentGrades.filter((g) => g.subject === subject);
        const average = gradesBySubject.length
          ? gradesBySubject.reduce((sum, g) => sum + g.grade, 0) / gradesBySubject.length
          : 0;
        return { subject, average };
      });

      const overallAverage = subjectAverages.length
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
        average: overallAverage,
        recoverySubjects,
        incidentsCount,
        absences,
        presenceRate,
        photo: createAvatar(student),
      };
    })
  );

  const classAverage = grades.length
    ? grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
    : 0;
  const approvalRate = grades.length
    ? (grades.filter((g) => g.grade >= 6).length / grades.length) * 100
    : 0;
  const frequencyAverage = studentMetrics.length
    ? studentMetrics.reduce((sum, m) => sum + m.presenceRate, 0) / studentMetrics.length
    : 100;

  const gradeRanking = [...studentMetrics].sort((a, b) => b.average - a.average);
  const gradeRankMap = new Map(gradeRanking.map((metric, index) => [metric.student.id, index + 1]));
  const frequencyRanking = [...studentMetrics].sort((a, b) => b.presenceRate - a.presenceRate);
  const freqRankMap = new Map(
    frequencyRanking.map((metric, index) => [metric.student.id, index + 1])
  );

  const getStatusInfo = (metric: (typeof studentMetrics)[number]) => {
    const recoveryCount = metric.recoverySubjects.length;
    if (recoveryCount === 0) {
      return { label: 'Aprovado em todas', color: { r: 34, g: 197, b: 94 } };
    }
    if (recoveryCount <= 2) {
      return { label: 'Em recuperação', color: { r: 245, g: 158, b: 11 } };
    }
    return { label: 'Risco alto', color: { r: 239, g: 68, b: 68 } };
  };

  const drawStudentCard = (metric: (typeof studentMetrics)[number]) => {
    const recoveryText = metric.recoverySubjects.length
      ? metric.recoverySubjects
          .map((item) => `${item.subject} (${item.grade.toFixed(1)})`)
          .join(', ')
      : 'Sem disciplinas em recuperação';
    const wrappedRecovery = pdf.splitTextToSize(recoveryText, pageWidth - margin * 2 - 32);
    const cardHeight = 34 + wrappedRecovery.length * 5;
    ensureSpace(cardHeight + 6);

    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, yPos, pageWidth - margin * 2, cardHeight, 4, 4, 'F');

    if (metric.photo) {
      pdf.addImage(metric.photo, 'PNG', margin + 6, yPos + 6, 18, 18, undefined, 'FAST');
    }

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(metric.student.name, margin + 30, yPos + 10);

    const status = getStatusInfo(metric);
    pdf.setFillColor(status.color.r, status.color.g, status.color.b);
    pdf.roundedRect(margin + 30, yPos + 14, 60, 8, 2, 2, 'F');
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(status.label, margin + 34, yPos + 19);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    const gradeRank = gradeRankMap.get(metric.student.id) || 0;
    const freqRank = freqRankMap.get(metric.student.id) || 0;
    pdf.text(
      `Ranking notas: #${gradeRank}/${students.length} • Frequência: #${freqRank}/${students.length}`,
      margin + 30,
      yPos + 27
    );

    pdf.setFontSize(8.5);
    pdf.text('Disciplinas em atenção:', margin + 30, yPos + 36);
    pdf.setFont('Helvetica', 'normal');
    wrappedRecovery.forEach((line, idx) => {
      pdf.text(line, margin + 30, yPos + 42 + idx * 5);
    });

    yPos += cardHeight + 8;
  };

  // Capa
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, pageHeight - 90, pageWidth, 90, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.text('Relatório Acadêmico Completo', margin, 42);
  pdf.setFontSize(18);
  pdf.text(classData.name, margin, 62);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text(`Ano letivo ${new Date().getFullYear()}`, margin, 78);
  drawBadge('Total de alunos', `${students.length}`, 0);
  drawBadge('Média geral', classAverage.toFixed(1), 1);
  drawBadge('Taxa de aprovação', `${approvalRate.toFixed(0)}%`, 2);

  pdf.addPage();
  yPos = margin;
  renderPageHeader();

  sectionTitle('Resumo geral');
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(55, 65, 81);
  pdf.text(
    `Total de alunos: ${students.length} • Média geral: ${classAverage.toFixed(1)} • Ocorrências registradas: ${incidents.length}`,
    margin,
    yPos
  );
  yPos += 6;
  pdf.text(
    `Taxa de aprovação: ${approvalRate.toFixed(0)}% • Frequência média: ${frequencyAverage.toFixed(1)}%`,
    margin,
    yPos
  );
  yPos += 10;

  sectionTitle('Alunos da turma', 'Ordenados alfabeticamente com status, rankings e recuperação');
  [...studentMetrics]
    .sort((a, b) => a.student.name.localeCompare(b.student.name))
    .forEach((metric) => drawStudentCard(metric));

  const topOccurrences = gradeRanking
    .filter((metric) => metric.incidentsCount > 0)
    .slice(0, 5)
    .map(
      (metric) => `${metric.student.name} — ${metric.incidentsCount} ocorrência(s) registradas`
    );

  const worstAttendance = [...studentMetrics]
    .sort((a, b) => b.absences - a.absences)
    .slice(0, 5)
    .map(
      (metric) => `${metric.student.name} — ${metric.absences} falta(s) (${metric.presenceRate.toFixed(1)}% presença)`
    );

  sectionTitle('Ocorrências e frequência', 'Principais destaques comportamentais e de presença');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Top ocorrências', margin, yPos);
  yPos += 6;
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  if (topOccurrences.length === 0) {
    pdf.text('Nenhum registro de ocorrência.', margin, yPos);
    yPos += 8;
  } else {
    topOccurrences.forEach((line) => {
      ensureSpace(8);
      pdf.text(`• ${line}`, margin, yPos);
      yPos += 6;
    });
  }
  yPos += 4;
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Maiores índices de faltas', margin, yPos);
  yPos += 6;
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  worstAttendance.forEach((line) => {
    ensureSpace(8);
    pdf.text(`• ${line}`, margin, yPos);
    yPos += 6;
  });

  sectionTitle('Desempenho por área do conhecimento');
  SUBJECT_AREAS.forEach((area) => {
    const areaGrades = grades.filter((g) => area.subjects.includes(g.subject));
    if (!areaGrades.length) return;
    const stats = calculateSummaryStatistics(areaGrades.map((g) => g.grade));
    const subjectPerformance = area.subjects
      .map((subject) => {
        const subjectGrades = areaGrades.filter((g) => g.subject === subject);
        if (!subjectGrades.length) return null;
        const avg = subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length;
        return { subject, avg };
      })
      .filter(Boolean) as { subject: string; avg: number }[];
    const best = subjectPerformance.sort((a, b) => b.avg - a.avg)[0];
    const worst = subjectPerformance.sort((a, b) => a.avg - b.avg)[0];

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    ensureSpace(20);
    pdf.text(area.name, margin, yPos);
    yPos += 6;
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `Média ${stats.mean.toFixed(1)} • Mediana ${stats.median.toFixed(1)} • Desvio ${stats.stdDev.toFixed(2)} • Min ${stats.min.toFixed(1)} • Max ${stats.max.toFixed(1)}`,
      margin,
      yPos
    );
    yPos += 6;
    if (best || worst) {
      const highlightText = [
        best ? `Destaque: ${best.subject} (${best.avg.toFixed(1)})` : null,
        worst ? `Desafio: ${worst.subject} (${worst.avg.toFixed(1)})` : null,
      ]
        .filter(Boolean)
        .join(' • ');
      pdf.text(highlightText, margin, yPos);
      yPos += 6;
    }

    const chartData = subjectPerformance.map((item) => ({
      label: item.subject,
      value: parseFloat(item.avg.toFixed(1)),
    }));
    if (chartData.length) {
      const chart = generateBarChartImage(chartData, {
        width: 600,
        height: 260,
        title: `Médias por disciplina - ${area.name}`,
      });
      if (chart) {
        const chartHeight = 60;
        ensureSpace(chartHeight + 6);
        pdf.addImage(chart, 'PNG', margin, yPos, pageWidth - margin * 2, chartHeight);
        yPos += chartHeight + 8;
      }
    }
  });

  sectionTitle('Recomendações');
  const recommendations = [
    'Agendar reuniões personalizadas com os alunos em risco vermelho.',
    'Oferecer plantões e tutoria para as disciplinas com mais alunos em recuperação.',
    'Reconhecer publicamente os estudantes verde para manter o engajamento.',
    'Monitorar frequência semanalmente e contatar responsáveis após 5 faltas.'
  ];
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  recommendations.forEach((rec) => {
    ensureSpace(8);
    pdf.text(`• ${rec}`, margin, yPos);
    yPos += 6;
  });

  addFooter(pdf);
  return pdf;
}


/**
 * Adiciona seção de análise de área no PDF
 */
export function addAreaAnalysisSection(
  pdf: jsPDF,
  areaName: string,
  grades: Grade[],
  yStart: number
): number {
  let yPos = checkNewPage(pdf, yStart, 80);

  const area = SUBJECT_AREAS.find(a => a.name === areaName);
  if (!area) return yPos;

  const areaGrades = grades.filter(g => area.subjects.includes(g.subject));
  if (areaGrades.length === 0) return yPos;

  const areaValues = areaGrades.map(g => g.grade);
  const stats = calculateSummaryStatistics(areaValues);

  // Título da área
  pdf.setFontSize(PDF_CONFIG.fontSize.subtitle);
  pdf.setFont(undefined, 'bold');
  pdf.text(areaName, PDF_CONFIG.margins.left, yPos);
  yPos += 10;

  // Estatísticas
  pdf.setFontSize(PDF_CONFIG.fontSize.body);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Média: ${stats.mean.toFixed(2)} | Mediana: ${stats.median.toFixed(2)} | Desvio Padrão: ${stats.stdDev.toFixed(2)}`, PDF_CONFIG.margins.left, yPos);
  yPos += PDF_CONFIG.lineHeight;
  pdf.text(`Min: ${stats.min.toFixed(1)} | Max: ${stats.max.toFixed(1)} | Q1: ${stats.q1.toFixed(1)} | Q3: ${stats.q3.toFixed(1)}`, PDF_CONFIG.margins.left, yPos);
  yPos += 12;

  // Gráfico de barras
  const subjectData = area.subjects.map(subject => {
    const subjectGrades = areaGrades.filter(g => g.subject === subject);
    const values = subjectGrades.map(g => g.grade);
    return {
      label: subject,
      value: values.length > 0 ? calculateSummaryStatistics(values).mean : 0,
    };
  }).filter(s => s.value > 0);

  if (subjectData.length > 0) {
    const chartImage = generateBarChartImage(subjectData, {
      width: 500,
      height: 200,
      title: `Desempenho por Disciplina - ${areaName}`,
    });
    
    if (chartImage) {
      yPos = checkNewPage(pdf, yPos, 80);
      pdf.addImage(chartImage, 'PNG', PDF_CONFIG.margins.left, yPos, 170, 60);
      yPos += 65;
    }
  }

  // Tendência por bimestre
  const trendData = QUARTERS.map(quarter => {
    const quarterGrades = areaGrades.filter(g => g.quarter === quarter);
    return {
      label: quarter.substring(0, 2),
      value: quarterGrades.length > 0
        ? quarterGrades.reduce((sum, g) => sum + g.grade, 0) / quarterGrades.length
        : 0,
    };
  }).filter(d => d.value > 0);

  if (trendData.length >= 2) {
    const chartImage = generateLineChartImage(trendData, {
      width: 500,
      height: 200,
      title: 'Evolução por Bimestre',
    });
    
    if (chartImage) {
      yPos = checkNewPage(pdf, yPos, 80);
      pdf.addImage(chartImage, 'PNG', PDF_CONFIG.margins.left, yPos, 170, 60);
      yPos += 70;
    }
  }

  return yPos;
}



