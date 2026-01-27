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
import { PDF_COLORS, PDF_STYLES, getPdfMake, getPDFGenerator } from './pdfGenerator';
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
import { QUARTERS, SUBJECT_AREAS, FUNDAMENTAL_SUBJECT_AREAS, getSubjectArea } from './subjects';



// ============================================
// INTERFACE PARA ANÁLISE POR ÁREA
// ============================================

interface AreaAnalysis {
  areaName: string;
  average: number;
  studentsEvaluated: number;
  studentsBelow6: number;
  studentsAbove8: number;
  criticalDetails: { studentName: string; subject: string; average: number }[];
  highlightDetails: { studentName: string; subject: string; average: number }[];
  subjects: string[]; // V7 Requirement
}

// ============================================
// CLASSE PRINCIPAL
// ============================================

class ClassReportPDFGenerator {
  private config: SchoolConfig;
  private analytics: AdvancedAnalyticsResult | null = null;
  private insights: InsightsReport | null = null;
  private currentClass: Class | null = null;
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
    attendance: AttendanceRecord[],
    professionalSubjects: string[] = [],
    selectedQuarter?: string
  ): Promise<void> {
    try {
      this.config = await getSchoolConfig();
      this.students = students;
      this.incidents = incidents;
      this.professionalSubjects = professionalSubjects;
      this.currentClass = cls;

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

    // Determinar se é ensino fundamental com base na série
    const series = this.currentClass?.series;
    const isFundamental = series ? (['6º', '7º', '8º', '9º'].some(s => series.includes(s)) || series.toLowerCase().includes('fundamental')) : false;

    // Incluir áreas padrão (Médio ou Fundamental) + profissional se houver
    const baseAreas = isFundamental ? FUNDAMENTAL_SUBJECT_AREAS : SUBJECT_AREAS;
    const allAreas = [...baseAreas];

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
      const areaAverage = areaGrades.length > 0
        ? areaGrades.reduce((s, g) => s + g.grade, 0) / areaGrades.length
        : 0;

      // Detalhamento Nominal de Atenção (Notas < 6,0)
      const criticalDetails: { studentName: string; subject: string; average: number }[] = [];
      areaGrades.filter(g => g.grade < 6).forEach(g => {
        const student = this.students.find(s => s.id === g.studentId);
        criticalDetails.push({
          studentName: student?.name || 'Estudante não identificado',
          subject: g.subject,
          average: g.grade
        });
      });

      // Detalhamento Nominal de Destaque (Notas >= 8,0)
      const highlightDetails: { studentName: string; subject: string; average: number }[] = [];
      areaGrades.filter(g => g.grade >= 8).forEach(g => {
        const student = this.students.find(s => s.id === g.studentId);
        highlightDetails.push({
          studentName: student?.name || 'Estudante não identificado',
          subject: g.subject,
          average: g.grade
        });
      });

      areas.push({
        areaName: area.name,
        average: areaAverage,
        studentsEvaluated: studentsInArea.length,
        studentsBelow6,
        studentsAbove8,
        criticalDetails: criticalDetails.sort((a, b) => a.average - b.average),
        highlightDetails: highlightDetails.sort((a, b) => b.average - a.average),
        subjects: area.subjects // V7 Requirement
      });
    });

    return areas;
  }

  private generateAreaNarrative(area: AreaAnalysis): Content[] {
    const contents: Content[] = [];

    // 1. Visão Geral da Área - Factual
    const statusLabel = area.average >= 7 ? 'DESTAQUE' : area.average >= 6 ? 'ESTÁVEL' : 'CRÍTICO';
    contents.push({ text: `Status: ${statusLabel} (Média ${area.average.toFixed(1)})`, bold: true, margin: [0, 0, 0, 8] });

    // 2. Registros de Atenção (Tópicos Nominais)
    if (area.criticalDetails.length > 0) {
      contents.push({ text: 'ATENÇÃO PEDAGÓGICA:', fontSize: 8, bold: true, color: PDF_COLORS.status.critico, margin: [0, 4, 0, 4] });
      const listagem = area.criticalDetails.map(d => `• ${d.studentName} (${d.subject}: ${d.average.toFixed(1)})`);
      contents.push({
        ul: listagem,
        fontSize: 9,
        margin: [0, 0, 0, 8]
      });
    }

    // 3. Consolidação de Rendimento (Tópicos Nominais)
    if (area.highlightDetails.length > 0) {
      contents.push({ text: 'INDICADORES DE CONSOLIDAÇÃO:', fontSize: 8, bold: true, color: PDF_COLORS.status.aprovado, margin: [0, 4, 0, 4] });
      const listagem = area.highlightDetails.map(d => `• ${d.studentName} (${d.subject}: ${d.average.toFixed(1)})`);
      contents.push({
        ul: listagem,
        fontSize: 9,
        margin: [0, 0, 0, 8]
      });
    } else if (area.average >= 6.5) {
      contents.push({ text: 'OBSERVAÇÃO: Desempenho linear em conformidade com os índices regulamentares.', italics: true, fontSize: 9, margin: [0, 4, 0, 0] });
    }

    return contents;
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

  private generateStudentNarrative(profile: StudentProfile): Content[] {
    const contents: Content[] = [];

    // 1. STATUS GERAL
    const label = CLASSIFICATION_LABELS[profile.classification].toUpperCase();
    contents.push({ text: `STATUS GERAL: ${label}`, bold: true, margin: [0, 0, 0, 8] });

    // 2. RENDIMENTO (Tópicos)
    if (profile.subjectsBelow6.length > 0) {
      contents.push({ text: 'VULNERABILIDADES (Abaixo de 6,0):', fontSize: 8, bold: true, color: PDF_COLORS.status.critico, margin: [0, 4, 0, 2] });
      const listagem = profile.subjectsBelow6.map(s => `• ${s.subject} (${s.average.toFixed(1)})`);
      contents.push({ ul: listagem, fontSize: 9, margin: [0, 0, 0, 8] });
    }

    // 3. CONSOLIDAÇÕES (Tópicos)
    const strengths = profile.strengths || [];
    if (strengths.length > 0) {
      contents.push({ text: 'INDICADORES DE CONSOLIDAÇÃO:', fontSize: 8, bold: true, color: PDF_COLORS.status.aprovado, margin: [0, 4, 0, 2] });
      const listagem = strengths.map(s => {
        const avg = profile.subjectAverages[s];
        return avg ? `• ${s} (${avg.toFixed(1)})` : `• ${s}`;
      });
      contents.push({ ul: listagem, fontSize: 9, margin: [0, 0, 0, 8] });
    }

    // 4. CAMPO DISCIPLINAR
    const studentIncidents = this.incidents.filter(i => i.studentIds.includes(profile.studentId));
    if (studentIncidents.length > 0) {
      const graveCount = studentIncidents.filter(i => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima').length;
      const desc = graveCount > 0
        ? `Constam ${studentIncidents.length} registros, sendo ${graveCount} de maior complexidade, requerendo alinhamento regimental.`
        : `Registram-se ${studentIncidents.length} intercorrências pontuais sob monitoramento para assegurar a conformidade.`;
      contents.push({ text: 'CAMPO DISCIPLINAR:', fontSize: 8, bold: true, margin: [0, 4, 0, 2] });
      contents.push({ text: desc, fontSize: 9, margin: [0, 0, 0, 8] });
    } else {
      contents.push({ text: 'CAMPO DISCIPLINAR: Ausência de intercorrências registradas.', fontSize: 8, bold: true, margin: [0, 4, 0, 8] });
    }

    // 5. ENCAMINHAMENTO
    const acao = profile.classification === 'critico' ?
      'Intervenção imediata e plano de recuperação individualizado.' :
      profile.classification === 'atencao' ?
        'Intensificação do suporte pedagógico nos componentes sinalizados.' :
        'Manutenção do acompanhamento regular.';

    contents.push({ text: `ENCAMINHAMENTO: ${acao}`, fontSize: 9, bold: true, margin: [0, 4, 0, 0] });

    return contents;
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
        { text: `Turma: ${cls.name} `, style: 'bodySmall', alignment: 'right', width: 'auto' },
      ],
    };
  }

  private createPageFooter(currentPage: number, pageCount: number): Content {
    return {
      margin: [40, 0, 40, 20],
      columns: [
        {
          text: `Gerado por MAVIC - Sistema de Acompanhamento Escolar em ${new Date().toLocaleDateString('pt-BR')} `,
          style: 'caption',
          alignment: 'left',
        },
        {
          text: `Página ${currentPage} de ${pageCount} `,
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
          text: `${cls.name} | Período: ${this.period} `,
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
    const gen = getPDFGenerator();

    return {
      stack: [
        { text: 'SUMÁRIO EXECUTIVO', style: 'h2', margin: [0, 0, 0, 10] },

        // Linha 1: KPIs Principais
        gen.createDashboardRow([
          gen.createKPIBox('Total de Alunos', summary.totalStudents, PDF_COLORS.primary, 'Matriculados'),
          gen.createKPIBox('Média Geral', summary.classAverage.toFixed(1), summary.classAverage >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Média Global'),
          gen.createKPIBox('Taxa de Aprovação', summary.approvalRate.toFixed(1) + '%', summary.approvalRate >= 70 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.atencao, 'Aprovados + Exc.')
        ]),

        // Linha 2: Distribuição Acadêmica (Dashboard Style)
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [[
              {
                stack: [
                  { text: 'CRÍTICO', style: 'kpiLabel', color: '#FFFFFF', alignment: 'center' },
                  { text: counts.critico.toString(), fontSize: 18, bold: true, color: '#FFFFFF', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.critico,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'ATENÇÃO', style: 'kpiLabel', color: '#000000', alignment: 'center' },
                  { text: counts.atencao.toString(), fontSize: 18, bold: true, color: '#000000', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.atencao,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'APROVADO', style: 'kpiLabel', color: '#FFFFFF', alignment: 'center' },
                  { text: counts.aprovado.toString(), fontSize: 18, bold: true, color: '#FFFFFF', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.aprovado,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'EXCELÊNCIA', style: 'kpiLabel', color: '#FFFFFF', alignment: 'center' },
                  { text: counts.excelencia.toString(), fontSize: 18, bold: true, color: '#FFFFFF', alignment: 'center' },
                ],
                fillColor: CLASSIFICATION_COLORS.excelencia,
                margin: [8, 6, 8, 6],
              },
            ]],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 15],
        },

        // Legenda e Contexto (Minimalist Box)
        {
          stack: [
            { text: 'DIRETRIZES TÉCNICAS MAVIC', fontSize: 8, bold: true, color: PDF_COLORS.secondary, margin: [0, 0, 0, 4] },
            {
              text: 'O nível CRÍTICO sinaliza vulnerabilidade em 3+ componentes; ATENÇÃO indica necessidade de suporte em 1-2 componentes; APROVADO reflete o cumprimento das metas; e EXCELÊNCIA destaca domínio pleno (Média > 8.0).',
              fontSize: 7,
              color: PDF_COLORS.tertiary,
              alignment: 'justify',
              lineHeight: 1.2
            },
          ],
          margin: [2, 0, 0, 0],
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
    // V7.3: Grouping 'Humanas', 'Natureza', 'Matemática'
    const groupedAreas = ['Ciências Humanas e suas Tecnologias', 'Ciências da Natureza e suas Tecnologias', 'Matemática e suas Tecnologias'];

    const areaContents: Content[] = [];
    areas.forEach((area, index) => {
      const isGrouped = groupedAreas.includes(area.areaName);
      const prevIsGrouped = index > 0 && groupedAreas.includes(areas[index - 1].areaName);

      if (index > 0) {
        if (isGrouped && prevIsGrouped) {
          // Minimal spacing for grouped areas
          areaContents.push({ text: '', margin: [0, 5, 0, 0] });
        } else {
          // Standard spacing
          areaContents.push({ text: '', margin: [0, 0, 0, 0] });
          areaContents.push({ text: '', margin: [0, 0, 0, 0] });
        }
      }

      // Pass 'isCompact' flag for these areas
      areaContents.push(this.buildAreaCard(area, isGrouped));
    });

    return {
      stack: [
        { text: '', margin: [0, 0, 0, 0] },
        { text: '', margin: [0, 0, 0, 0] },
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



  // ============================================
  // V7: Lógica e Layout de Alta Densidade
  // ============================================

  private buildAreaCard(area: AreaAnalysis, isCompact: boolean = false): Content {
    const gen = getPDFGenerator();

    // 1. Calcular estatísticas bimestrais para esta área
    const subjectStats = this.calculateSubjectStats(area.subjects);

    // 2. Ordenar disciplinas: Menor Desempenho Primeiro
    const rankedSubjects = [...subjectStats].sort((a, b) => a.average - b.average);

    // Dynamic Margins based on compactness
    const containerMargin = isCompact ? [0, 0, 0, 4] : [0, 0, 0, 15]; // Minimal gap between stacked areas
    const internalMargin = isCompact ? [8, 4, 8, 4] : [10, 10, 10, 10]; // Tighter internal padding
    const headerMargin = isCompact ? [0, 0, 0, 2] : [0, 0, 0, 10]; // Tighter header
    const rankingMargin = isCompact ? [0, 0, 0, 3] : [0, 0, 0, 15]; // Tighter ranking
    const titleSize = isCompact ? 13 : 18; // Smaller title for stacked format

    return ({
      table: {
        widths: ['*'],
        body: [[
          {
            stack: [
              // HEADER DA ÁREA
              {
                columns: [
                  {
                    stack: [
                      { text: area.areaName.toUpperCase(), fontSize: titleSize, bold: true, color: PDF_COLORS.primary },
                      { text: 'Análise detalhada • Ano Letivo', fontSize: 10, color: PDF_COLORS.secondary }
                    ],
                    width: '*'
                  },
                  {
                    stack: [
                      { text: 'Média Geral da Área', fontSize: 8, color: PDF_COLORS.secondary, alignment: 'right' },
                      { text: area.average.toFixed(1), fontSize: 24, bold: true, color: area.average >= 7 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, alignment: 'right' }
                    ],
                    width: 'auto'
                  }
                ],
                margin: headerMargin
              },

              // LAYOUT PRINCIPAL: RANKING (VISUAL) + TABELA (DADOS)
              {
                stack: [
                  // Seção de Ranking Visual (ALINHADA COM TABBELA)
                  { text: `Médias por Disciplina (${rankedSubjects.length} disciplina(s) analisada(s))`, style: 'h3', margin: rankingMargin },
                  {
                    columns: [
                      // Tabela Esquerda
                      {
                        table: {
                          widths: [80, 20, 50, 25],
                          body: rankedSubjects.slice(0, Math.ceil(rankedSubjects.length / 2)).map(sub => ([
                            { text: sub.name, fontSize: 8, alignment: 'left', margin: [0, 3, 0, 0] },
                            gen.createDottedLine(15),
                            { stack: [gen.createProgressBar(sub.average, 10, sub.average >= 6 ? PDF_COLORS.info : PDF_COLORS.danger)], margin: [0, 2, 0, 0] },
                            { text: sub.average.toFixed(1), fontSize: 9, bold: true, alignment: 'right' }
                          ]))
                        },
                        layout: 'noBorders'
                      },
                      // Tabela Direita (se houver items)
                      {
                        table: {
                          widths: [80, 20, 50, 25],
                          body: rankedSubjects.length > 1 ? rankedSubjects.slice(Math.ceil(rankedSubjects.length / 2)).map(sub => ([
                            { text: sub.name, fontSize: 8, alignment: 'left', margin: [0, 3, 0, 0] },
                            gen.createDottedLine(15),
                            { stack: [gen.createProgressBar(sub.average, 10, sub.average >= 6 ? PDF_COLORS.info : PDF_COLORS.danger)], margin: [0, 2, 0, 0] },
                            { text: sub.average.toFixed(1), fontSize: 9, bold: true, alignment: 'right' }
                          ])) : [[{}, {}, {}, {}]]
                        },
                        layout: 'noBorders'
                      }
                    ],
                    columnGap: 20,
                    margin: rankingMargin
                  },

                  // Tabela Bimestral de Alta Densidade
                  this.buildQuarterlyTable(rankedSubjects)
                ]
              }
            ],
            margin: internalMargin
          }
        ]]
      },
      layout: 'noBorders',
      fillColor: '#F8FAFC',
      margin: containerMargin,
      unbreakable: true
    } as unknown as Content);
  }

  private calculateSubjectStats(subjects: string[]) {
    return subjects.map(sub => {
      const subGrades = this.grades.filter(g => g.subject === sub);
      const quarters = [1, 2, 3, 4].map(q => {
        // Garantir comparação de tipos compatíveis com regex para "1", "1º", "1o"
        const qGrades = subGrades.filter(g => {
          if (!g.quarter) return false;
          // Extrair apenas o primeiro dígito numérico
          const match = String(g.quarter).match(/\d/);
          return match ? match[0] === String(q) : false;
        });
        const count = qGrades.length;
        const avg = count > 0 ? qGrades.reduce((a, b) => a + b.grade, 0) / count : 0;
        const reproved = qGrades.filter(g => g.grade < 6).length;
        const approved = count - reproved;
        return { q, avg, approved, reproved, count };
      });

      // Média anual simples dos bimestres existentes
      const validQuarters = quarters.filter(q => q.count > 0);
      const annualAvg = validQuarters.length > 0
        ? validQuarters.reduce((a, b) => a + b.avg, 0) / validQuarters.length
        : 0;

      return { name: sub, quarters, average: annualAvg };
    });
  }

  private buildQuarterlyTable(stats: any[]): Content {
    // Header Complexo
    const headerRow: TableCell[] = [
      { text: 'Disciplina', style: 'headerGroup', rowSpan: 2, margin: [0, 8, 0, 0] },
      { text: '1º Bimestre', style: 'headerGroup', colSpan: 3 }, {}, {},
      { text: '2º Bimestre', style: 'headerGroup', colSpan: 3 }, {}, {},
      { text: '3º Bimestre', style: 'headerGroup', colSpan: 3 }, {}, {},
      { text: '4º Bimestre', style: 'headerGroup', colSpan: 3 }, {}, {}
    ];

    const subHeaderRow: TableCell[] = [
      {},
      { text: 'Apr', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Rep', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Méd', style: 'tableCompact', fontSize: 7, bold: true },
      { text: 'Apr', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Rep', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Méd', style: 'tableCompact', fontSize: 7, bold: true },
      { text: 'Apr', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Rep', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Méd', style: 'tableCompact', fontSize: 7, bold: true },
      { text: 'Apr', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Rep', style: 'tableCompact', fontSize: 7, bold: true }, { text: 'Méd', style: 'tableCompact', fontSize: 7, bold: true },
    ];

    const bodyRows = stats.map((sub, idx) => {
      const row: TableCell[] = [{ text: sub.name, style: 'tableCompact', alignment: 'left', bold: true }];
      sub.quarters.forEach((q: any) => {
        row.push({ text: q.count > 0 ? q.approved : '-', style: 'tableCompact' });
        row.push({ text: q.count > 0 ? q.reproved : '-', style: 'tableCompact', color: q.reproved > 0 ? PDF_COLORS.danger : PDF_COLORS.secondary, bold: q.reproved > 0 });
        row.push({ text: q.count > 0 ? q.avg.toFixed(1) : '-', style: 'tableCompact', bold: true });
      });
      return row;
    });

    return {
      table: {
        headerRows: 2,
        widths: ['*', 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], // 12 colunas de dados + 1 nome
        body: [
          headerRow,
          subHeaderRow,
          ...bodyRows
        ]
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: (i: number) => (i === 0 || i === 13) ? 0 : (i === 1 || i === 4 || i === 7 || i === 10) ? 0.5 : 0, // Linhas verticais separando bimestres
        hLineColor: () => '#E2E8F0',
        vLineColor: () => '#CBD5E1',
        fillColor: (i: number) => i > 1 && i % 2 === 0 ? '#F8FAFC' : null, // Zebra
      }
    };
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
    // V7: Compact Student Grid
    const studentCards = sortedProfiles.map(profile => this.buildStudentCompactCard(profile));

    return {
      stack: [
        { text: 'ANÁLISE INDIVIDUAL DOS ESTUDANTES', style: 'h2', pageBreak: 'before', margin: [0, 0, 0, 15] },
        {
          stack: studentCards
        }
      ]
    };
  }

  // Novo Card Compacto (V7.4 Topificado)
  private buildStudentCompactCard(profile: StudentProfile): Content {
    const student = this.students.find(s => s.id === profile.studentId);
    const studentName = student?.name || 'Aluno Desconhecido';

    const statusColor = CLASSIFICATION_COLORS[profile.classification];
    const statusLabel = CLASSIFICATION_LABELS[profile.classification];
    const average = profile.average.toFixed(1);
    const frequency = 100; // Placeholder as attendance is disabled currently
    const reprovacoes = profile.subjectsBelow6.length;

    // Preparar Listas
    const vulnerabilities = profile.subjectsBelow6.map(s => `• ${s.subject} (${s.average.toFixed(1)})`);
    const strengths = (profile.strengths || []).map(s => {
      const avg = profile.subjectAverages[s];
      return avg ? `• ${s} (${avg.toFixed(1)})` : `• ${s}`;
    }).slice(0, 5); // Limit to top 5 to save space

    // Texto Disciplinar
    const studentIncidents = this.incidents.filter(i => i.studentIds.includes(profile.studentId));
    let incidentText = 'Ausência de intercorrências registradas.';
    if (studentIncidents.length > 0) {
      const graveCount = studentIncidents.filter(i => i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima').length;
      incidentText = graveCount > 0
        ? `Constam ${studentIncidents.length} registros, sendo ${graveCount} de maior complexidade.`
        : `Registram-se ${studentIncidents.length} intercorrências pontuais sob monitoramento.`;
    }

    // Encaminhamento
    let encaminhamento = 'Manutenção do acompanhamento regular.';
    if (profile.classification === 'critico') encaminhamento = 'Intervenção imediata e plano de recuperação individualizado.';
    if (profile.classification === 'atencao') encaminhamento = 'Intensificação do suporte pedagógico nos componentes sinalizados.';

    return {
      table: {
        widths: ['*'],
        body: [[
          {
            stack: [
              // 1. Header: NOME + STATUS
              {
                text: [
                  { text: `${studentName.toUpperCase()} `, fontSize: 9, bold: true, color: PDF_COLORS.primary },
                  { text: statusLabel.toUpperCase(), fontSize: 8, bold: true, color: statusColor }
                ],
                margin: [0, 0, 0, 2]
              },

              // 2. Métricas Lineares
              {
                text: `Média: ${average}   |   Frequência: ${frequency}%   |   Reprovações: ${reprovacoes}`,
                fontSize: 8, color: PDF_COLORS.secondary, bold: true, margin: [0, 0, 0, 4]
              },

              // 3. Status Geral (Redundante mas pedido)
              // { text: `STATUS GERAL: ${statusLabel.toUpperCase()}`, fontSize: 7, bold: true, margin: [0, 0, 0, 4] },

              // 4. Colunas de Vulnerabilidades e Indicadores
              {
                columns: [
                  // Vulnerabilidades
                  vulnerabilities.length > 0 ? {
                    stack: [
                      { text: 'VULNERABILIDADES (Abaixo de 6,0):', fontSize: 7, bold: true, color: PDF_COLORS.status.critico },
                      { ul: vulnerabilities, fontSize: 7, margin: [0, 2, 0, 0], color: '#475569' }
                    ],
                    width: '*', margin: [0, 0, 5, 0]
                  } : { text: '', width: 0 },

                  // Consolidações
                  strengths.length > 0 ? {
                    stack: [
                      { text: 'INDICADORES DE CONSOLIDAÇÃO:', fontSize: 7, bold: true, color: PDF_COLORS.status.aprovado },
                      { ul: strengths, fontSize: 7, margin: [0, 2, 0, 0], color: '#475569' }
                    ],
                    width: '*'
                  } : { text: '', width: 0 }
                ],
                columnGap: 10,
                margin: [0, 2, 0, 4]
              },

              // 5. Campo Disciplinar
              {
                text: [
                  { text: 'CAMPO DISCIPLINAR: ', fontSize: 7, bold: true },
                  { text: incidentText, fontSize: 7 }
                ],
                margin: [0, 2, 0, 2]
              },

              // 6. Encaminhamento
              {
                text: [
                  { text: 'ENCAMINHAMENTO: ', fontSize: 7, bold: true },
                  { text: encaminhamento, fontSize: 7 }
                ],
                margin: [0, 0, 0, 0]
              }

            ],
            margin: [8, 6, 8, 6]
          }
        ]]
      },
      layout: 'noBorders',
      fillColor: '#F8FAFC',
      margin: [0, 0, 0, 8],
      unbreakable: true
    } as Content;
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
