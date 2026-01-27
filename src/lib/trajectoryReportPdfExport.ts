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
            this.historicalGrades = historicalGrades.filter(g => g.studentId === student.id);
            this.regularGrades = regularGrades.filter(g => g.studentId === student.id);
            this.externalAssessments = externalAssessments.filter(e => e.studentId === student.id);
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

        this.historicalGrades.forEach(g => {
            if (!subjectMap.has(g.subject)) subjectMap.set(g.subject, this.createEmptyTrajectory(g.subject));
            const traj = subjectMap.get(g.subject)!;
            traj.fundGrades.push({ year: g.gradeYear, grade: g.grade });
            traj.allGrades.push(g.grade);
        });

        const emBySubjectYear = new Map<string, Map<number, number[]>>();
        this.regularGrades.forEach(g => {
            const year = g.schoolYear || 1;
            if (!emBySubjectYear.has(g.subject)) emBySubjectYear.set(g.subject, new Map());
            const yearMap = emBySubjectYear.get(g.subject)!;
            if (!yearMap.has(year)) yearMap.set(year, []);
            yearMap.get(year)!.push(g.grade);
        });

        emBySubjectYear.forEach((yearMap, subject) => {
            if (!subjectMap.has(subject)) subjectMap.set(subject, this.createEmptyTrajectory(subject));
            const traj = subjectMap.get(subject)!;
            yearMap.forEach((grades, year) => {
                const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
                traj.emGrades.push({ year, grade: avg });
                traj.allGrades.push(avg);
            });
        });

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
        const content: Content[] = [
            this.buildTitleSection(),
            this.buildExecutiveSummary(),
            this.buildPotencialidadesSection(),
            this.buildAreasAtencaoSection(),
            this.buildGradesTableSection(),
            this.buildSubjectAnalysisSection(),
            this.buildBehaviorSection(),
            this.buildPrognosticSection()
        ];
        return content;
    }

    private buildTitleSection(): Content {
        return { text: 'RELATÓRIO DE TRAJETÓRIA ESTUDANTIL', style: 'h2', alignment: 'center', margin: [0, 0, 0, 20] };
    }

    private buildExecutiveSummary(): Content {
        const fundGrades = this.historicalGrades.map(g => g.grade);
        const emGrades = this.regularGrades.map(g => g.grade);
        const fundAvg = fundGrades.length > 0 ? fundGrades.reduce((a, b) => a + b, 0) / fundGrades.length : 0;
        const emAvg = emGrades.length > 0 ? emGrades.reduce((a, b) => a + b, 0) / emGrades.length : 0;
        const overallAvg = (fundAvg + emAvg) / (fundAvg > 0 && emAvg > 0 ? 2 : 1);
        const gen = getPDFGenerator();

        return {
            stack: [
                { text: 'SUMÁRIO EXECUTIVO DE CICLOS', style: 'h3', margin: [0, 0, 0, 10] },
                gen.createDashboardRow([
                    gen.createKPIBox('Média Fundamental', fundAvg > 0 ? fundAvg.toFixed(1) : '—', fundAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Ciclo 1'),
                    gen.createKPIBox('Média Ens. Médio', emAvg > 0 ? emAvg.toFixed(1) : '—', emAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Ciclo 2'),
                    gen.createKPIBox('Média Global', overallAvg.toFixed(1), overallAvg >= 6 ? PDF_COLORS.status.aprovado : PDF_COLORS.status.critico, 'Trajetória Total')
                ]),
                {
                    text: 'Análise comparativa do rendimento histórico entre ciclos educacionais.',
                    style: 'caption',
                    margin: [2, 0, 0, 10]
                }
            ]
        };
    }

    private buildPotencialidadesSection(): Content {
        const top = this.subjectTrajectories.filter(t => t.average >= 7).slice(0, 5);
        if (top.length === 0) return '';
        return {
            stack: [
                { text: 'INDICADORES DE CONSOLIDAÇÃO', style: 'h3', color: PDF_COLORS.status.aprovado, margin: [0, 10, 0, 5] },
                { ul: top.map(t => `${t.subject} (Média ${t.average.toFixed(1)})`), fontSize: 9 }
            ],
            margin: [0, 0, 0, 15]
        };
    }

    private buildAreasAtencaoSection(): Content {
        const low = this.subjectTrajectories.filter(t => t.average < 6).slice(0, 5);
        if (low.length === 0) return '';
        return {
            stack: [
                { text: 'INDICADORES DE ATENÇÃO', style: 'h3', color: PDF_COLORS.status.critico, margin: [0, 10, 0, 5] },
                { ul: low.map(t => `${t.subject} (Média ${t.average.toFixed(1)})`), fontSize: 9 }
            ],
            margin: [0, 0, 0, 15]
        };
    }

    private buildGradesTableSection(): Content {
        const body: TableCell[][] = [[
            { text: 'Disciplina', style: 'tableHeader' },
            { text: 'Fund (Média)', style: 'tableHeader' },
            { text: 'Médio (Média)', style: 'tableHeader' },
            { text: 'Tendência', style: 'tableHeader' }
        ]];
        this.subjectTrajectories.forEach(t => {
            body.push([
                { text: t.subject, style: 'tableCellLeft' },
                { text: t.fundAverage > 0 ? t.fundAverage.toFixed(1) : '-', style: 'tableCell' },
                { text: t.emAverage > 0 ? t.emAverage.toFixed(1) : '-', style: 'tableCell' },
                { text: t.trend === 'ascending' ? '↑' : t.trend === 'descending' ? '↓' : '→', style: 'tableCell', bold: true } as TableCell
            ]);
        });
        return {
            stack: [
                { text: 'QUADRO COMPARATIVO DE CICLOS', style: 'h3', margin: [0, 10, 0, 5] },
                { table: { headerRows: 1, widths: ['*', 80, 80, 80], body }, layout: 'headerLineOnly', margin: [0, 0, 0, 15] }
            ]
        };
    }

    private buildSubjectAnalysisSection(): Content {
        const analysis = this.subjectTrajectories.slice(0, 10).map(t => ({
            text: `• ${t.subject.toUpperCase()}: ${t.trend === 'ascending' ? 'Trajetória em ascensão linear.' : t.trend === 'descending' ? 'Alerta por declínio gradual de rendimento.' : 'Desempenho estável no período.'}`,
            fontSize: 9, margin: [0, 2, 0, 2] as [number, number, number, number]
        } as Content));
        return {
            stack: [
                { text: 'ANÁLISE EVOLUTIVA POR COMPONENTE', style: 'h3', margin: [0, 10, 0, 5] as [number, number, number, number] },
                ...analysis
            ],
            margin: [0, 0, 0, 15] as [number, number, number, number]
        } as Content;
    }

    private buildBehaviorSection(): Content {
        if (this.incidents.length === 0) return '' as any;
        return {
            stack: [
                { text: 'INTERCORRÊNCIAS DISCIPLINARES', style: 'h3', margin: [0, 10, 0, 10] as [number, number, number, number] },
                ...this.incidents.map(i => ({ text: `• ${new Date(i.date).toLocaleDateString('pt-BR')}: ${i.description}`, fontSize: 9, margin: [0, 2, 0, 2] as [number, number, number, number] } as Content))
            ],
            margin: [0, 0, 0, 15] as [number, number, number, number]
        } as Content;
    }

    private buildPrognosticSection(): Content {
        const stats = this.calculateOverallStats();
        let prog = 'A trajetória sugere continuidade e estabilidade nos processos de aprendizagem.';
        if (stats.trend === 'ascending') prog = 'A trajetória ascendente indica consolidação progressiva das competências e prontidão para novos desafios.';
        if (stats.trend === 'descending') prog = 'O declínio estatístico registrado requer revisão imediata das estratégias de estudo e apoio pedagógico dirigido.';

        return {
            stack: [
                { text: 'PROGNÓSTICO TÉCNICO', style: 'h3', margin: [0, 10, 0, 10] },
                { text: prog, fontSize: 10, italics: true, lineHeight: 1.4 }
            ],
            margin: [0, 0, 0, 20]
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
}

export const generateTrajectoryReportPDF = async (...args: any[]) => {
    const gen = new TrajectoryReportPDFGenerator();
    // @ts-ignore
    return gen.generate(...args);
};
