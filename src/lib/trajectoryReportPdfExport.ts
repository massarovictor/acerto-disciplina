/**
 * Relatorio de Trajetoria Estudantil - PDF Export
 * 
 * Estrutura alinhada com os demais relatorios:
 * 1. Cabecalho com identificacao
 * 2. Sumario Executivo (metricas)
 * 3. Potencialidades (destaques positivos)
 * 4. Areas de Atencao (disciplinas criticas)
 * 5. Analise por Disciplina (texto corrido qualitativo)
 * 6. Quadro de Notas (tabela)
 * 7. Avaliacoes Externas
 * 8. Historico Comportamental
 * 9. Prognostico e Recomendacoes
 */

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

import { Class, Student, Grade, Incident, HistoricalGrade, ExternalAssessment } from '@/types';
import { getSchoolConfig, getDefaultConfig, SchoolConfig } from './schoolConfig';
import { PDF_COLORS, PDF_STYLES } from './pdfGenerator';
import { linearRegression } from './mlAnalytics';

// pdfMake sera carregado dinamicamente
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
// INTERFACES
// ============================================

interface SubjectTrajectory {
    subject: string;
    fundGrades: { year: number; grade: number }[];
    emGrades: { year: number; grade: number }[];
    allGrades: number[];
    average: number;
    fundAverage: number;
    emAverage: number;
    trend: 'ascending' | 'stable' | 'descending';
    transitionDiff: number;
}

// ============================================
// CLASSE PRINCIPAL
// ============================================

class TrajectoryReportPDFGenerator {
    private config: SchoolConfig;
    private student: Student | null = null;
    private studentClass: Class | undefined;
    private historicalGrades: HistoricalGrade[] = [];
    private regularGrades: Grade[] = [];
    private externalAssessments: ExternalAssessment[] = [];
    private incidents: Incident[] = [];
    private subjectTrajectories: SubjectTrajectory[] = [];

    constructor() {
        this.config = getDefaultConfig();
    }

    async generate(
        student: Student,
        studentClass: Class | undefined,
        historicalGrades: HistoricalGrade[],
        regularGrades: Grade[],
        externalAssessments: ExternalAssessment[],
        incidents: Incident[]
    ): Promise<void> {
        try {
            this.config = await getSchoolConfig();
            this.student = student;
            this.studentClass = studentClass;
            this.historicalGrades = historicalGrades.filter(g => g.studentId === student.id);
            this.regularGrades = regularGrades.filter(g => g.studentId === student.id);
            this.externalAssessments = externalAssessments.filter(e => e.studentId === student.id);
            this.incidents = incidents.filter(i => i.studentIds.includes(student.id));

            // Analisar disciplinas
            this.analyzeSubjects();

            // Construir documento
            const content = this.buildDocumentContent();
            const docDefinition = this.createDocDefinition(content);

            // Download
            const safeName = (student.name || 'Aluno').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `Trajetoria_${safeName}.pdf`;

            const pdfMake = await getPdfMake();
            pdfMake.createPdf(docDefinition).download(filename);
        } catch (error) {
            console.error('Erro ao gerar relatorio de trajetoria:', error);
            throw error;
        }
    }

    private createDocDefinition(content: Content[]): TDocumentDefinitions {
        return {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            header: (currentPage: number) => this.createPageHeader(currentPage),
            footer: (currentPage: number, pageCount: number) => this.createPageFooter(currentPage, pageCount),
            content,
            styles: PDF_STYLES,
            defaultStyle: { fontSize: 10 },
        };
    }

    private createPageHeader(currentPage: number): Content {
        if (currentPage === 1) {
            return {
                margin: [40, 20, 40, 10] as [number, number, number, number],
                stack: [
                    { text: this.config.schoolName.toUpperCase(), fontSize: 12, alignment: 'center' as const, color: PDF_COLORS.secondary, margin: [0, 0, 0, 5] as [number, number, number, number] },
                ],
            };
        }

        return {
            margin: [40, 20, 40, 10] as [number, number, number, number],
            columns: [
                { text: this.config.schoolName, style: 'bodySmall', width: '*' },
                { text: `Aluno: ${this.student?.name || ''}`, style: 'bodySmall', alignment: 'right' as const, width: 'auto' },
            ],
        };
    }

    private createPageFooter(currentPage: number, pageCount: number): Content {
        return {
            margin: [40, 0, 40, 20] as [number, number, number, number],
            columns: [
                {
                    text: `Gerado por MAVIC - Sistema de Acompanhamento Escolar em ${new Date().toLocaleDateString('pt-BR')}`,
                    style: 'caption',
                    alignment: 'left' as const,
                },
                {
                    text: `Pagina ${currentPage} de ${pageCount}`,
                    style: 'caption',
                    alignment: 'right' as const,
                },
            ],
        };
    }

    // ============================================
    // ANALISE
    // ============================================

    private analyzeSubjects(): void {
        const subjectMap = new Map<string, SubjectTrajectory>();

        // Processar notas do fundamental
        this.historicalGrades.forEach(g => {
            if (!subjectMap.has(g.subject)) {
                subjectMap.set(g.subject, this.createEmptyTrajectory(g.subject));
            }
            const traj = subjectMap.get(g.subject)!;
            traj.fundGrades.push({ year: g.gradeYear, grade: g.grade });
            traj.allGrades.push(g.grade);
        });

        // Processar notas do medio (agregar por ano)
        const emBySubjectYear = new Map<string, Map<number, number[]>>();
        this.regularGrades.forEach(g => {
            const year = g.schoolYear || 1;
            if (!emBySubjectYear.has(g.subject)) {
                emBySubjectYear.set(g.subject, new Map());
            }
            const yearMap = emBySubjectYear.get(g.subject)!;
            if (!yearMap.has(year)) {
                yearMap.set(year, []);
            }
            yearMap.get(year)!.push(g.grade);
        });

        emBySubjectYear.forEach((yearMap, subject) => {
            if (!subjectMap.has(subject)) {
                subjectMap.set(subject, this.createEmptyTrajectory(subject));
            }
            const traj = subjectMap.get(subject)!;
            yearMap.forEach((grades, year) => {
                const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
                traj.emGrades.push({ year, grade: avg });
                traj.allGrades.push(avg);
            });
        });

        // Calcular estatisticas
        subjectMap.forEach(traj => {
            if (traj.allGrades.length > 0) {
                traj.average = traj.allGrades.reduce((a, b) => a + b, 0) / traj.allGrades.length;
            }
            if (traj.fundGrades.length > 0) {
                traj.fundAverage = traj.fundGrades.reduce((s, g) => s + g.grade, 0) / traj.fundGrades.length;
            }
            if (traj.emGrades.length > 0) {
                traj.emAverage = traj.emGrades.reduce((s, g) => s + g.grade, 0) / traj.emGrades.length;
            }

            // Tendencia
            if (traj.allGrades.length >= 2) {
                const x = traj.allGrades.map((_, i) => i);
                const reg = linearRegression(x, traj.allGrades);
                if (reg.slope > 0.15) traj.trend = 'ascending';
                else if (reg.slope < -0.15) traj.trend = 'descending';
            }

            // Diferenca na transicao
            if (traj.fundAverage > 0 && traj.emAverage > 0) {
                traj.transitionDiff = traj.emAverage - traj.fundAverage;
            }
        });

        this.subjectTrajectories = Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
    }

    private createEmptyTrajectory(subject: string): SubjectTrajectory {
        return {
            subject,
            fundGrades: [],
            emGrades: [],
            allGrades: [],
            average: 0,
            fundAverage: 0,
            emAverage: 0,
            trend: 'stable',
            transitionDiff: 0,
        };
    }

    private calculateOverallStats() {
        const fundGrades = this.historicalGrades.map(g => g.grade);
        const emGrades = this.regularGrades.map(g => g.grade);
        const allGrades = [...fundGrades, ...emGrades];

        const fundAvg = fundGrades.length > 0 ? fundGrades.reduce((a, b) => a + b, 0) / fundGrades.length : 0;
        const emAvg = emGrades.length > 0 ? emGrades.reduce((a, b) => a + b, 0) / emGrades.length : 0;
        const overallAvg = allGrades.length > 0 ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0;

        let trend: 'ascending' | 'stable' | 'descending' = 'stable';
        if (allGrades.length >= 2) {
            const x = allGrades.map((_, i) => i);
            const reg = linearRegression(x, allGrades);
            if (reg.slope > 0.15) trend = 'ascending';
            else if (reg.slope < -0.15) trend = 'descending';
        }

        return { fundAvg, emAvg, overallAvg, trend, totalGrades: allGrades.length };
    }

    // ============================================
    // CONSTRUCAO DO DOCUMENTO
    // ============================================

    private buildDocumentContent(): Content[] {
        const content: Content[] = [];

        content.push(this.buildTitleSection());
        content.push(this.buildExecutiveSummary());
        content.push(this.buildPotencialidadesSection());
        content.push(this.buildAreasAtencaoSection());
        content.push(this.buildGradesTableSection());
        content.push(this.buildSubjectAnalysisSection());

        if (this.externalAssessments.length > 0) {
            content.push(this.buildExternalSection());
        }

        content.push(this.buildBehaviorSection());
        content.push(this.buildPrognosticSection());

        return content;
    }

    // ============================================
    // SECOES
    // ============================================

    private buildTitleSection(): Content {
        return {
            stack: [
                { text: 'RELATORIO DE TRAJETORIA ESTUDANTIL', style: 'h2', alignment: 'center' as const, margin: [0, 10, 0, 15] as [number, number, number, number] },
                {
                    table: {
                        widths: ['auto', '*', 'auto', '*'],
                        body: [[
                            { text: 'Aluno:', bold: true, border: [false, false, false, false] },
                            { text: this.student?.name || 'N/A', border: [false, false, false, true] },
                            { text: 'Turma:', bold: true, border: [false, false, false, false] },
                            { text: this.studentClass?.name || 'N/A', border: [false, false, false, true] },
                        ]] as TableCell[][],
                    },
                    layout: 'noBorders',
                    margin: [0, 0, 0, 15] as [number, number, number, number],
                },
            ],
        };
    }

    private buildExecutiveSummary(): Content {
        const stats = this.calculateOverallStats();

        const trendText = stats.trend === 'ascending' ? 'Ascendente'
            : stats.trend === 'descending' ? 'Descendente'
                : 'Estavel';

        const trendColor = stats.trend === 'ascending' ? PDF_COLORS.status.aprovado
            : stats.trend === 'descending' ? PDF_COLORS.status.critico
                : PDF_COLORS.status.atencao;

        const transitionDiff = stats.fundAvg > 0 && stats.emAvg > 0 ? stats.emAvg - stats.fundAvg : 0;
        const transitionText = transitionDiff > 0.5 ? `+${transitionDiff.toFixed(1)} pts`
            : transitionDiff < -0.5 ? `${transitionDiff.toFixed(1)} pts`
                : 'Estavel';

        return {
            stack: [
                { text: 'SUMARIO EXECUTIVO', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                {
                    table: {
                        widths: ['*', '*', '*', '*', '*'],
                        body: [[
                            { text: [{ text: 'Media Geral\n', fontSize: 8, color: PDF_COLORS.secondary }, { text: stats.overallAvg.toFixed(1), fontSize: 16, bold: true, color: stats.overallAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico }], alignment: 'center' as const, border: [true, true, true, true] },
                            { text: [{ text: 'Fundamental\n', fontSize: 8, color: PDF_COLORS.secondary }, { text: stats.fundAvg > 0 ? stats.fundAvg.toFixed(1) : '-', fontSize: 16, bold: true, color: '#8e44ad' }], alignment: 'center' as const, border: [true, true, true, true] },
                            { text: [{ text: 'Ens. Medio\n', fontSize: 8, color: PDF_COLORS.secondary }, { text: stats.emAvg > 0 ? stats.emAvg.toFixed(1) : '-', fontSize: 16, bold: true, color: '#3498db' }], alignment: 'center' as const, border: [true, true, true, true] },
                            { text: [{ text: 'Tendencia\n', fontSize: 8, color: PDF_COLORS.secondary }, { text: trendText, fontSize: 12, bold: true, color: trendColor }], alignment: 'center' as const, border: [true, true, true, true] },
                            { text: [{ text: 'Transicao\n', fontSize: 8, color: PDF_COLORS.secondary }, { text: transitionText, fontSize: 12, bold: true }], alignment: 'center' as const, border: [true, true, true, true] },
                        ]] as TableCell[][],
                    },
                    layout: {
                        hLineColor: () => PDF_COLORS.border,
                        vLineColor: () => PDF_COLORS.border,
                        paddingTop: () => 8,
                        paddingBottom: () => 8,
                    },
                },
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        };
    }

    private buildPotencialidadesSection(): Content {
        const strengths = this.subjectTrajectories.filter(t => t.average >= 7).sort((a, b) => b.average - a.average);

        if (strengths.length === 0) {
            return {
                stack: [
                    { text: 'POTENCIALIDADES', style: 'h3', color: PDF_COLORS.status.aprovado, margin: [0, 0, 0, 10] as [number, number, number, number] },
                    { text: 'Nenhuma disciplina com media acima de 7,0 identificada ate o momento. O aluno pode desenvolver potencialidades com acompanhamento adequado.', fontSize: 9, italics: true, color: PDF_COLORS.tertiary },
                ],
                margin: [0, 0, 0, 15] as [number, number, number, number],
            };
        }

        const studentName = this.student?.name?.split(' ')[0] || 'O(a) aluno(a)';
        const topStrengths = strengths.slice(0, 4);
        const disciplinasList = topStrengths.map(s => `${s.subject} (${s.average.toFixed(1)})`).join(', ');

        let narrative = `${studentName} demonstra excelente desempenho em: ${disciplinasList}. `;

        // Adicionar contexto sobre tendencias positivas
        const ascending = topStrengths.filter(s => s.trend === 'ascending');
        if (ascending.length > 0) {
            narrative += `Destaque para ${ascending.map(s => s.subject).join(' e ')}, onde ha tendencia de melhora continua ao longo da trajetoria. `;
        }

        // Transicao positiva
        const positiveTransition = topStrengths.filter(s => s.transitionDiff > 0.5);
        if (positiveTransition.length > 0) {
            narrative += `Em ${positiveTransition.map(s => s.subject).join(' e ')}, houve melhora significativa na transicao para o ensino medio.`;
        }

        return {
            stack: [
                { text: 'POTENCIALIDADES', style: 'h3', color: PDF_COLORS.status.aprovado, margin: [0, 0, 0, 10] as [number, number, number, number] },
                { text: narrative, fontSize: 10, alignment: 'justify' as const, lineHeight: 1.4 },
            ],
            margin: [0, 0, 0, 15] as [number, number, number, number],
        };
    }

    private buildAreasAtencaoSection(): Content {
        const weaknesses = this.subjectTrajectories.filter(t => t.average < 6).sort((a, b) => a.average - b.average);

        if (weaknesses.length === 0) {
            return {
                stack: [
                    { text: 'AREAS DE ATENCAO', style: 'h3', color: PDF_COLORS.status.critico, margin: [0, 0, 0, 10] as [number, number, number, number] },
                    { text: 'Parabens! Nenhuma disciplina com media abaixo de 6,0. O aluno mantem desempenho satisfatorio em todas as materias avaliadas.', fontSize: 9, italics: true, color: PDF_COLORS.tertiary },
                ],
                margin: [0, 0, 0, 15] as [number, number, number, number],
            };
        }

        const studentName = this.student?.name?.split(' ')[0] || 'O(a) aluno(a)';
        const criticalList = weaknesses.slice(0, 4);
        const disciplinasList = criticalList.map(s => `${s.subject} (${s.average.toFixed(1)})`).join(', ');

        let narrative = `${studentName} apresenta dificuldades em: ${disciplinasList}. `;

        // Tendencias negativas
        const descending = criticalList.filter(s => s.trend === 'descending');
        if (descending.length > 0) {
            narrative += `Em ${descending.map(s => s.subject).join(' e ')}, observa-se tendencia de queda, requerendo intervencao imediata. `;
        }

        // Transicao negativa
        const negativeTransition = criticalList.filter(s => s.transitionDiff < -0.5);
        if (negativeTransition.length > 0) {
            narrative += `A transicao para o ensino medio foi desafiadora em ${negativeTransition.map(s => s.subject).join(' e ')}, com queda significativa de desempenho. `;
        }

        narrative += `Recomenda-se acompanhamento pedagogico individualizado nestas areas.`;

        return {
            stack: [
                { text: 'AREAS DE ATENCAO', style: 'h3', color: PDF_COLORS.status.critico, margin: [0, 0, 0, 10] as [number, number, number, number] },
                { text: narrative, fontSize: 10, alignment: 'justify' as const, lineHeight: 1.4 },
            ],
            margin: [0, 0, 0, 15] as [number, number, number, number],
        };
    }

    private buildSubjectAnalysisSection(): Content {
        if (this.subjectTrajectories.length === 0) {
            return {
                stack: [
                    { text: 'ANALISE POR DISCIPLINA', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                    { text: 'Nenhuma nota registrada para analise detalhada.', fontSize: 9, italics: true, color: PDF_COLORS.tertiary },
                ],
                margin: [0, 0, 0, 20] as [number, number, number, number],
            };
        }

        const narratives: Content[] = this.subjectTrajectories.map(traj => ({
            stack: [
                { text: traj.subject.toUpperCase(), fontSize: 10, bold: true, color: PDF_COLORS.primary, margin: [0, 8, 0, 3] as [number, number, number, number] },
                { text: this.generateDetailedNarrative(traj), fontSize: 9, alignment: 'justify' as const, lineHeight: 1.3 },
            ],
        }));

        return {
            stack: [
                { text: 'ANALISE POR DISCIPLINA', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                ...narratives,
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        };
    }

    private generateDetailedNarrative(traj: SubjectTrajectory): string {
        const studentName = this.student?.name?.split(' ')[0] || 'O(a) estudante';
        const parts: string[] = [];

        // Situacao atual
        if (traj.average >= 8) {
            parts.push(`${studentName} apresenta excelente desempenho em ${traj.subject}, com media de ${traj.average.toFixed(1)}, demonstrando dominio consistente dos conteudos.`);
        } else if (traj.average >= 6) {
            parts.push(`${studentName} apresenta desempenho satisfatorio em ${traj.subject}, com media de ${traj.average.toFixed(1)}, atendendo aos requisitos minimos.`);
        } else {
            parts.push(`${studentName} apresenta dificuldades em ${traj.subject}, com media de ${traj.average.toFixed(1)}, abaixo do minimo esperado de 6,0.`);
        }

        // Fundamental
        if (traj.fundGrades.length > 0) {
            const anos = [...new Set(traj.fundGrades.map(g => g.year))].sort().map(y => `${y}o ano`).join(', ');
            parts.push(`No ensino fundamental (${anos}), a media foi de ${traj.fundAverage.toFixed(1)}.`);
        }

        // Medio
        if (traj.emGrades.length > 0) {
            const anos = [...new Set(traj.emGrades.map(g => g.year))].sort().map(y => `${y}o ano`).join(', ');
            parts.push(`No ensino medio (${anos}), a media e de ${traj.emAverage.toFixed(1)}.`);
        }

        // Transicao
        if (traj.fundGrades.length > 0 && traj.emGrades.length > 0) {
            if (traj.transitionDiff > 0.5) {
                parts.push(`A transicao para o ensino medio foi positiva, com melhora de ${traj.transitionDiff.toFixed(1)} pontos.`);
            } else if (traj.transitionDiff < -0.5) {
                parts.push(`A transicao para o ensino medio apresentou queda de ${Math.abs(traj.transitionDiff).toFixed(1)} pontos, sugerindo necessidade de adaptacao.`);
            } else {
                parts.push(`A transicao para o ensino medio ocorreu de forma estavel.`);
            }
        }

        // Tendencia
        if (traj.allGrades.length >= 3) {
            if (traj.trend === 'ascending') {
                parts.push(`Tendencia: melhora progressiva ao longo da trajetoria, indicando evolucao positiva.`);
            } else if (traj.trend === 'descending') {
                parts.push(`Tendencia: queda de desempenho ao longo da trajetoria, requerendo atencao especial.`);
            } else {
                parts.push(`Tendencia: desempenho estavel ao longo dos anos.`);
            }
        }

        return parts.join(' ');
    }

    private buildGradesTableSection(): Content {
        if (this.subjectTrajectories.length === 0) {
            return { text: '' };
        }

        const headerRow: TableCell[] = [
            { text: 'Disciplina', bold: true, fillColor: PDF_COLORS.background.light, fontSize: 9 },
            { text: '6o', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: '7o', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: '8o', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: '9o', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: '1oEM', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: '2oEM', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: '3oEM', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: 'Med', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
        ];

        const dataRows: TableCell[][] = this.subjectTrajectories.map(traj => {
            const row: TableCell[] = [{ text: traj.subject, fontSize: 8 }];

            [6, 7, 8, 9].forEach(year => {
                const found = traj.fundGrades.find(g => g.year === year);
                row.push(found
                    ? { text: found.grade.toFixed(1), alignment: 'center' as const, fontSize: 8, color: found.grade >= 6 ? PDF_COLORS.primary : PDF_COLORS.status.critico }
                    : { text: '-', alignment: 'center' as const, fontSize: 8, color: PDF_COLORS.tertiary }
                );
            });

            [1, 2, 3].forEach(year => {
                const found = traj.emGrades.find(g => g.year === year);
                row.push(found
                    ? { text: found.grade.toFixed(1), alignment: 'center' as const, fontSize: 8, color: found.grade >= 6 ? PDF_COLORS.primary : PDF_COLORS.status.critico }
                    : { text: '-', alignment: 'center' as const, fontSize: 8, color: PDF_COLORS.tertiary }
                );
            });

            row.push({
                text: traj.average.toFixed(1),
                alignment: 'center' as const,
                fontSize: 8,
                bold: true,
                color: traj.average >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico,
            });

            return row;
        });

        return {
            stack: [
                { text: 'QUADRO DE NOTAS', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 26, 26, 26, 26, 30, 30, 30, 28],
                        body: [headerRow, ...dataRows],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => PDF_COLORS.border,
                        vLineColor: () => PDF_COLORS.border,
                        fillColor: (rowIndex: number) => rowIndex % 2 === 0 ? null : '#f8f9fa',
                        paddingTop: () => 3,
                        paddingBottom: () => 3,
                        paddingLeft: () => 3,
                        paddingRight: () => 3,
                    },
                },
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        };
    }

    private buildExternalSection(): Content {
        const headerRow: TableCell[] = [
            { text: 'Avaliacao', bold: true, fillColor: PDF_COLORS.background.light, fontSize: 9 },
            { text: 'Tipo', bold: true, fillColor: PDF_COLORS.background.light, fontSize: 9 },
            { text: 'Disciplina', bold: true, fillColor: PDF_COLORS.background.light, fontSize: 9 },
            { text: 'Nota', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: 'Max', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
            { text: 'Nivel', bold: true, fillColor: PDF_COLORS.background.light, alignment: 'center' as const, fontSize: 9 },
        ];

        const dataRows: TableCell[][] = this.externalAssessments.map(e => [
            { text: e.assessmentName || '-', fontSize: 8 },
            { text: e.assessmentType || '-', fontSize: 8 },
            { text: e.subject || 'Geral', fontSize: 8 },
            { text: String(e.score), fontSize: 8, alignment: 'center' as const },
            { text: String(e.maxScore), fontSize: 8, alignment: 'center' as const },
            { text: e.proficiencyLevel || '-', fontSize: 8, alignment: 'center' as const },
        ]);

        return {
            stack: [
                { text: 'AVALIACOES EXTERNAS', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                { text: `Total de ${this.externalAssessments.length} avaliacao(oes) externa(s) registrada(s).`, fontSize: 9, color: PDF_COLORS.secondary, margin: [0, 0, 0, 5] as [number, number, number, number] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 55, 60, 35, 35, 50],
                        body: [headerRow, ...dataRows],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => PDF_COLORS.border,
                        vLineColor: () => PDF_COLORS.border,
                        paddingTop: () => 3,
                        paddingBottom: () => 3,
                    },
                },
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        };
    }

    private buildBehaviorSection(): Content {
        if (this.incidents.length === 0) {
            return {
                stack: [
                    { text: 'HISTORICO COMPORTAMENTAL', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                    { text: 'Nenhuma ocorrencia registrada para este aluno. Comportamento exemplar ao longo da trajetoria.', fontSize: 9, italics: true, color: PDF_COLORS.tertiary },
                ],
                margin: [0, 0, 0, 20] as [number, number, number, number],
            };
        }

        const SEVERITY_LABELS: Record<string, string> = {
            leve: 'Leve', intermediaria: 'Intermediaria', grave: 'Grave', gravissima: 'Gravissima',
        };

        const severityCounts: Record<string, number> = { leve: 0, intermediaria: 0, grave: 0, gravissima: 0 };
        this.incidents.forEach(i => {
            if (severityCounts[i.finalSeverity] !== undefined) {
                severityCounts[i.finalSeverity]++;
            }
        });

        const incidentsList = this.incidents.slice(0, 5).map(i => ({
            text: `- ${new Date(i.date).toLocaleDateString('pt-BR')} (${SEVERITY_LABELS[i.finalSeverity] || i.finalSeverity}): ${(i.description || 'Sem descricao').substring(0, 80)}${(i.description || '').length > 80 ? '...' : ''}`,
            fontSize: 9,
            margin: [0, 2, 0, 0] as [number, number, number, number],
        }));

        const moreText = this.incidents.length > 5
            ? [{ text: `... e mais ${this.incidents.length - 5} ocorrencia(s).`, fontSize: 9, italics: true, color: PDF_COLORS.tertiary, margin: [0, 5, 0, 0] as [number, number, number, number] }]
            : [];

        return {
            stack: [
                { text: 'HISTORICO COMPORTAMENTAL', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                {
                    text: `Total de ${this.incidents.length} ocorrencia(s): ${severityCounts.leve} leve(s), ${severityCounts.intermediaria} intermediaria(s), ${severityCounts.grave} grave(s), ${severityCounts.gravissima} gravissima(s).`,
                    fontSize: 9,
                    margin: [0, 0, 0, 10] as [number, number, number, number],
                },
                ...incidentsList,
                ...moreText,
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        };
    }

    private buildPrognosticSection(): Content {
        const stats = this.calculateOverallStats();
        const studentName = this.student?.name?.split(' ')[0] || 'O(a) estudante';

        const paragraphs: string[] = [];

        // Visao geral
        if (stats.totalGrades > 0) {
            paragraphs.push(`${studentName} apresenta media geral de ${stats.overallAvg.toFixed(1)} ao longo de sua trajetoria academica, considerando ${stats.totalGrades} avaliacoes registradas.`);
        } else {
            paragraphs.push(`Dados insuficientes para analise completa da trajetoria.`);
        }

        // Transicao
        if (stats.fundAvg > 0 && stats.emAvg > 0) {
            const diff = stats.emAvg - stats.fundAvg;
            if (diff > 0.5) {
                paragraphs.push(`A transicao do ensino fundamental para o ensino medio foi positiva, com melhora de ${diff.toFixed(1)} pontos na media, indicando boa adaptacao ao novo nivel de ensino.`);
            } else if (diff < -0.5) {
                paragraphs.push(`A transicao para o ensino medio apresentou queda de ${Math.abs(diff).toFixed(1)} pontos, sugerindo que ${studentName} pode necessitar de suporte adicional.`);
            } else {
                paragraphs.push(`A transicao para o ensino medio ocorreu de forma estavel, mantendo o padrao de desempenho.`);
            }
        }

        // Tendencia e recomendacao
        if (stats.trend === 'ascending') {
            paragraphs.push(`A tendencia geral e de melhoria continua. Recomendacao: manter estimulo e considerar para projetos especiais ou olimpiadas.`);
        } else if (stats.trend === 'descending') {
            paragraphs.push(`A tendencia de queda requer atencao especial. Recomendacao: elaborar plano de recuperacao individualizado e convocar responsaveis.`);
        } else {
            paragraphs.push(`O desempenho tem se mantido estavel. Recomendacao: manter acompanhamento regular.`);
        }

        // Comportamento
        if (this.incidents.length > 5) {
            paragraphs.push(`O numero elevado de ocorrencias (${this.incidents.length}) pode estar impactando o desempenho academico. Sugere-se trabalho conjunto entre familia e escola.`);
        }

        return {
            stack: [
                { text: 'PROGNOSTICO E RECOMENDACOES', style: 'h3', margin: [0, 0, 0, 10] as [number, number, number, number] },
                ...paragraphs.map(p => ({
                    text: p,
                    fontSize: 9,
                    alignment: 'justify' as const,
                    lineHeight: 1.4,
                    margin: [0, 0, 0, 8] as [number, number, number, number],
                })),
            ],
        };
    }
}

// ============================================
// FUNCAO EXPORTADA
// ============================================

export async function generateTrajectoryReportPDF(
    student: Student,
    studentClass: Class | undefined,
    historicalGrades: HistoricalGrade[],
    regularGrades: Grade[],
    externalAssessments: ExternalAssessment[],
    incidents: Incident[]
): Promise<void> {
    const generator = new TrajectoryReportPDFGenerator();
    await generator.generate(student, studentClass, historicalGrades, regularGrades, externalAssessments, incidents);
}
