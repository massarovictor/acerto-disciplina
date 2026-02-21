/**
 * Relatório Individual do Aluno - Versão V5.1 (Topicalizada e Robusta)
 * 
 * Estrutura:
 * 1. Informações do Estudante + Métricas (Média, Acompanhamentos)
 * 2. Quadro de Aproveitamento
 * 3. Parecer Pedagógico (Topicalizado - Estilo Ata)
 * 4. Histórico Comportamental
 * 5. Assinaturas
 */

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

import { Student, Class, Grade, Incident, AttendanceRecord } from '@/types';
import { getSchoolConfig, getDefaultConfig, SchoolConfig } from './schoolConfig';
import { PDF_COLORS, PDF_STYLES, getPdfMake, getPDFGenerator, PDFGenerator } from './pdfGenerator';
import {
  classifyStudent,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
} from './advancedAnalytics';
import { QUARTERS } from './subjects';
import {
  buildIndividualBehaviorEntries,
} from './reportBehaviorSummary';
import { resolveReportAccentColor } from './reportPdfTheme';

class StudentReportPDFGenerator {
  private config: SchoolConfig;
  private student: Student | null = null;
  private studentClass: Class | undefined;
  private grades: Grade[] = [];
  private incidents: Incident[] = [];
  private attendance: AttendanceRecord[] = [];
  private periodLabel = 'Ano Completo';
  private accentColor = PDF_COLORS.primary;

  constructor() {
    this.config = getDefaultConfig();
  }

  async generate(
    student: Student,
    studentClass: Class | undefined,
    grades: Grade[],
    incidents: Incident[],
    attendance: AttendanceRecord[],
    subjects?: string[],
    periodContextLabel: string = 'Ano Completo',
  ): Promise<void> {
    try {
      this.config = await getSchoolConfig();
      this.student = student;
      this.studentClass = studentClass;
      this.grades = grades.filter(g => g.studentId === student.id);
      this.incidents = incidents.filter(i => i.studentIds.includes(student.id));
      this.attendance = []; // Feature desativada
      this.periodLabel = periodContextLabel?.trim() || 'Ano Completo';
      this.accentColor = resolveReportAccentColor(this.config.themeColor);

      const content = this.buildDocumentContent(subjects);
      const docDefinition = this.createDocDefinition(content);

      const periodToken = this.periodLabel
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w]/g, '');
      const safePeriodToken = periodToken.length > 0 ? periodToken : 'Ano_Completo';
      const pdfMake = await getPdfMake();
      pdfMake.createPdf(docDefinition).download(
        `Analise_Individual_${this.student.name.replace(/\s+/g, '_')}_${safePeriodToken}.pdf`,
      );
    } catch (error) {
      console.error('Erro ao gerar PDF Individual:', error);
      throw error;
    }
  }

  private createDocDefinition(content: Content[]): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: (currentPage) => this.createPageHeader(currentPage),
      footer: (currentPage, pageCount) => this.createPageFooter(currentPage, pageCount),
      styles: {
        ...PDF_STYLES,
        tableHeader: { ...(PDF_STYLES.tableHeader || {}), fillColor: this.accentColor },
      },
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
          text: `Gerado por MAVIC em ${new Date().toLocaleDateString('pt-BR')}`,
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
    return [
      this.buildTitleSection(),
      this.buildStudentInfoSection(),
      this.buildGradesTableSection(subjects),
      this.buildNarrativeSection(),
      this.buildSignaturesSection(),
    ];
  }

  private buildTitleSection(): Content {
    return {
      stack: [
        {
          text: 'RELATÓRIO INDIVIDUAL DE DESEMPENHO',
          fontSize: 16,
          bold: true,
          alignment: 'center',
          color: PDF_COLORS.primary,
          margin: [0, 0, 0, 4],
        },
        {
          text: `PERÍODO: ${this.periodLabel}`,
          fontSize: 10,
          bold: true,
          alignment: 'center',
          color: PDF_COLORS.secondary,
          margin: [0, 0, 0, 16],
        },
      ],
    };
  }

  private buildStudentInfoSection(): Content {
    if (!this.student) return '';
    const avgScore = this.calculateAverage();
    const classification = classifyStudent(this.grades, this.attendance);
    const color = CLASSIFICATION_COLORS[classification.classification];
    const label = CLASSIFICATION_LABELS[classification.classification];
    const gen = getPDFGenerator();

    // V7 Dashboard Header (Similar to Class Report)
    return {
      stack: [
        // 1. Linha Principal: Nome + Status Pill
        {
          columns: [
            { text: this.student.name.toUpperCase(), fontSize: 18, bold: true, color: PDF_COLORS.primary, width: '*' },
            {
              stack: [
                gen.createStatusPill(label, classification.classification === 'atencao' ? '#000000' : color)
              ],
              width: 'auto',
              alignment: 'right',
              margin: [0, 4, 0, 0]
            }
          ],
          margin: [0, 0, 0, 15]
        },

        // 2. Linha de KPIs (Dashboard Row)
        gen.createDashboardRow([
          gen.createKPIBox('Média Geral', avgScore.toFixed(1), avgScore >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Desempenho Global'),
          gen.createKPIBox('Acompanhamentos', this.incidents.length.toString(), this.incidents.length > 0 ? PDF_COLORS.status.atencao : PDF_COLORS.status.aprovado, 'Total Registrado')
        ])
      ],
      margin: [0, 0, 0, 25]
    } as Content;
  }

  private buildGradesTableSection(subjects?: string[]): Content {
    const subjectList = subjects && subjects.length > 0
      ? [...subjects].sort()
      : [...new Set(this.grades.map(g => g.subject))].sort();

    // Data Prep
    const tableData = subjectList.map(subject => {
      const subGrades = this.grades.filter(g => g.subject === subject);
      const quartersData = QUARTERS.map((_, index) => {
        const targetQ = index + 1;
        const qGrades = subGrades.filter(g => {
          if (!g.quarter) return false;
          const match = String(g.quarter).match(/\d+/);
          return match ? parseInt(match[0]) === targetQ : false;
        });
        return qGrades.length > 0 ? qGrades.reduce((a, b) => a + b.grade, 0) / qGrades.length : null;
      });

      const validQuarters = quartersData.filter(v => v !== null) as number[];
      const finalAvg = validQuarters.length > 0
        ? validQuarters.reduce((a, b) => a + b, 0) / validQuarters.length
        : 0;

      return { subject, quartersData, finalAvg };
    });
    return {
      stack: [
        { text: 'QUADRO DE APROVEITAMENTO', style: 'h3', margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 40, 40, 40, 40, 50], // Standard widths
            body: [
              [
                { text: 'DISCIPLINA', style: 'tableHeader', alignment: 'left' },
                { text: '1º BIM', style: 'tableHeader', alignment: 'center' },
                { text: '2º BIM', style: 'tableHeader', alignment: 'center' },
                { text: '3º BIM', style: 'tableHeader', alignment: 'center' },
                { text: '4º BIM', style: 'tableHeader', alignment: 'center' },
                { text: 'FINAL', style: 'tableHeader', alignment: 'center' }
              ],
              ...tableData.map((d, index) => {
                const fillColor = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                return [
                  { text: d.subject, style: 'bodySmall', bold: true, alignment: 'left', fillColor, margin: [5, 4, 0, 4] },
                  ...d.quartersData.map(q => ({
                    text: q !== null ? q.toFixed(1) : '-',
                    style: 'bodySmall',
                    color: q !== null && q < 6 ? PDF_COLORS.danger : PDF_COLORS.secondary,
                    alignment: 'center',
                    fillColor,
                    margin: [0, 4, 0, 4] as [number, number, number, number]
                  })),
                  {
                    text: d.finalAvg.toFixed(1),
                    style: 'bodySmall',
                    bold: true,
                    alignment: 'center',
                    fillColor,
                    color: d.finalAvg < 6 ? PDF_COLORS.danger : 'black',
                    margin: [0, 4, 0, 4] as [number, number, number, number]
                  }
                ] as TableCell[];
              })
            ]
          },
          layout: {
            hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
              i === 0 || i === node.table.body.length ? 0 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#CBD5E1',
            paddingLeft: () => 4,
            paddingRight: () => 4,
          },
          margin: [0, 0, 0, 20]
        }
      ]
    };
  }

  private buildNarrativeSection(): Content {
    if (!this.student) return '';

    const classification = classifyStudent(this.grades, this.attendance);
    const subjectAverages = this.getSubjectAverages();
    const subjects = Object.keys(subjectAverages);
    const below6 = subjects.filter(s => subjectAverages[s] < 6).map(s => ({ name: s, avg: subjectAverages[s] }));
    const above8 = subjects.filter(s => subjectAverages[s] >= 8).map(s => ({ name: s, avg: subjectAverages[s] }));

    const vulnerabilities = below6.map(s => `${s.name} (${s.avg.toFixed(1)})`);
    const strengths = above8.map(s => `${s.name} (${s.avg.toFixed(1)})`);

    const behaviorEntries = buildIndividualBehaviorEntries(this.incidents, {
      maxCauseLength: 180,
      includeStatusInLine: false,
    });

    let encaminhamento = 'Manutenção do acompanhamento regular.';
    if (classification.classification === 'critico') encaminhamento = 'Intervenção imediata e plano de recuperação individualizado.';
    if (classification.classification === 'atencao') encaminhamento = 'Intensificação do suporte pedagógico nos componentes sinalizados.';

    return {
      stack: [
        { text: 'PARECER DESCRITIVO', style: 'h3', margin: [0, 0, 0, 10] },
        {
          table: {
            widths: ['*'],
            body: [[
              {
                stack: [
                  // Status + Spacing
                  { text: `STATUS GERAL: ${CLASSIFICATION_LABELS[classification.classification].toUpperCase()}`, fontSize: 9, bold: true, margin: [0, 0, 0, 12] },

                  // Columns with more breathing room
                  {
                    columns: [
                      vulnerabilities.length > 0 ? {
                        stack: [
                          { text: 'VULNERABILIDADES (< 6.0):', fontSize: 8, bold: true, color: PDF_COLORS.status.critico, margin: [0, 0, 0, 4] },
                          { ul: vulnerabilities, fontSize: 8, color: '#475569', margin: [0, 0, 0, 0] }
                        ],
                        width: '*', margin: [0, 0, 10, 0]
                      } : { text: '', width: 0 },

                      strengths.length > 0 ? {
                        stack: [
                          { text: 'DESTAQUES (> 8.0):', fontSize: 8, bold: true, color: PDF_COLORS.status.aprovado, margin: [0, 0, 0, 4] },
                          { ul: strengths, fontSize: 8, color: '#475569', margin: [0, 0, 0, 0] }
                        ],
                        width: '*'
                      } : { text: '', width: 0 }
                    ],
                    columnGap: 20,
                    margin: [0, 0, 0, 15]
                  },

                  // Comportamental
                  {
                    stack: [
                      { text: 'COMPORTAMENTAL:', fontSize: 8, bold: true, margin: [0, 0, 0, 3] },
                      ...(behaviorEntries.length > 0
                        ? [
                            {
                              ul: behaviorEntries.map((entry) => entry.line),
                              fontSize: 8,
                              color: '#334155',
                              margin: [0, 0, 0, 0],
                            } as Content,
                          ]
                        : [
                            {
                              text: 'Sem registros no período.',
                              fontSize: 8,
                              color: PDF_COLORS.secondary,
                              italics: true,
                            } as Content,
                          ]),
                    ],
                    margin: [0, 0, 0, 6],
                  },

                  // Forwarding
                  {
                    text: [
                      { text: 'ENCAMINHAMENTO: ', fontSize: 8, bold: true },
                      { text: encaminhamento, fontSize: 8 }
                    ],
                    margin: [0, 0, 0, 0]
                  }
                ],
                margin: [15, 15, 15, 15]
              }
            ]]
          },
          layout: 'noBorders',
          fillColor: '#F8FAFC',
          margin: [0, 0, 0, 30] // Increased bottom margin
        }
      ]
    };
  }

  private buildSignaturesSection(): Content {
    return {
      margin: [0, 20, 0, 0],
      table: {
        widths: ['*', '*'],
        body: [
          [
            // Signature 1
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#000000' }] },
                { text: 'Coordenação Pedagógica', fontSize: 9, alignment: 'center', margin: [0, 5, 0, 0] }
              ],
              alignment: 'center',
              margin: [10, 0, 10, 0]
            },
            // Signature 2
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#000000' }] },
                { text: 'Responsável', fontSize: 9, alignment: 'center', margin: [0, 5, 0, 0] }
              ],
              alignment: 'center',
              margin: [10, 0, 10, 0]
            }
          ]
        ]
      },
      layout: 'noBorders'
    };
  }

  private calculateAverage(): number {
    if (this.grades.length === 0) return 0;
    return this.grades.reduce((s, g) => s + g.grade, 0) / this.grades.length;
  }

  private getSubjectAverages(): Record<string, number> {
    const res: Record<string, number> = {};
    const gradesBySub: Record<string, number[]> = {};
    this.grades.forEach(g => {
      if (!gradesBySub[g.subject]) gradesBySub[g.subject] = [];
      gradesBySub[g.subject].push(g.grade);
    });
    Object.entries(gradesBySub).forEach(([s, gs]) => {
      res[s] = gs.reduce((a, b) => a + b, 0) / gs.length;
    });
    return res;
  }
}

export const generateStudentReportPDF = async (
  student: Student,
  studentClass: Class | undefined,
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  subjects?: string[],
  periodContextLabel?: string,
) => {
  const gen = new StudentReportPDFGenerator();
  return gen.generate(
    student,
    studentClass,
    grades,
    incidents,
    attendance,
    subjects,
    periodContextLabel,
  );
};
