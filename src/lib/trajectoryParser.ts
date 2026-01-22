/**
 * Trajectory Parser (Excel)
 * Extrai notas históricas do ensino fundamental do arquivo Excel de processo seletivo
 */

import * as XLSX from 'xlsx';

// Estrutura do header esperado: "DISCIPLINA - Xº ANO" ou "DISCIPLINA - Xº BIMESTRE"
const HEADER_PATTERN_ANNUAL = /^(.+)\s*-\s*(\d)º\s*ANO$/i;
const HEADER_PATTERN_BIMESTER = /^(.+)\s*-\s*(\d)º\s*BIMESTRE$/i;

// Disciplinas esperadas do fundamental
const FUNDAMENTAL_SUBJECTS_MAP: Record<string, string> = {
    'PORTUGUÊS': 'Língua Portuguesa',
    'LINGUA PORTUGUESA': 'Língua Portuguesa',
    'MATEMÁTICA': 'Matemática',
    'MATEMATICA': 'Matemática',
    'HISTÓRIA': 'História',
    'HISTORIA': 'História',
    'GEOGRAFIA': 'Geografia',
    'CIÊNCIAS': 'Ciências',
    'CIENCIAS': 'Ciências',
    'ARTE': 'Arte',
    'ARTES': 'Arte',
    'ENSINO RELIGIOSO': 'Ensino Religioso',
    'INGLÊS': 'Inglês',
    'INGLES': 'Inglês',
    'ESPANHOL': 'Espanhol',
    'EDUCAÇÃO FÍSICA': 'Educação Física',
    'EDUCACAO FISICA': 'Educação Física',
    'ED FÍSICA': 'Educação Física',
    'ED FISICA': 'Educação Física',
};

function normalizeSubject(subject: string): string {
    const normalized = subject.trim().toUpperCase();
    return FUNDAMENTAL_SUBJECTS_MAP[normalized] || subject.trim();
}

export interface TrajectoryGradeRow {
    studentName: string;
    grades: Record<number, Record<string, number | null>>; // year -> subject -> grade
}

export interface TrajectoryParseResult {
    success: boolean;
    rows: TrajectoryGradeRow[];
    subjects: string[];
    years: number[];
    errors: string[];
}

export interface ImportableHistoricalGrade {
    studentId: string;
    studentName: string;
    extractedName: string;
    similarity: number;
    schoolLevel: 'fundamental';
    gradeYear: number;
    subject: string;
    quarter: 'Anual';
    grade: number;
    calendarYear?: number;
    selected: boolean;
}

// Normaliza nome para comparação
export function normalizeNameForComparison(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Calcula similaridade entre dois nomes
export function calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = normalizeNameForComparison(name1);
    const n2 = normalizeNameForComparison(name2);

    if (n1 === n2) return 1;

    const words1 = n1.split(' ');
    const words2 = n2.split(' ');

    // Contar palavras que coincidem
    let matchingWords = 0;
    for (const w1 of words1) {
        if (words2.includes(w1)) matchingWords++;
    }

    const totalWords = Math.max(words1.length, words2.length);
    const wordSimilarity = matchingWords / totalWords;

    // Verificar se primeiro e último nome coincidem
    const firstMatch = words1[0] === words2[0] ? 0.2 : 0;
    const lastMatch = words1[words1.length - 1] === words2[words2.length - 1] ? 0.2 : 0;

    return Math.min(1, wordSimilarity * 0.6 + firstMatch + lastMatch);
}

function parseGradeValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const str = String(value).replace(',', '.').trim();
    const num = parseFloat(str);

    if (isNaN(num) || num < 0 || num > 10) return null;
    return Math.round(num * 10) / 10;
}

export async function processTrajectoryFile(file: File): Promise<TrajectoryParseResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

                if (rawData.length < 2) {
                    resolve({ success: false, rows: [], subjects: [], years: [], errors: ['Arquivo vazio ou sem dados'] });
                    return;
                }

                const headers = (rawData[0] as string[]) || [];

                // Mapear colunas: encontrar índice do nome e das notas
                let nameColIndex = -1;
                const gradeColumns: { colIndex: number; subject: string; year: number; bimester?: number }[] = [];

                for (let i = 0; i < headers.length; i++) {
                    const header = String(headers[i] || '').trim();

                    // Detectar coluna de nome
                    if (/NOME/i.test(header)) {
                        nameColIndex = i;
                        continue;
                    }

                    // Detectar notas anuais (6º, 7º, 8º ano)
                    const annualMatch = header.match(HEADER_PATTERN_ANNUAL);
                    if (annualMatch) {
                        const subject = normalizeSubject(annualMatch[1]);
                        const year = parseInt(annualMatch[2]);
                        if (year >= 6 && year <= 9) {
                            gradeColumns.push({ colIndex: i, subject, year });
                        }
                        continue;
                    }

                    // Detectar notas bimestrais (9º ano)
                    const bimesterMatch = header.match(HEADER_PATTERN_BIMESTER);
                    if (bimesterMatch) {
                        const subject = normalizeSubject(bimesterMatch[1]);
                        const bimester = parseInt(bimesterMatch[2]);
                        gradeColumns.push({ colIndex: i, subject, year: 9, bimester });
                    }
                }

                if (nameColIndex === -1) {
                    resolve({ success: false, rows: [], subjects: [], years: [], errors: ['Coluna de nome não encontrada'] });
                    return;
                }

                if (gradeColumns.length === 0) {
                    resolve({ success: false, rows: [], subjects: [], years: [], errors: ['Nenhuma coluna de nota encontrada'] });
                    return;
                }

                // Processar linhas de dados
                const rows: TrajectoryGradeRow[] = [];
                const allSubjects = new Set<string>();
                const allYears = new Set<number>();

                for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
                    const row = rawData[rowIndex] as unknown[];
                    if (!row || row.length === 0) continue;

                    const studentName = String(row[nameColIndex] || '').trim();
                    if (!studentName) continue;

                    // Estrutura: year -> subject -> grades[]
                    const gradesByYearSubject: Record<number, Record<string, number[]>> = {};

                    for (const col of gradeColumns) {
                        const value = row[col.colIndex];
                        const grade = parseGradeValue(value);

                        if (grade !== null) {
                            if (!gradesByYearSubject[col.year]) {
                                gradesByYearSubject[col.year] = {};
                            }
                            if (!gradesByYearSubject[col.year][col.subject]) {
                                gradesByYearSubject[col.year][col.subject] = [];
                            }
                            gradesByYearSubject[col.year][col.subject].push(grade);
                            allSubjects.add(col.subject);
                            allYears.add(col.year);
                        }
                    }

                    // Converter para estrutura final (média para bimestres)
                    const grades: Record<number, Record<string, number | null>> = {};

                    for (const [yearStr, subjects] of Object.entries(gradesByYearSubject)) {
                        const year = parseInt(yearStr);
                        grades[year] = {};

                        for (const [subject, gradeValues] of Object.entries(subjects)) {
                            if (gradeValues.length > 0) {
                                // Calcular média se houver múltiplas notas (bimestres)
                                const avg = gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length;
                                grades[year][subject] = Math.round(avg * 10) / 10;
                            }
                        }
                    }

                    if (Object.keys(grades).length > 0) {
                        rows.push({ studentName, grades });
                    }
                }

                resolve({
                    success: true,
                    rows,
                    subjects: Array.from(allSubjects).sort(),
                    years: Array.from(allYears).sort(),
                    errors: []
                });

            } catch (error) {
                resolve({
                    success: false,
                    rows: [],
                    subjects: [],
                    years: [],
                    errors: [`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
                });
            }
        };

        reader.onerror = () => {
            resolve({
                success: false,
                rows: [],
                subjects: [],
                years: [],
                errors: ['Erro ao ler arquivo']
            });
        };

        reader.readAsArrayBuffer(file);
    });
}

// Preparar notas para importação com match de alunos
export function prepareHistoricalGradesForImport(
    parseResult: TrajectoryParseResult,
    students: { id: string; name: string }[],
    calendarYearBase: number = new Date().getFullYear()
): ImportableHistoricalGrade[] {
    const grades: ImportableHistoricalGrade[] = [];

    for (const row of parseResult.rows) {
        // Encontrar melhor match para o nome
        let bestMatch: { student: typeof students[0]; score: number } | null = null;

        for (const student of students) {
            const score = calculateNameSimilarity(row.studentName, student.name);
            if (!bestMatch || score > bestMatch.score) {
                bestMatch = { student, score };
            }
        }

        const matched = bestMatch && bestMatch.score >= 0.6;

        for (const [yearStr, subjects] of Object.entries(row.grades)) {
            const year = parseInt(yearStr);

            // Calcular ano calendário baseado no ano escolar
            // Se base é 2025 e aluno está no 9º ano, significa:
            // 9º ano = 2024, 8º = 2023, 7º = 2022, 6º = 2021
            const calendarYear = calendarYearBase - (9 - year) - 1;

            for (const [subject, grade] of Object.entries(subjects)) {
                if (grade !== null && grade !== undefined) {
                    grades.push({
                        studentId: matched ? bestMatch!.student.id : '',
                        studentName: matched ? bestMatch!.student.name : '',
                        extractedName: row.studentName,
                        similarity: bestMatch?.score || 0,
                        schoolLevel: 'fundamental',
                        gradeYear: year,
                        subject,
                        quarter: 'Anual',
                        grade,
                        calendarYear,
                        selected: matched
                    });
                }
            }
        }
    }

    return grades;
}
