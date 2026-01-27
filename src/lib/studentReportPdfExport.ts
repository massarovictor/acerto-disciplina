/**
 * Relatório Individual do Aluno - Versão com pdfmake
 * 
 * Estrutura:
 * 1. Informações do Estudante + Métricas (Média, Frequência, Ocorrências)
 * 2. Quadro de Aproveitamento
 * 3. Resumo Textual (análise qualitativa)
 * 4. Seção Comportamental
 */

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

import { Student, Class, Grade, Incident, AttendanceRecord } from '@/types';
import { getSchoolConfig, getDefaultConfig, SchoolConfig } from './schoolConfig';
import { PDF_COLORS, PDF_STYLES, getPdfMake } from './pdfGenerator';
import {
  classifyStudent,
  SubjectGradeInfo,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS
} from './advancedAnalytics';
import { QUARTERS } from './subjects';
import { analyzeTrend } from './mlAnalytics';



// ============================================
// CLASSE PRINCIPAL
// ============================================

class StudentReportPDFGenerator {
  private config: SchoolConfig;
  private student: Student | null = null;
  private studentClass: Class | undefined;
  private grades: Grade[] = [];
  private incidents: Incident[] = [];
  private attendance: AttendanceRecord[] = [];

  constructor() {
    this.config = getDefaultConfig();
  }

  async generate(
    student: Student,
    studentClass: Class | undefined,
    grades: Grade[],
    incidents: Incident[],
    attendance: AttendanceRecord[], // DISABLED: Kept for API compatibility, not used
    subjects?: string[]
  ): Promise<void> {
    try {
      this.config = await getSchoolConfig();
      this.student = student;
      this.studentClass = studentClass;
      this.grades = grades.filter(g => g.studentId === student.id);
      this.incidents = incidents.filter(i => i.studentIds.includes(student.id));
      // DISABLED: Attendance feature temporarily removed
      this.attendance = []; // Empty array instead of filtering attendance

      // Construir documento
      const content = this.buildDocumentContent(subjects);
      const docDefinition = this.createDocDefinition(content);

      // Download
      const safeName = (student.name || 'Aluno').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `Relatorio_${safeName}.pdf`;

      const pdfMake = await getPdfMake();
      pdfMake.createPdf(docDefinition).download(filename);

    } catch (error) {
      console.error('Erro ao gerar relatório individual (PDF generation failed)');
      throw error;
    }
  }

  // ============================================
  // CÁLCULOS
  // ============================================

  private calculateAverage(): number {
    if (this.grades.length === 0) return 0;
    return this.grades.reduce((sum, g) => sum + g.grade, 0) / this.grades.length;
  }

  private calculateFrequency(): number {
    if (this.attendance.length === 0) return 100;
    const present = this.attendance.filter(a => a.status === 'presente').length;
    return (present / this.attendance.length) * 100;
  }

  private getSubjectAverages(): Record<string, number> {
    const subjectGrades: Record<string, number[]> = {};
    this.grades.forEach(g => {
      if (!subjectGrades[g.subject]) subjectGrades[g.subject] = [];
      subjectGrades[g.subject].push(g.grade);
    });

    const averages: Record<string, number> = {};
    Object.entries(subjectGrades).forEach(([subject, gradeList]) => {
      averages[subject] = gradeList.reduce((a, b) => a + b, 0) / gradeList.length;
    });

    return averages;
  }

  // ============================================
  // GERAÇÃO DE NARRATIVA
  // ============================================

  private generateNarrative(): string {
    if (!this.student) return '';

    const classification = classifyStudent(this.grades, this.attendance);
    const subjectAverages = this.getSubjectAverages();
    const average = this.calculateAverage();
    const frequency = this.calculateFrequency();
    const incidentCount = this.incidents.length;

    if (Object.keys(subjectAverages).length === 0) {
      return 'Sem dados suficientes para análise acadêmica neste período. Aguardar lançamento de notas para avaliações mais precisas.';
    }

    // Calcular tendência
    const quarterAverages = QUARTERS.map(quarter => {
      const qGrades = this.grades.filter(g => g.quarter === quarter);
      return qGrades.length > 0 ? qGrades.reduce((s, g) => s + g.grade, 0) / qGrades.length : 0;
    }).filter(v => v > 0);

    const trend = analyzeTrend(quarterAverages);

    // Identificar pontos fortes e fracos
    const sortedSubjects = Object.entries(subjectAverages).sort((a, b) => b[1] - a[1]);
    const strengths = sortedSubjects.filter(([_, avg]) => avg >= 7).slice(0, 5).map(([s]) => s);
    const weaknesses = sortedSubjects.filter(([_, avg]) => avg < 6).map(([s]) => s);

    const parts: string[] = [];

    // 1. SITUAÇÃO ATUAL
    const classLabel = CLASSIFICATION_LABELS[classification.classification];
    if (classification.classification === 'critico') {
      parts.push(`Situação crítica: ${classification.subjectsBelow6Count} disciplina(s) abaixo da média mínima.`);
    } else if (classification.classification === 'atencao') {
      parts.push(`Situação de atenção: ${classification.subjectsBelow6Count} disciplina(s) em recuperação.`);
    } else if (classification.classification === 'excelencia') {
      parts.push(`Situação de excelência: aprovado em todas as disciplinas com média geral superior a 8,0.`);
    } else {
      parts.push(`Situação regular: aprovado em todas as disciplinas.`);
    }

    // 2. DISCIPLINAS EM DIFICULDADE
    if (classification.subjectsBelow6.length > 0) {
      const disciplinasFormatadas = classification.subjectsBelow6
        .map(s => `${s.subject} (${s.average.toFixed(1)})`)
        .join(', ');
      parts.push(`Disciplinas abaixo de 6,0: ${disciplinasFormatadas}.`);
    }

    // 3. PONTOS FORTES
    if (strengths.length > 0) {
      const fortesFormatados = strengths
        .map(s => `${s} (${subjectAverages[s].toFixed(1)})`)
        .join(', ');
      parts.push(`Pontos fortes: ${fortesFormatados}.`);
    }

    // 4. TENDÊNCIA
    if (trend.direction === 'crescente' && trend.confidence > 30) {
      parts.push(`Tendência: melhora progressiva ao longo dos bimestres (confiança ${trend.confidence.toFixed(0)}%).`);
    } else if (trend.direction === 'decrescente' && trend.confidence > 30) {
      parts.push(`Tendência: queda de desempenho ao longo dos bimestres (confiança ${trend.confidence.toFixed(0)}%).`);
    } else if (trend.direction === 'estavel') {
      parts.push(`Tendência: desempenho estável ao longo dos bimestres.`);
    }

    // 5. COMPORTAMENTO
    if (incidentCount > 0) {
      const graveCount = this.incidents.filter(i =>
        i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima'
      ).length;

      if (graveCount > 0) {
        parts.push(`Comportamento: ${incidentCount} ocorrência(s) registrada(s), sendo ${graveCount} grave(s) ou gravíssima(s), o que pode estar impactando o desempenho acadêmico.`);
      } else {
        parts.push(`Comportamento: ${incidentCount} ocorrência(s) registrada(s), requerendo atenção.`);
      }
    } else {
      parts.push(`Comportamento: sem ocorrências disciplinares registradas.`);
    }

    // 6. PREDIÇÃO
    if (trend.prediction > 0 && trend.confidence > 20) {
      const prediction = Math.max(0, Math.min(10, trend.prediction));
      parts.push(`Projeção: média final estimada de ${prediction.toFixed(1)} com base nos dados acumulados dos bimestres anteriores.`);
    }

    // 7. RECOMENDAÇÃO
    let recommendation: string;
    if (classification.classification === 'critico') {
      recommendation = `Requer intervenção imediata: convocar responsáveis e elaborar plano de recuperação individualizado.`;
    } else if (classification.classification === 'atencao') {
      recommendation = `Requer acompanhamento pedagógico: intensificar apoio nas disciplinas em dificuldade.`;
    } else if (classification.classification === 'excelencia') {
      recommendation = `Manter estímulo: indicar para monitoria, projetos especiais ou olimpíadas.`;
    } else {
      recommendation = `Manter acompanhamento regular para consolidar desempenho.`;
    }
    parts.push(`Ação: ${recommendation}`);

    return parts.join(' ');
  }

  // ============================================
  // CONSTRUÇÃO DO DOCUMENTO
  // ============================================

  private createDocDefinition(content: Content[]): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: (currentPage) => this.createPageHeader(currentPage),
      footer: (currentPage, pageCount) => this.createPageFooter(currentPage, pageCount),
      styles: PDF_STYLES,
      defaultStyle: { fontSize: 10 },
      content,
    };
  }

  private createPageHeader(currentPage: number): Content {
    if (currentPage === 1) {
      return {
        margin: [40, 20, 40, 10],
        stack: [
          { text: this.config.schoolName.toUpperCase(), fontSize: 12, alignment: 'center', color: PDF_COLORS.secondary, margin: [0, 0, 0, 5] },
        ],
      };
    }

    return {
      margin: [40, 20, 40, 10],
      columns: [
        { text: this.config.schoolName, style: 'bodySmall', width: '*' },
        { text: `Aluno: ${this.student?.name || ''}`, style: 'bodySmall', alignment: 'right', width: 'auto' },
      ],
    };
  }

  private createPageFooter(currentPage: number, pageCount: number): Content {
    return {
      margin: [40, 0, 40, 20],
      columns: [
        {
          text: `Gerado por MAVIC - Sistema de Acompanhamento Escolar em ${new Date().toLocaleDateString('pt-BR')}`,
          style: 'caption',
          alignment: 'left',
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          style: 'caption',
          alignment: 'right',
        },
      ],
    };
  }

  private buildDocumentContent(subjects?: string[]): Content[] {
    const content: Content[] = [];

    // 1. Título
    content.push(this.buildTitleSection());

    // 2. Informações do Estudante + Métricas
    content.push(this.buildStudentInfoSection());

    // 3. Quadro de Aproveitamento
    content.push(this.buildGradesTableSection(subjects));

    // 4. Resumo Textual
    content.push(this.buildNarrativeSection());

    // 5. Seção Comportamental
    content.push(this.buildBehaviorSection());

    // 6. Assinaturas
    content.push(this.buildSignaturesSection());

    return content;
  }

  // ============================================
  // SEÇÕES DO DOCUMENTO
  // ============================================

  private buildTitleSection(): Content {
    return {
      stack: [
        {
          text: 'RELATÓRIO INDIVIDUAL DE DESEMPENHO',
          fontSize: 18,
          bold: true,
          alignment: 'center',
          color: PDF_COLORS.primary,
          margin: [0, 10, 0, 5],
        },
      ],
    };
  }

  private buildStudentInfoSection(): Content {
    if (!this.student) return '';

    const average = this.calculateAverage();
    const frequency = this.calculateFrequency();
    const incidentCount = this.incidents.length;
    const classification = classifyStudent(this.grades, this.attendance);
    const color = CLASSIFICATION_COLORS[classification.classification];
    const label = CLASSIFICATION_LABELS[classification.classification];

    return {
      stack: [
        // Informações do estudante
        {
          table: {
            widths: ['*', '*'],
            body: [[
              {
                stack: [
                  { text: 'Estudante', fontSize: 8, color: PDF_COLORS.secondary },
                  { text: this.student.name, fontSize: 11, bold: true },
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
              {
                stack: [
                  { text: 'Turma', fontSize: 8, color: PDF_COLORS.secondary },
                  { text: this.studentClass?.name || 'Não informado', fontSize: 11, bold: true },
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
            ]],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
          },
          margin: [0, 0, 0, 10],
        },

        // Métricas: Média, Ocorrências (Frequência removida)
        {
          table: {
            widths: ['*', '*'],
            body: [[
              {
                stack: [
                  { text: 'Média Geral', fontSize: 9, color: PDF_COLORS.secondary, alignment: 'center' },
                  { text: average.toFixed(1), fontSize: 20, bold: true, alignment: 'center' },
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
              // DISABLED: Frequência removida temporariamente
              // {
              //   stack: [
              //     { text: 'Frequência', fontSize: 9, color: PDF_COLORS.secondary, alignment: 'center' },
              //     { text: `${frequency.toFixed(0)}%`, fontSize: 20, bold: true, alignment: 'center' },
              //   ],
              //   fillColor: '#F8FAFC',
              //   margin: [10, 8, 10, 8],
              // },
              {
                stack: [
                  { text: 'Total de Ocorrências', fontSize: 9, color: PDF_COLORS.secondary, alignment: 'center' },
                  { text: incidentCount.toString(), fontSize: 20, bold: true, alignment: 'center' },
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
            ]],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
          },
          margin: [0, 0, 0, 10],
        },

        // Classificação
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'Classificação', fontSize: 9, color: PDF_COLORS.secondary, margin: [0, 0, 0, 4] },
                {
                  table: {
                    body: [[{
                      text: label.toUpperCase(),
                      fontSize: 10,
                      bold: true,
                      color: classification.classification === 'atencao' ? '#000000' : '#FFFFFF',
                      fillColor: color,
                      margin: [8, 4, 8, 4],
                    }]],
                  },
                  layout: 'noBorders',
                },
              ],
              fillColor: '#F8FAFC',
              margin: [10, 8, 10, 8],
            }]],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
          },
        },
      ],
    };
  }

  private buildGradesTableSection(subjects?: string[]): Content {
    const subjectList = subjects && subjects.length > 0
      ? [...subjects].sort()
      : [...new Set(this.grades.map(g => g.subject))].sort();

    const subjectAverages = this.getSubjectAverages();

    // Construir tabela
    const tableBody: TableCell[][] = [
      [
        { text: 'Disciplina', style: 'tableHeader' },
        { text: '1º Bim', style: 'tableHeader' },
        { text: '2º Bim', style: 'tableHeader' },
        { text: '3º Bim', style: 'tableHeader' },
        { text: '4º Bim', style: 'tableHeader' },
        { text: 'Média', style: 'tableHeader' },
      ],
    ];

    subjectList.forEach(subject => {
      const subGrades = this.grades.filter(g => g.subject === subject);
      const row: TableCell[] = [
        { text: subject, style: 'tableCellLeft', fontSize: 9 },
      ];

      QUARTERS.forEach(quarter => {
        const grade = subGrades.find(g => g.quarter === quarter);
        if (grade) {
          row.push({
            text: grade.grade.toFixed(1),
            style: 'tableCell',
            fontSize: 9,
            color: grade.grade < 6 ? PDF_COLORS.status.critico : PDF_COLORS.primary,
            bold: grade.grade < 6,
          });
        } else {
          row.push({ text: '-', style: 'tableCell', fontSize: 9, color: PDF_COLORS.tertiary });
        }
      });

      // Média final
      const avg = subjectAverages[subject] || 0;
      row.push({
        text: avg > 0 ? avg.toFixed(1) : '-',
        style: 'tableCell',
        fontSize: 9,
        bold: true,
        color: avg < 6 ? PDF_COLORS.status.critico : PDF_COLORS.primary,
      });

      tableBody.push(row);
    });

    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: 'QUADRO DE APROVEITAMENTO', style: 'h2', margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 50, 50, 50, 50, 50],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i) => i === 1 ? PDF_COLORS.primary : PDF_COLORS.border,
            fillColor: (rowIndex) => rowIndex === 0 ? PDF_COLORS.primary : rowIndex % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
            paddingTop: () => 4,
            paddingBottom: () => 4,
            paddingLeft: () => 4,
            paddingRight: () => 4,
          },
          margin: [0, 0, 0, 15],
        },
      ],
    };
  }

  private buildNarrativeSection(): Content {
    const narrative = this.generateNarrative();

    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: 'ANÁLISE QUALITATIVA', style: 'h2', margin: [0, 0, 0, 10] },
        {
          text: narrative,
          fontSize: 9,
          alignment: 'justify',
          lineHeight: 1.3,
          margin: [0, 0, 0, 15],
        },
      ],
    };
  }

  private buildBehaviorSection(): Content {
    if (this.incidents.length === 0) {
      return {
        stack: [
          { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
          { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
          { text: 'HISTÓRICO COMPORTAMENTAL', style: 'h2', margin: [0, 0, 0, 10] },
          {
            text: 'Sem ocorrências disciplinares registradas.',
            fontSize: 9,
            italics: true,
            color: PDF_COLORS.tertiary,
          },
        ],
      };
    }

    const sortedIncidents = [...this.incidents].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const SEVERITY_LABELS: Record<string, string> = {
      leve: 'Leve',
      intermediaria: 'Intermediária',
      grave: 'Grave',
      gravissima: 'Gravíssima',
    };

    const incidentCards: Content[] = sortedIncidents.map(incident => {
      const severityLabel = SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity;
      const severityColor = incident.finalSeverity === 'grave' || incident.finalSeverity === 'gravissima'
        ? PDF_COLORS.status.critico
        : incident.finalSeverity === 'intermediaria'
          ? PDF_COLORS.status.atencao
          : PDF_COLORS.tertiary;

      return ({
        table: {
          widths: [3, '*'],
          body: [[
            { text: '', fillColor: severityColor },
            {
              stack: [
                {
                  text: `${new Date(incident.date).toLocaleDateString('pt-BR')} - ${severityLabel}`,
                  fontSize: 10,
                  bold: true,
                  margin: [0, 0, 0, 4],
                },
                {
                  text: incident.description || 'Sem descrição',
                  fontSize: 9,
                  alignment: 'justify',
                  lineHeight: 1.2,
                },
              ],
              margin: [10, 8, 10, 8],
            },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
        unbreakable: true,
      } as unknown as Content);
    });

    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: 'HISTÓRICO COMPORTAMENTAL', style: 'h2', margin: [0, 0, 0, 10] },
        {
          text: `${this.incidents.length} ocorrência(s) registrada(s) no período.`,
          fontSize: 9,
          color: PDF_COLORS.secondary,
          margin: [0, 0, 0, 10],
        },
        ...incidentCards,
      ],
    };
  }

  private buildSignaturesSection(): Content {
    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        { text: '', margin: [0, 0, 0, 0] }, // Quebra de linha
        {
          columns: [
            {
              stack: [
                {
                  canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS.primary }],
                  margin: [0, 0, 0, 4],
                },
                { text: 'Responsável pela Unidade', fontSize: 9, alignment: 'center' },
                this.config.directorName ? {
                  text: this.config.directorName,
                  fontSize: 9,
                  bold: true,
                  alignment: 'center',
                  margin: [0, 4, 0, 0],
                } : '',
              ],
              width: '*',
            },
            {
              stack: [
                {
                  canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS.primary }],
                  margin: [0, 0, 0, 4],
                },
                { text: 'Pai / Mãe / Responsável', fontSize: 9, alignment: 'center' },
              ],
              width: '*',
            },
          ],
          columnGap: 20,
          margin: [0, 30, 0, 0],
        },
      ],
    };
  }
}

// ============================================
// EXPORT
// ============================================

export async function generateStudentReportPDF(
  student: Student,
  studentClass: Class | undefined,
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  subjects?: string[]
): Promise<void> {
  const generator = new StudentReportPDFGenerator();
  await generator.generate(student, studentClass, grades, incidents, attendance, subjects);
}
