/**
 * Relatório Qualitativo de Turma - Nova Estrutura
 * 
 * Estrutura:
 * 1. Sumário Executivo (compacto)
 * 2. Avaliação por Área do Conhecimento (falhas e potencialidades)
 * 3. Avaliação Individual (texto corrido qualitativo)
 */

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

import { Class, Student, Grade, Incident, AttendanceRecord } from '@/types';
import { getSchoolConfig, getDefaultConfig, SchoolConfig } from './schoolConfig';
import { PDF_COLORS, PDF_STYLES } from './pdfGenerator';
import {
  generateAdvancedAnalytics,
  AdvancedAnalyticsResult,
  StudentProfile,
  StudentClassification,
  SubjectGradeInfo,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS
} from './advancedAnalytics';
import { generateInsightsReport, InsightsReport } from './insightsEngine';
import { QUARTERS, SUBJECT_AREAS, getSubjectArea } from './subjects';

// pdfMake será carregado dinamicamente
let pdfMakeInstance: any = null;

async function getPdfMake() {
  if (pdfMakeInstance) return pdfMakeInstance;

  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

  pdfMakeInstance = pdfMakeModule.default || pdfMakeModule;

  const vfs = (pdfFontsModule as any).pdfMake?.vfs
    || (pdfFontsModule as any).default?.pdfMake?.vfs
    || (pdfFontsModule as any).vfs
    || (pdfFontsModule as any).default?.vfs;

  if (vfs) {
    pdfMakeInstance.vfs = vfs;
  }

  return pdfMakeInstance;
}

// ============================================
// INTERFACE PARA ANÁLISE POR ÁREA
// ============================================

interface AreaAnalysis {
  areaName: string;
  average: number;
  studentsEvaluated: number;
  studentsBelow6: number;
  studentsAbove8: number;
  criticalSubjects: { subject: string; average: number; belowCount: number }[];
  highlights: { studentName: string; average: number }[];
  falhas: string[];
  potencialidades: string[];
}

// ============================================
// CLASSE PRINCIPAL
// ============================================

class ClassReportPDFGenerator {
  private config: SchoolConfig;
  private analytics: AdvancedAnalyticsResult | null = null;
  private insights: InsightsReport | null = null;
  private period: string = 'Anual';
  private grades: Grade[] = [];
  private students: Student[] = [];
  private incidents: Incident[] = [];
  private professionalSubjects: string[] = [];

  constructor() {
    this.config = getDefaultConfig();
  }

  async generate(
    cls: Class,
    students: Student[],
    grades: Grade[],
    incidents: Incident[],
    attendance: AttendanceRecord[], // DISABLED: Kept for API compatibility, not used
    professionalSubjects: string[] = [],
    selectedQuarter?: string
  ): Promise<void> {
    try {
      this.config = await getSchoolConfig();
      this.students = students;
      this.incidents = incidents;
      this.professionalSubjects = professionalSubjects;

      this.period = selectedQuarter && selectedQuarter !== 'anual'
        ? selectedQuarter
        : 'Anual';

      // Filtrar dados por período
      this.grades = selectedQuarter && selectedQuarter !== 'anual'
        ? grades.filter(g => g.quarter === selectedQuarter)
        : grades;

      // Gerar analytics
      // DISABLED: Attendance removed - passing empty array
      this.analytics = generateAdvancedAnalytics(
        students,
        this.grades,
        incidents,
        [], // Empty attendance array
        professionalSubjects,
        QUARTERS
      );

      // Calcular métricas
      const classAverage = this.calculateClassAverage();
      const classFrequency = 100; // DISABLED: Always 100% when attendance is disabled

      // Gerar insights
      this.insights = generateInsightsReport(
        this.analytics,
        students.length,
        classAverage,
        classFrequency,
        this.period
      );

      // Construir documento
      const content = this.buildDocumentContent(cls);
      const docDefinition = this.createDocDefinition(cls, content);

      // Download
      const periodSuffix = selectedQuarter && selectedQuarter !== 'anual'
        ? `_${selectedQuarter.replace(/\s+/g, '_').replace('º', '')}`
        : '_Anual';
      const filename = `Relatorio_${cls.name.replace(/\s+/g, '_')}${periodSuffix}.pdf`;

      const pdfMake = await getPdfMake();
      pdfMake.createPdf(docDefinition).download(filename);

    } catch (error) {
      console.error('Erro ao gerar relatório de turma (PDF generation failed)');
      throw error;
    }
  }

  // ============================================
  // CÁLCULOS
  // ============================================

  private calculateClassAverage(): number {
    if (this.grades.length === 0) return 0;
    return this.grades.reduce((sum, g) => sum + g.grade, 0) / this.grades.length;
  }

  private calculateClassFrequency(attendance: AttendanceRecord[]): number {
    if (attendance.length === 0) return 100;
    const present = attendance.filter(a => a.status === 'presente').length;
    return (present / attendance.length) * 100;
  }

  // ============================================
  // ANÁLISE POR ÁREA
  // ============================================

  private analyzeAreas(): AreaAnalysis[] {
    const areas: AreaAnalysis[] = [];

    // Incluir áreas padrão + profissional se houver
    const allAreas = [...SUBJECT_AREAS];
    if (this.professionalSubjects.length > 0) {
      allAreas.push({
        name: 'Formação Técnica e Profissional',
        subjects: this.professionalSubjects,
        color: '#6366F1',
      });
    }

    allAreas.forEach(area => {
      const areaGrades = this.grades.filter(g => area.subjects.includes(g.subject));
      if (areaGrades.length === 0) return;

      // Alunos avaliados na área
      const studentsInArea = [...new Set(areaGrades.map(g => g.studentId))];

      // Calcular médias por aluno na área
      const studentAverages: { id: string; name: string; avg: number }[] = [];
      studentsInArea.forEach(studentId => {
        const studentAreaGrades = areaGrades.filter(g => g.studentId === studentId);
        const avg = studentAreaGrades.reduce((s, g) => s + g.grade, 0) / studentAreaGrades.length;
        const student = this.students.find(s => s.id === studentId);
        studentAverages.push({ id: studentId, name: student?.name || '', avg });
      });

      const studentsBelow6 = studentAverages.filter(s => s.avg < 6).length;
      const studentsAbove8 = studentAverages.filter(s => s.avg >= 8).length;
      const areaAverage = areaGrades.reduce((s, g) => s + g.grade, 0) / areaGrades.length;

      // Disciplinas críticas (média < 6)
      const subjectStats: Record<string, { grades: number[]; students: Set<string> }> = {};
      areaGrades.forEach(g => {
        if (!subjectStats[g.subject]) {
          subjectStats[g.subject] = { grades: [], students: new Set() };
        }
        subjectStats[g.subject].grades.push(g.grade);
        subjectStats[g.subject].students.add(g.studentId);
      });

      const criticalSubjects = Object.entries(subjectStats)
        .map(([subject, data]) => ({
          subject,
          average: data.grades.reduce((a, b) => a + b, 0) / data.grades.length,
          belowCount: data.grades.filter(g => g < 6).length,
        }))
        .filter(s => s.average < 6 || s.belowCount >= Math.ceil(studentsInArea.length * 0.3))
        .sort((a, b) => a.average - b.average);

      // Destaques (alunos com média >= 8)
      const highlights = studentAverages
        .filter(s => s.avg >= 8)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5)
        .map(s => ({ studentName: s.name, average: s.avg }));

      // Construir falhas e potencialidades
      const falhas: string[] = [];
      const potencialidades: string[] = [];

      if (areaAverage < 6) {
        falhas.push(`Média da área (${areaAverage.toFixed(1)}) está abaixo do esperado.`);
      }

      if (studentsBelow6 > 0) {
        const percent = ((studentsBelow6 / studentsInArea.length) * 100).toFixed(0);
        falhas.push(`${studentsBelow6} aluno(s) (${percent}%) com média abaixo de 6,0 na área.`);
      }

      if (criticalSubjects.length > 0) {
        const subjects = criticalSubjects.slice(0, 3).map(s => s.subject).join(', ');
        falhas.push(`Disciplinas críticas: ${subjects}.`);
      }

      if (areaAverage >= 7) {
        potencialidades.push(`Bom desempenho coletivo com média ${areaAverage.toFixed(1)}.`);
      }

      if (studentsAbove8 > 0) {
        const percent = ((studentsAbove8 / studentsInArea.length) * 100).toFixed(0);
        potencialidades.push(`${studentsAbove8} aluno(s) (${percent}%) com excelência (média ≥ 8,0).`);
      }

      if (highlights.length > 0) {
        const names = highlights.slice(0, 3).map(h => h.studentName).join(', ');
        potencialidades.push(`Destaques: ${names}.`);
      }

      areas.push({
        areaName: area.name,
        average: areaAverage,
        studentsEvaluated: studentsInArea.length,
        studentsBelow6,
        studentsAbove8,
        criticalSubjects,
        highlights,
        falhas,
        potencialidades,
      });
    });

    return areas;
  }

  // ============================================
  // GERAÇÃO DE NARRATIVA INDIVIDUAL
  // ============================================

  /**
   * Formata lista de disciplinas com suas médias
   */
  private formatSubjectsWithGrades(subjects: SubjectGradeInfo[]): string {
    return subjects.map(s => `${s.subject} (${s.average.toFixed(1)})`).join(', ');
  }

  /**
   * Formata lista de pontos fortes com médias
   */
  private formatStrengthsWithGrades(strengths: string[], averages: Record<string, number>): string {
    return strengths.slice(0, 3).map(s => {
      const avg = averages[s];
      return avg ? `${s} (${avg.toFixed(1)})` : s;
    }).join(', ');
  }

  private generateStudentNarrative(profile: StudentProfile): string {
    const parts: string[] = [];
    const hasGrades = Object.keys(profile.subjectAverages).length > 0;

    if (!hasGrades) {
      return 'Sem dados suficientes para análise acadêmica neste período. Aguardar lançamento de notas para avaliações mais precisas.';
    }

    // 1. SITUAÇÃO ATUAL - Claro e direto
    if (profile.classification === 'critico') {
      parts.push(`Situação crítica: ${profile.subjectsBelow6.length} disciplina(s) abaixo da média mínima.`);
    } else if (profile.classification === 'atencao') {
      parts.push(`Situação de atenção: ${profile.subjectsBelow6.length} disciplina(s) em recuperação.`);
    } else if (profile.classification === 'excelencia') {
      parts.push(`Situação de excelência: aprovado em todas as disciplinas com média geral superior a 8,0.`);
    } else {
      parts.push(`Situação regular: aprovado em todas as disciplinas.`);
    }

    // 2. DISCIPLINAS EM DIFICULDADE (com notas específicas)
    if (profile.subjectsBelow6.length > 0) {
      const disciplinasFormatadas = this.formatSubjectsWithGrades(profile.subjectsBelow6);
      parts.push(`Disciplinas abaixo de 6,0: ${disciplinasFormatadas}.`);
    }

    // 3. PONTOS FORTES (com notas)
    if (profile.strengths.length > 0) {
      const fortesFormatados = this.formatStrengthsWithGrades(profile.strengths, profile.subjectAverages);
      parts.push(`Pontos fortes: ${fortesFormatados}.`);
    }

    // 4. TENDÊNCIA - Análise temporal cumulativa
    if (profile.trend.direction === 'crescente' && profile.trend.confidence > 30) {
      parts.push(`Tendência: melhora progressiva ao longo dos bimestres (confiança ${profile.trend.confidence.toFixed(0)}%).`);
    } else if (profile.trend.direction === 'decrescente' && profile.trend.confidence > 30) {
      parts.push(`Tendência: queda de desempenho ao longo dos bimestres (confiança ${profile.trend.confidence.toFixed(0)}%).`);
    } else if (profile.trend.direction === 'estavel') {
      parts.push(`Tendência: desempenho estável ao longo dos bimestres.`);
    }

    // 5. CORRELAÇÕES ENTRE DISCIPLINAS
    if (this.analytics && profile.subjectsBelow6.length > 0) {
      const gateways = this.analytics.gatewaySubjects;
      const disciplinasAfetadas = profile.subjectsBelow6.map(s => s.subject);
      const affectedByGateway = gateways.find(g => disciplinasAfetadas.includes(g.subject));

      if (affectedByGateway) {
        parts.push(`Correlação identificada: a dificuldade em ${affectedByGateway.subject} pode estar ` +
          `impactando ${affectedByGateway.dependentSubjects.slice(0, 2).join(' e ')}.`);
      }
    }

    // 6. PREDIÇÃO - Projeção baseada em dados acumulados
    if (profile.trend.prediction > 0 && profile.trend.confidence > 20) {
      const prediction = Math.max(0, Math.min(10, profile.trend.prediction));
      parts.push(`Projeção: média final estimada de ${prediction.toFixed(1)} ` +
        `com base nos dados acumulados dos bimestres anteriores.`);
    }

    // 7. RECOMENDAÇÃO - Ação clara e objetiva
    parts.push(`Ação: ${profile.recommendation}`);

    return parts.join(' ');
  }

  // ============================================
  // CONSTRUÇÃO DO DOCUMENTO
  // ============================================

  private createDocDefinition(cls: Class, content: Content[]): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: (currentPage) => this.createPageHeader(cls, currentPage),
      footer: (currentPage, pageCount) => this.createPageFooter(currentPage, pageCount),
      styles: PDF_STYLES,
      defaultStyle: { fontSize: 10 },
      content,
    };
  }

  private createPageHeader(cls: Class, currentPage: number): Content {
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
        { text: `Turma: ${cls.name}`, style: 'bodySmall', alignment: 'right', width: 'auto' },
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

  private buildDocumentContent(cls: Class): Content[] {
    const content: Content[] = [];

    // 1. Título
    content.push(this.buildTitleSection(cls));

    // 2. Sumário Executivo (compacto)
    content.push(this.buildExecutiveSummary());

    // 3. Avaliação por Área do Conhecimento
    content.push(this.buildAreaAnalysisSection());

    // 4. Avaliação Individual
    content.push(this.buildIndividualAnalysisSection());

    return content;
  }

  // ============================================
  // SEÇÕES DO DOCUMENTO
  // ============================================

  private buildTitleSection(cls: Class): Content {
    return {
      stack: [
        {
          text: 'RELATÓRIO QUALITATIVO DA TURMA',
          fontSize: 18,
          bold: true,
          alignment: 'center',
          color: PDF_COLORS.primary,
          margin: [0, 10, 0, 5],
        },
        {
          text: `${cls.name} | Período: ${this.period}`,
          fontSize: 12,
          alignment: 'center',
          color: PDF_COLORS.secondary,
          margin: [0, 0, 0, 15],
        },
      ],
    };
  }

  private buildExecutiveSummary(): Content {
    if (!this.insights) return '';

    const summary = this.insights.executiveSummary;
    const counts = summary.classificationCounts;

    return {
      stack: [
        { text: 'SUMÁRIO EXECUTIVO', style: 'h2', margin: [0, 0, 0, 10] },

        // Linha 1: Métricas gerais (Frequência removida)
        {
          table: {
            widths: ['*', '*'],
            body: [[
              {
                stack: [
                  { text: 'Total de Alunos', fontSize: 9, color: PDF_COLORS.secondary, alignment: 'center' },
                  { text: summary.totalStudents.toString(), fontSize: 20, bold: true, alignment: 'center' },
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
              {
                stack: [
                  { text: 'Média Geral', fontSize: 9, color: PDF_COLORS.secondary, alignment: 'center' },
                  { text: summary.classAverage.toFixed(1), fontSize: 20, bold: true, alignment: 'center' },
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
              // DISABLED: Frequência Média removida temporariamente
              // {
              //   stack: [
              //     { text: 'Frequência Média', fontSize: 9, color: PDF_COLORS.secondary, alignment: 'center' },
              //     { text: `${summary.classFrequency.toFixed(0)}%`, fontSize: 20, bold: true, alignment: 'center' },
              //   ],
              //   fillColor: '#F8FAFC',
              //   margin: [10, 8, 10, 8],
              // },
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

        // Linha 2: Classificações
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [[
              {
                stack: [
                  { text: 'Crítico', fontSize: 9, color: '#FFFFFF', alignment: 'center' },
                  { text: counts.critico.toString(), fontSize: 16, bold: true, color: '#FFFFFF', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.critico,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Atenção', fontSize: 9, color: '#000000', alignment: 'center' },
                  { text: counts.atencao.toString(), fontSize: 16, bold: true, color: '#000000', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.atencao,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Aprovado', fontSize: 9, color: '#FFFFFF', alignment: 'center' },
                  { text: counts.aprovado.toString(), fontSize: 16, bold: true, color: '#FFFFFF', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.aprovado,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Excelência', fontSize: 9, color: '#FFFFFF', alignment: 'center' },
                  { text: counts.excelencia.toString(), fontSize: 16, bold: true, color: '#FFFFFF', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.excelencia,
                margin: [8, 6, 8, 6],
              },
            ]],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 15],
        },

        // Legenda das classificações
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'Critérios de Classificação:', fontSize: 9, bold: true, margin: [0, 0, 0, 4] },
                { text: '• Crítico: 3 ou mais disciplinas com nota < 6,0', fontSize: 8, color: PDF_COLORS.secondary },
                { text: '• Atenção: 1 ou 2 disciplinas com nota < 6,0', fontSize: 8, color: PDF_COLORS.secondary },
                { text: '• Aprovado: Todas disciplinas ≥ 6,0, média geral < 8,0', fontSize: 8, color: PDF_COLORS.secondary },
                { text: '• Excelência: Todas disciplinas ≥ 6,0 e média geral ≥ 8,0', fontSize: 8, color: PDF_COLORS.secondary },
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

  private buildAreaAnalysisSection(): Content {
    const areas = this.analyzeAreas();

    if (areas.length === 0) {
      return {
        stack: [
          { text: 'AVALIAÇÃO POR ÁREA DO CONHECIMENTO', style: 'h2', margin: [0, 0, 0, 10] },
          { text: 'Dados insuficientes para análise por área.', style: 'body', italics: true },
        ],
      };
    }

    // Adicionar espaçamento entre áreas (2 quebras de linha)
    const areaContents: Content[] = [];
    areas.forEach((area, index) => {
      if (index > 0) {
        // Duas quebras de linha antes de cada área (exceto a primeira)
        areaContents.push({ text: '', margin: [0, 0, 0, 0] });
        areaContents.push({ text: '', margin: [0, 0, 0, 0] });
      }
      areaContents.push(this.buildAreaCard(area));
    });

    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] }, // Primeira quebra de linha
        { text: '', margin: [0, 0, 0, 0] }, // Segunda quebra de linha
        { text: 'AVALIAÇÃO POR ÁREA DO CONHECIMENTO', style: 'h2', margin: [0, 0, 0, 10] },
        {
          text: 'Análise detalhada das falhas e potencialidades identificadas em cada área.',
          style: 'body',
          margin: [0, 0, 0, 15],
        },
        ...areaContents,
      ],
    };
  }

  private buildAreaCard(area: AreaAnalysis): Content {
    return ({
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            // Header da área
            {
              columns: [
                { text: area.areaName, fontSize: 12, bold: true, width: '*' },
                {
                  text: `Média: ${area.average.toFixed(1)}`,
                  fontSize: 10,
                  bold: true,
                  color: area.average >= 7 ? PDF_COLORS.status.aprovado :
                    area.average >= 6 ? PDF_COLORS.status.atencao : PDF_COLORS.status.critico,
                  alignment: 'right',
                  width: 'auto',
                },
              ],
              margin: [0, 0, 0, 8],
            },

            // Estatísticas
            {
              text: `${area.studentsEvaluated} aluno(s) avaliado(s) | ${area.studentsBelow6} abaixo de 6,0 | ${area.studentsAbove8} com excelência`,
              fontSize: 9,
              color: PDF_COLORS.secondary,
              margin: [0, 0, 0, 10],
            },

            // Falhas
            area.falhas.length > 0 ? {
              stack: [
                { text: 'FALHAS IDENTIFICADAS', fontSize: 9, bold: true, color: PDF_COLORS.status.critico, margin: [0, 0, 0, 4] },
                ...area.falhas.map(f => ({ text: `• ${f}`, fontSize: 9, margin: [8, 0, 0, 2] })),
              ],
              margin: [0, 0, 0, 8],
            } : '',

            // Potencialidades
            area.potencialidades.length > 0 ? {
              stack: [
                { text: 'POTENCIALIDADES', fontSize: 9, bold: true, color: PDF_COLORS.status.aprovado, margin: [0, 0, 0, 4] },
                ...area.potencialidades.map(p => ({ text: `• ${p}`, fontSize: 9, margin: [8, 0, 0, 2] })),
              ],
            } : '',
          ],
          margin: [12, 10, 12, 10],
        }]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
      },
      margin: [0, 0, 0, 12],
      // Garantir que o bloco não seja cortado - manter conteúdo junto
      unbreakable: true,
    } as unknown as Content);
  }

  private buildIndividualAnalysisSection(): Content {
    if (!this.analytics) return '';

    // Ordenar alunos por classificação (crítico primeiro)
    const sortedProfiles = [...this.analytics.studentProfiles].sort((a, b) => {
      const order: Record<StudentClassification, number> = {
        critico: 0,
        atencao: 1,
        aprovado: 2,
        excelencia: 3,
      };
      if (order[a.classification] !== order[b.classification]) {
        return order[a.classification] - order[b.classification];
      }
      return a.studentName.localeCompare(b.studentName, 'pt-BR');
    });

    // Adicionar espaçamento entre alunos (2 quebras de linha)
    const studentCards: Content[] = [];
    sortedProfiles.forEach((profile, index) => {
      if (index > 0) {
        // Duas quebras de linha antes de cada aluno (exceto o primeiro)
        studentCards.push({ text: '', margin: [0, 0, 0, 0] });
        studentCards.push({ text: '', margin: [0, 0, 0, 0] });
      }
      studentCards.push(this.buildStudentCard(profile, index + 1));
    });

    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] }, // Primeira quebra de linha
        { text: '', margin: [0, 0, 0, 0] }, // Segunda quebra de linha
        { text: 'AVALIAÇÃO INDIVIDUAL DOS ALUNOS', style: 'h2', margin: [0, 0, 0, 10] },
        {
          text: 'Análise qualitativa de cada aluno utilizando correlações entre disciplinas, tendências e modelo preditivo.',
          style: 'body',
          margin: [0, 0, 0, 15],
        },
        ...studentCards,
      ],
    };
  }

  private buildStudentCard(profile: StudentProfile, number: number): Content {
    const narrative = this.generateStudentNarrative(profile);
    const color = CLASSIFICATION_COLORS[profile.classification];
    const label = CLASSIFICATION_LABELS[profile.classification];

    return {
      table: {
        widths: [3, '*'],
        body: [[
          { text: '', fillColor: color },
          {
            stack: [
              // Header
              {
                columns: [
                  { text: `${number}. ${profile.studentName}`, fontSize: 11, bold: true, width: '*' },
                  {
                    table: {
                      body: [[{
                        text: label.toUpperCase(),
                        fontSize: 8,
                        bold: true,
                        color: profile.classification === 'atencao' ? '#000000' : '#FFFFFF',
                        fillColor: color,
                        margin: [6, 2, 6, 2],
                      }]],
                    },
                    layout: 'noBorders',
                    width: 'auto',
                  },
                ],
                margin: [0, 0, 0, 6],
              },

              // Métricas rápidas
              {
                columns: [
                  { text: `Média: ${profile.average.toFixed(1)}`, fontSize: 9, color: PDF_COLORS.secondary },
                  { text: `Frequência: ${profile.frequency.toFixed(0)}%`, fontSize: 9, color: PDF_COLORS.secondary },
                  {
                    text: `Reprovações: ${profile.subjectsBelow6.length}`,
                    fontSize: 9,
                    color: profile.subjectsBelow6.length >= 3 ? PDF_COLORS.status.critico :
                      profile.subjectsBelow6.length > 0 ? PDF_COLORS.status.atencao : PDF_COLORS.secondary
                  },
                ],
                margin: [0, 0, 0, 8],
              },

              // Narrativa qualitativa
              {
                text: narrative,
                fontSize: 9,
                alignment: 'justify',
                lineHeight: 1.3,
              },
            ],
            margin: [10, 10, 10, 10],
          },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10],
      // Garantir que o bloco não seja cortado - manter conteúdo junto
      unbreakable: true,
    };
  }
}

// ============================================
// EXPORT
// ============================================

export async function generateProfessionalClassReportPDF(
  cls: Class,
  students: Student[],
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  professionalSubjects?: string[],
  selectedQuarter?: string
): Promise<void> {
  const generator = new ClassReportPDFGenerator();
  await generator.generate(
    cls,
    students,
    grades,
    incidents,
    attendance,
    professionalSubjects || [],
    selectedQuarter
  );
}
