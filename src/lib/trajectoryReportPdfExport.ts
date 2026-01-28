/**
 * Relatório de Trajetória Estudantil - Versão V5.1 (Topicalizada e Robusta)
 * 
 * Estrutura:
 * 1. Sumário Executivo
 * 2. Indicadores de Consolidação (Topicalizado)
 * 3. Indicadores de Atenção (Topicalizado)
 * 4. Análise por Disciplina (Topicalizado)
 * 5. Quadro de Notas (Tabela)
 * 6. Histórico Comportamental e Prognóstico
 */

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { Class, Student, Grade, Incident, HistoricalGrade, ExternalAssessment } from '@/types';
import { getSchoolConfig, getDefaultConfig, SchoolConfig } from './schoolConfig';
import { PDF_COLORS, PDF_STYLES, getPdfMake, getPDFGenerator, PDFGenerator } from './pdfGenerator';
import { linearRegression } from './mlAnalytics';

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
            this.historicalGrades = historicalGrades.filter(g => String(g.studentId) === String(student.id));
            this.regularGrades = regularGrades.filter(g => String(g.studentId) === String(student.id));
            this.externalAssessments = externalAssessments.filter(e => String(e.studentId) === String(student.id));
            this.incidents = incidents.filter(i => i.studentIds.includes(student.id));

            this.analyzeSubjects();

            const content = this.buildDocumentContent();
            const docDefinition = this.createDocDefinition(content);

            const pdfMake = await getPdfMake();
            const safeName = (student.name || 'Aluno').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            pdfMake.createPdf(docDefinition).download(`Trajetoria_${safeName}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar relatório de trajetória:', error);
            throw error;
        }
    }

    private createDocDefinition(content: Content[]): TDocumentDefinitions {
        return {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            header: (currentPage) => this.createPageHeader(currentPage),
            footer: (currentPage, pageCount) => this.createPageFooter(currentPage, pageCount),
            content,
            styles: PDF_STYLES,
            defaultStyle: { fontSize: 10 },
        };
    }

    private createPageHeader(currentPage: number): Content {
        const schoolName = this.config?.schoolName || 'Escola';
        if (currentPage === 1) {
            return {
                margin: [40, 20, 40, 10],
                stack: [{ text: schoolName.toUpperCase(), fontSize: 12, alignment: 'center', color: PDF_COLORS.secondary, margin: [0, 0, 0, 5] }]
            };
        }
        return {
            margin: [40, 20, 40, 10],
            columns: [
                { text: schoolName, style: 'bodySmall', width: '*' },
                { text: `Trajetória: ${this.student?.name || ''}`, style: 'bodySmall', alignment: 'right', width: 'auto' }
            ]
        };
    }

    private createPageFooter(currentPage: number, pageCount: number): Content {
        return {
            margin: [40, 0, 40, 20],
            columns: [
                { text: `Gerado por MAVIC em ${new Date().toLocaleDateString('pt-BR')}`, style: 'caption', alignment: 'left' },
                { text: `Página ${currentPage} de ${pageCount}`, style: 'caption', alignment: 'right' }
            ]
        };
    }

    private analyzeSubjects(): void {
        const subjectMap = new Map<string, SubjectTrajectory>();

        // Helper to get or create trajectory (keyed by normalized name)
        const getTraj = (subject: string) => {
            const key = this.normalizeSubjectName(subject);
            if (!subjectMap.has(key)) {
                subjectMap.set(key, this.createEmptyTrajectory(subject)); // Use original case as initial display name
            }
            return subjectMap.get(key)!;
        };

        // 1. Group Historical Grades (Fundamental)
        this.historicalGrades.forEach(g => {
            const traj = getTraj(g.subject);
            // Search if we already have this year/grade recorded?
            // Actually, we can just accumulate raw grades then average per year later for the Trajectory object
            // But the Trajectory object structure expects pre-averaged years? 
            // "fundGrades: { year: number; grade: number }[];"
            // Let's re-aggregate internally here.

            // Note: The previous logic did a double-pass (Group by Subject/Year -> Average -> Traj). 
            // We can simplify or replicate that.
            // Let's blindly push raw grades to a temporary holder on the Trajectory? 
            // Or just stick to the previous pattern but using normalized keys.
        });

        // Let's stick to the previous pattern but with normalized keys.
        const fundBySubjectYear = new Map<string, Map<number, number[]>>();
        this.historicalGrades.forEach(g => {
            const key = this.normalizeSubjectName(g.subject);
            if (!fundBySubjectYear.has(key)) fundBySubjectYear.set(key, new Map());
            const yearMap = fundBySubjectYear.get(key)!;
            if (!yearMap.has(g.gradeYear)) yearMap.set(g.gradeYear, []);
            yearMap.get(g.gradeYear)!.push(g.grade);
        });

        fundBySubjectYear.forEach((yearMap, normalizedSubject) => {
            // We need a display name. We can find it from the grades or the subjectMap if it exists?
            // We haven't populated subjectMap yet. Let's find a display name from historicalGrades.
            const sample = this.historicalGrades.find(g => this.normalizeSubjectName(g.subject) === normalizedSubject);
            const displayName = sample ? sample.subject : normalizedSubject;

            if (!subjectMap.has(normalizedSubject)) subjectMap.set(normalizedSubject, this.createEmptyTrajectory(displayName));
            const traj = subjectMap.get(normalizedSubject)!;

            yearMap.forEach((grades, year) => {
                const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
                traj.fundGrades.push({ year, grade: avg });
                traj.allGrades.push(avg); // Use avg for smoother trend
            });
        });

        // 2. Group Regular Grades (High School)
        const emBySubjectYear = new Map<string, Map<number, number[]>>();
        this.regularGrades.forEach(g => {
            const key = this.normalizeSubjectName(g.subject);
            const year = g.schoolYear || 1;
            if (!emBySubjectYear.has(key)) emBySubjectYear.set(key, new Map());
            const yearMap = emBySubjectYear.get(key)!;
            if (!yearMap.has(year)) yearMap.set(year, []);
            yearMap.get(year)!.push(g.grade);
        });

        emBySubjectYear.forEach((yearMap, normalizedSubject) => {
            // Find display name
            const sample = this.regularGrades.find(g => this.normalizeSubjectName(g.subject) === normalizedSubject);
            const displayName = sample ? sample.subject : normalizedSubject;

            if (!subjectMap.has(normalizedSubject)) subjectMap.set(normalizedSubject, this.createEmptyTrajectory(displayName));
            const traj = subjectMap.get(normalizedSubject)!;

            yearMap.forEach((grades, year) => {
                const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
                traj.emGrades.push({ year, grade: avg });
                traj.allGrades.push(avg);
            });
        });

        // 3. Calculate Derived Metrics
        subjectMap.forEach(traj => {
            if (traj.allGrades.length > 0) traj.average = traj.allGrades.reduce((a, b) => a + b, 0) / traj.allGrades.length;
            if (traj.fundGrades.length > 0) traj.fundAverage = traj.fundGrades.reduce((s, g) => s + g.grade, 0) / traj.fundGrades.length;
            if (traj.emGrades.length > 0) traj.emAverage = traj.emGrades.reduce((s, g) => s + g.grade, 0) / traj.emGrades.length;

            if (traj.allGrades.length >= 2) {
                const x = traj.allGrades.map((_, i) => i);
                const reg = linearRegression(x, traj.allGrades);
                if (reg.slope > 0.15) traj.trend = 'ascending';
                else if (reg.slope < -0.15) traj.trend = 'descending';
            }

            if (traj.fundAverage > 0 && traj.emAverage > 0) traj.transitionDiff = traj.emAverage - traj.fundAverage;
        });

        this.subjectTrajectories = Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
    }

    private createEmptyTrajectory(subject: string): SubjectTrajectory {
        return { subject, fundGrades: [], emGrades: [], allGrades: [], average: 0, fundAverage: 0, emAverage: 0, trend: 'stable', transitionDiff: 0 };
    }

    private buildDocumentContent(): Content[] {
        return [
            this.buildTitleSection(),
            this.buildStudentInfoSection(), // V7 Dashboard Header
            this.buildFundamentalHistorySection(),
            this.buildHighSchoolHistorySection(),
            this.buildExternalAssessmentsSection(),
            this.buildLongitudinalChart(), // Phase 19: Longitudinal Graph
            this.buildNarrativeSection(), // V7.4 Topicalized
        ];
    }

    private buildTitleSection(): Content {
        return {
            text: 'RELATÓRIO DE TRAJETÓRIA EDUCACIONAL',
            fontSize: 16,
            bold: true,
            alignment: 'center',
            color: PDF_COLORS.primary,
            margin: [0, 0, 0, 20],
        };
    }

    private buildStudentInfoSection(): Content {
        if (!this.student) return '';
        const stats = this.calculateOverallStats();
        const gen = getPDFGenerator();
        const statusLabel = stats.overallAvg >= 6 ? 'Adequado' : 'Atenção';
        const statusColor = stats.overallAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico;

        // Visual Trend Arrow
        const trendSymbol = stats.trend === 'ascending' ? '▲' : stats.trend === 'descending' ? '▼' : '►';
        const trendLabel = stats.trend === 'ascending' ? 'Ascendente' : stats.trend === 'descending' ? 'Declínio' : 'Estável';

        return {
            stack: [
                // 1. Linha Principal: Nome + Status Pill
                {
                    columns: [
                        { text: this.student.name.toUpperCase(), fontSize: 18, bold: true, color: PDF_COLORS.primary, width: '*' },
                        {
                            stack: [
                                gen.createStatusPill(statusLabel.toUpperCase(), statusColor)
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
                    gen.createKPIBox('Média Fundamental', stats.fundAvg > 0 ? stats.fundAvg.toFixed(1) : '-', stats.fundAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Ciclo 1'),
                    gen.createKPIBox('Média Ens. Médio', stats.emAvg > 0 ? stats.emAvg.toFixed(1) : '-', stats.emAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Ciclo 2'),
                    gen.createKPIBox('Tendência Global', `${trendSymbol} ${trendLabel}`, stats.trend === 'ascending' ? PDF_COLORS.info : stats.trend === 'descending' ? PDF_COLORS.danger : PDF_COLORS.secondary, 'Evolução')
                ])
            ],
            margin: [0, 0, 0, 25]
        } as Content;
    }

    private buildFundamentalHistorySection(): Content {
        // Filter subjects that have fundamental grades
        const fundSubjects = this.subjectTrajectories.filter(t => t.fundGrades.length > 0);
        // Force rendering if we have historical grades generally, even if map fails? No, trust map.
        if (fundSubjects.length === 0) {
            // Debug text if dev mode? No.
            return '';
        }

        // Find max number of years (usually 6th to 9th grade)
        const years = Array.from(new Set(fundSubjects.flatMap(t => t.fundGrades.map(g => g.year)))).sort();

        return {
            stack: [
                { text: 'HISTÓRICO: ENSINO FUNDAMENTAL', style: 'h3', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', ...years.map(() => 45), 50],
                        body: [
                            [
                                { text: 'DISCIPLINA', style: 'tableHeader', alignment: 'left' },
                                ...years.map(y => ({ text: `${y}º ANO`, style: 'tableHeader', alignment: 'center' })),
                                { text: 'MÉDIA', style: 'tableHeader', alignment: 'center' }
                            ],
                            ...fundSubjects.map((t, index) => {
                                const fillColor = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                                return [
                                    { text: t.subject, style: 'bodySmall', bold: true, alignment: 'left', fillColor, margin: [5, 4, 0, 4] },
                                    ...years.map(y => {
                                        const g = t.fundGrades.find(fg => fg.year === y);
                                        return {
                                            text: g ? g.grade.toFixed(1) : '-',
                                            style: 'bodySmall',
                                            alignment: 'center',
                                            color: g && g.grade < 6 ? PDF_COLORS.danger : PDF_COLORS.secondary,
                                            fillColor,
                                            margin: [0, 4, 0, 4]
                                        };
                                    }),
                                    {
                                        text: t.fundAverage.toFixed(1),
                                        style: 'bodySmall',
                                        bold: true,
                                        alignment: 'center',
                                        fillColor,
                                        color: t.fundAverage < 6 ? PDF_COLORS.danger : 'black',
                                        margin: [0, 4, 0, 4]
                                    }
                                ] as Content[];
                            })
                        ] as any
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 20]
                }
            ]
        };
    }

    private buildHighSchoolHistorySection(): Content {
        // Fallback: Check if we have ANY HS grades effectively
        const hasHSGrades = this.regularGrades.some(g => [1, 2, 3].includes(g.schoolYear || 0));

        let emSubjects = this.subjectTrajectories.filter(t => t.emGrades.length > 0);

        // If empty but we have raw grades, try to rebuild mapping loosely?
        // Actually, if analyzeSubjects uses normalization, this should be populated.
        // But let's check safety.
        if (emSubjects.length === 0) {
            if (!hasHSGrades) return '';
            // If we have grades but no trajectory, it means analyzeSubjects failed.
            // We can try to rely on the side-effect of analyzeSubjects being improved below.
            return '';
        }

        const years = [1, 2, 3]; // 1st, 2nd, 3rd year High School

        return {
            stack: [
                { text: 'HISTÓRICO: ENSINO MÉDIO', style: 'h3', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 45, 45, 45, 50],
                        body: [
                            [
                                { text: 'DISCIPLINA', style: 'tableHeader', alignment: 'left' },
                                { text: '1ª SÉRIE', style: 'tableHeader', alignment: 'center' },
                                { text: '2ª SÉRIE', style: 'tableHeader', alignment: 'center' },
                                { text: '3ª SÉRIE', style: 'tableHeader', alignment: 'center' },
                                { text: 'MÉDIA', style: 'tableHeader', alignment: 'center' }
                            ],
                            ...emSubjects.map((t, index) => {
                                const fillColor = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                                return [
                                    { text: t.subject, style: 'bodySmall', bold: true, alignment: 'left', fillColor, margin: [5, 4, 0, 4] },
                                    ...years.map(y => {
                                        const g = t.emGrades.find(eg => eg.year === y);
                                        return {
                                            text: g ? g.grade.toFixed(1) : '-',
                                            style: 'bodySmall',
                                            alignment: 'center',
                                            color: g && g.grade < 6 ? PDF_COLORS.danger : PDF_COLORS.secondary,
                                            fillColor,
                                            margin: [0, 4, 0, 4]
                                        };
                                    }),
                                    {
                                        text: t.emAverage.toFixed(1),
                                        style: 'bodySmall',
                                        bold: true,
                                        alignment: 'center',
                                        fillColor,
                                        color: t.emAverage < 6 ? PDF_COLORS.danger : 'black',
                                        margin: [0, 4, 0, 4]
                                    }
                                ] as Content[];
                            })
                        ] as any
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 20]
                }
            ]
        };
    }

    private buildExternalAssessmentsSection(): Content {
        if (this.externalAssessments.length === 0) return '';

        return {
            stack: [
                { text: 'AVALIAÇÕES EXTERNAS (SAEB / ENEM)', style: 'h3', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 80, 80, 80],
                        body: [
                            [
                                { text: 'AVALIAÇÃO', style: 'tableHeader', alignment: 'left' },
                                { text: 'ANO', style: 'tableHeader', alignment: 'center' },
                                { text: 'ÁREA/DISCIPLINA', style: 'tableHeader', alignment: 'left' },
                                { text: 'NOTA', style: 'tableHeader', alignment: 'center' }
                            ],
                            ...this.externalAssessments.map((e, index) => {
                                const fillColor = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                                let year = '';
                                if (e.appliedDate && !isNaN(new Date(e.appliedDate).getTime())) {
                                    year = new Date(e.appliedDate).getFullYear().toString();
                                } else if (typeof e.appliedDate === 'string' && e.appliedDate.length >= 4) {
                                    year = e.appliedDate.substring(0, 4); // Fallback for YYYY-MM-DD strings that might fail Date() in some envs
                                } else {
                                    year = '-';
                                }

                                return [
                                    { text: e.assessmentName, style: 'bodySmall', bold: true, alignment: 'left', fillColor, margin: [5, 4, 0, 4] },
                                    { text: year, style: 'bodySmall', alignment: 'center', fillColor, margin: [0, 4, 0, 4] },
                                    { text: e.subject || 'Geral', style: 'bodySmall', alignment: 'left', fillColor, margin: [0, 4, 0, 4] },
                                    { text: typeof e.score === 'number' ? e.score.toFixed(1) : '-', style: 'bodySmall', bold: true, alignment: 'center', color: PDF_COLORS.primary, fillColor, margin: [0, 4, 0, 4] }
                                ] as Content[];
                            })
                        ] as any
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 20]
                }
            ]
        };
    }

    private buildNarrativeSection(): Content {
        const stats = this.calculateOverallStats();

        // Identify strengths and weaknesses
        const strengths = this.subjectTrajectories.filter(t => t.average >= 8).map(t => t.subject);
        const weaknesses = this.subjectTrajectories.filter(t => t.average < 6).map(t => t.subject);

        let prognostic = 'A trajetória sugere continuidade e estabilidade nos processos de aprendizagem.';
        if (stats.trend === 'ascending') prognostic = 'A trajetória ascendente indica consolidação progressiva das competências e prontidão para novos desafios.';
        if (stats.trend === 'descending') prognostic = 'O declínio estatístico registrado requer revisão imediata das estratégias de estudo e apoio pedagógico dirigido.';

        return {
            stack: [
                { text: 'PARECER ANALÍTICO', style: 'h3', margin: [0, 0, 0, 10] },
                {
                    table: {
                        widths: ['*'],
                        body: [[
                            {
                                stack: [
                                    // 1. Status Overview
                                    { text: `SITUAÇÃO GERAL: ${stats.trend === 'ascending' ? 'EM EVOLUÇÃO (A)' : stats.trend === 'descending' ? 'ALERTA DE REGRESSÃO (C)' : 'ESTABILIDADE (B)'}`, fontSize: 9, bold: true, margin: [0, 0, 0, 12] },

                                    // 2. Columns
                                    {
                                        columns: [
                                            weaknesses.length > 0 ? {
                                                stack: [
                                                    { text: 'PONTOS DE ATENÇÃO (< 6.0):', fontSize: 8, bold: true, color: PDF_COLORS.status.critico, margin: [0, 0, 0, 4] },
                                                    { ul: weaknesses, fontSize: 8, color: '#475569', margin: [0, 0, 0, 0] }
                                                ],
                                                width: '*', margin: [0, 0, 10, 0]
                                            } : { text: '', width: 0 },

                                            strengths.length > 0 ? {
                                                stack: [
                                                    { text: 'PONTOS FORTES (> 8.0):', fontSize: 8, bold: true, color: PDF_COLORS.status.aprovado, margin: [0, 0, 0, 4] },
                                                    { ul: strengths, fontSize: 8, color: '#475569', margin: [0, 0, 0, 0] }
                                                ],
                                                width: '*'
                                            } : { text: '', width: 0 }
                                        ],
                                        columnGap: 20,
                                        margin: [0, 0, 0, 15]
                                    },

                                    // 3. Behavior (Incidents)
                                    {
                                        text: [
                                            { text: 'DIÁRIO DE OCORRÊNCIAS: ', fontSize: 8, bold: true },
                                            { text: this.incidents.length > 0 ? `Registram-se ${this.incidents.length} apontamentos disciplinares no período.` : 'Nenhum registro disciplinar significativo.', fontSize: 8 }
                                        ],
                                        margin: [0, 0, 0, 6]
                                    },

                                    // 4. Prognostic
                                    {
                                        text: [
                                            { text: 'PROGNÓSTICO TÉCNICO: ', fontSize: 8, bold: true },
                                            { text: prognostic, fontSize: 8 }
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
                    margin: [0, 0, 0, 20]
                }
            ]
        };
    }

    private buildLongitudinalChart(): Content {
        const timeline = this.calculateGlobalTimeline();
        if (timeline.length < 2) return '';

        // Chart Dimensions (Increased Resolution for SVG Density)
        const width = 1200; // Increased from 500 for high density
        const height = 400; // Increased proportionally
        const margin = { top: 60, right: 60, bottom: 60, left: 80 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Colors
        const colorFund = '#64748B'; // Slate 500
        const colorEM = PDF_COLORS.primary; // Blue/Dark
        const colorRef = '#F59E0B'; // Amber 500
        const colorTrend = PDF_COLORS.secondary;
        const colorGrid = '#E2E8F0';
        const colorText = '#475569';
        const colorLine = '#334155'; // Darker Slate for the main line

        // Helper to map Y value (0-10) to SVG coordinate
        const getY = (grade: number) => {
            // Invert Y: 10 is at 0 (top), 0 is at chartHeight (bottom)
            return margin.top + chartHeight - (grade / 10) * chartHeight;
        };

        // Helper to map X index to SVG coordinate
        const getX = (index: number) => {
            const step = chartWidth / (Math.max(timeline.length - 1, 1));
            return margin.left + index * step;
        };

        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

        // 1. Legend (Top Right)
        const legendX = 350;
        const legendY = 30;
        svg += `
            <g font-family="Roboto, sans-serif" font-size="22" fill="${colorText}">
                <!-- Fundamental -->
                <circle cx="${legendX}" cy="${legendY}" r="8" fill="${colorFund}" />
                <text x="${legendX + 20}" y="${legendY + 8}">Fundamental</text>
                
                <!-- Ensino Médio -->
                <circle cx="${legendX + 200}" cy="${legendY}" r="8" fill="${colorEM}" />
                <text x="${legendX + 220}" y="${legendY + 8}">Ensino Médio</text>

                <!-- Externo -->
                <circle cx="${legendX + 400}" cy="${legendY}" r="8" fill="${colorRef}" />
                <text x="${legendX + 420}" y="${legendY + 8}">Externas/Simulados</text>

                <!-- Tendência -->
                <line x1="${legendX + 680}" y1="${legendY}" x2="${legendX + 740}" y2="${legendY}" stroke="${colorTrend}" stroke-width="4" stroke-dasharray="10,5" />
                <text x="${legendX + 750}" y="${legendY + 8}">Tendência</text>
            </g>
        `;

        // 2. Grid & Y-Axis Labels
        for (let i = 0; i <= 10; i += 2) {
            const y = getY(i);
            const isZero = i === 0;
            // Grid Line
            svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${isZero ? '#CBD5E1' : colorGrid}" stroke-width="${isZero ? 2 : 1}" stroke-dasharray="${isZero ? '' : '8,4'}" />`;
            // Label
            svg += `<text x="${margin.left - 15}" y="${y + 8}" text-anchor="end" font-family="Roboto, sans-serif" font-size="20" fill="${colorText}">${i}</text>`;
        }

        // 3. Prepare Data Points for Trend & Lines
        const points = timeline.map((t, i) => ({
            x: getX(i),
            y: getY(t.grade),
            ...t
        }));

        // 4. Trend Line (Linear Regression)
        const academicPoints = points.filter(p => !p.label.includes('Simulado') && !p.type.includes('REF'));
        if (academicPoints.length >= 2) {
            const xData = academicPoints.map((_, i) => i);
            const yData = academicPoints.map(p => p.grade);
            const reg = linearRegression(xData, yData);

            const x1 = academicPoints[0].x;
            const x2 = academicPoints[academicPoints.length - 1].x;

            // Reg predictable Y needs to be mapped to SVG coords.
            const y1Grade = reg.predict(0);
            const y2Grade = reg.predict(academicPoints.length - 1);

            const y1 = getY(y1Grade);
            const y2 = getY(y2Grade);

            const slopeColor = reg.slope > 0.15 ? PDF_COLORS.status.aprovado : reg.slope < -0.15 ? PDF_COLORS.status.critico : PDF_COLORS.secondary;

            svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${slopeColor}" stroke-width="4" stroke-dasharray="10,6" />`;
        }

        // 5. Connect Main Academic Line
        let pathD = '';
        let first = true;
        points.forEach(p => {
            if (p.type === 'REF') return; // Skip external for the main line
            if (first) {
                pathD += `M ${p.x} ${p.y}`;
                first = false;
            } else {
                pathD += ` L ${p.x} ${p.y}`;
            }
        });
        if (pathD) {
            svg += `<path d="${pathD}" fill="none" stroke="${colorLine}" stroke-width="4" />`;
        }

        // 6. Plot Points & Labels
        points.forEach(p => {
            const color = p.type === 'EF' ? colorFund : p.type === 'EM' ? colorEM : colorRef;

            // Point
            svg += `<circle cx="${p.x}" cy="${p.y}" r="8" fill="white" stroke="${color}" stroke-width="4" />`;

            // Grade Label (Top)
            svg += `<text x="${p.x}" y="${p.y - 20}" text-anchor="middle" font-family="Roboto, sans-serif" font-size="18" font-weight="bold" fill="${color}">${p.grade.toFixed(1)}</text>`;

            // X-Axis Label (Bottom)
            svg += `<text x="${p.x}" y="${height - 20}" text-anchor="middle" font-family="Roboto, sans-serif" font-size="16" fill="${colorText}">${p.label}</text>`;
        });

        svg += `</svg>`;

        return {
            stack: [
                { text: 'EVOLUÇÃO LONGITUDINAL INTEGRADA', style: 'h3', margin: [0, 20, 0, 10] },
                { svg: svg, width: 480, margin: [0, 0, 0, 20] },
                { text: 'Visualização da trajetória acadêmica (linhas sólidas) em comparação com avaliações diagnósticas (pontos laranja).', style: 'caption', margin: [0, 0, 0, 20] }
            ],
            unbreakable: true
        };
    }

    private calculateGlobalTimeline() {
        const points: any[] = [];

        // 1. Fundamental (Annual Preference)
        const fundYears = Array.from(new Set(this.historicalGrades.map(g => g.gradeYear))).sort((a, b) => a - b);
        fundYears.forEach(year => {
            // Try annual first
            const annualGrades = this.historicalGrades.filter(g => g.gradeYear === year && g.quarter === 'Anual');
            if (annualGrades.length > 0) {
                const avg = annualGrades.reduce((a, b) => a + b.grade, 0) / annualGrades.length;
                points.push({ label: `${year}º EF`, grade: avg, year, type: 'EF', sortId: year });
            } else {
                // Average of all available quarters
                const grades = this.historicalGrades.filter(g => g.gradeYear === year);
                if (grades.length > 0) {
                    const avg = grades.reduce((a, b) => a + b.grade, 0) / grades.length;
                    points.push({ label: `${year}º EF`, grade: avg, year, type: 'EF', sortId: year });
                }
            }
        });

        // 2. High School (Quarterly Granularity - Parity with Web)
        const quarters = ['1', '2', '3', '4'];
        const emYears = Array.from(new Set(this.regularGrades.map(g => g.schoolYear || 1))).sort((a, b) => a - b);

        emYears.forEach(year => {
            const yearGrades = this.regularGrades.filter(g => (g.schoolYear || 1) === year);

            quarters.forEach((qNum, qIndex) => {
                // Fuzzy match quarter
                const qGrades = yearGrades.filter(g => this.normalizeQuarter(g.quarter) === parseInt(qNum));

                if (qGrades.length > 0) {
                    const avg = qGrades.reduce((a, b) => a + b.grade, 0) / qGrades.length;

                    // sortId = Year + fraction for quarter (e.g. 10.1, 10.2...)
                    const normalizedYear = year + 9; // 1->10, 2->11
                    const sortId = normalizedYear + (qIndex * 0.2);

                    points.push({
                        label: `${year}º ${qNum}B`,
                        grade: avg,
                        year: normalizedYear,
                        type: 'EM',
                        sortId: sortId
                    });
                }
            });
        });

        // 3. External Assessments
        const refinedExtPoints = this.externalAssessments.map(e => {
            // Attempt to map to a specific timeline slot
            let sortId = 0;
            // Normalize Year Base for Timeline (Fund 6-9, EM 10-12)
            let yearBase = e.gradeYear || 0;

            if (e.schoolLevel === 'fundamental') {
                // Fundamental is usually 6, 7, 8, 9.
                sortId = yearBase + 0.5; // End of year approx
            } else {
                // High School: 1, 2, 3 -> Normalize to 10, 11, 12
                // If gradeYear is already 10+, keep it. If 1,2,3, add 9.
                if (yearBase < 10 && yearBase > 0) yearBase += 9;

                // Fallback if missing year?
                if (yearBase === 0) yearBase = 10;

                // Map to Quarter
                sortId = yearBase + 0.9;
                // Fuzzy Quarter
                const qNum = this.normalizeQuarter(e.quarter);
                sortId = yearBase + ((qNum - 1) * 0.2) + 0.1; // Offset slightly from school grade
            }

            if (isNaN(e.score)) return null;

            return {
                label: e.assessmentName.length > 6 ? e.assessmentName.substring(0, 6) : e.assessmentName,
                grade: e.score,
                sortId: sortId,
                type: 'REF'
            };
        }).filter(p => p !== null) as any[];

        const allPoints = [...points, ...refinedExtPoints];
        return allPoints.sort((a, b) => a.sortId - b.sortId);
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

    private normalizeSubjectName(name: string): string {
        return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    private normalizeQuarter(q: string | undefined): number {
        if (!q) return 4;
        const match = q.match(/\d/);
        return match ? parseInt(match[0]) : 4;
    }
}

export const generateTrajectoryReportPDF = async (...args: any[]) => {
    const gen = new TrajectoryReportPDFGenerator();
    // @ts-ignore
    return gen.generate(...args);
};
