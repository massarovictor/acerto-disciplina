/**
 * SIGE PDF Parser
 * Extrai dados de notas do PDF "Mapa de Notas" do SIGE (Sistema de Gestão Escolar do Ceará)
 */

import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - worker import
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';

// Configurar worker do PDF.js usando import local
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Estrutura de uma linha de notas extraída do PDF
 */
export interface SigeGradeRow {
    studentName: string;
    grades: Record<string, number | null>; // disciplina -> nota
    rawLine: string; // linha original para debug
}

// Mapeamento de abreviações para nomes completos
const GLOBAL_SUBJECT_MAPPING: Record<string, string> = {
    'LNG': 'Língua Portuguesa',
    'POR': 'Língua Portuguesa',
    'PORTUGUÊS': 'Língua Portuguesa',
    'LINGUA PORTUGUESA': 'Língua Portuguesa',
    'LÍNGUA PORTUGUESA': 'Língua Portuguesa',
    'MAT': 'Matemática',
    'MATEMATICA': 'Matemática',
    'MATEMÁTICA': 'Matemática',
    'HIS': 'História',
    'HISTÓRIA': 'História',
    'HISTORIA': 'História',
    'GEO': 'Geografia',
    'GEOGRAFIA': 'Geografia',
    'FIS': 'Física',
    'FÍSICA': 'Física',
    'FISICA': 'Física',
    'QUI': 'Química',
    'QUÍMICA': 'Química',
    'QUIMICA': 'Química',
    'BIO': 'Biologia',
    'BIOLOGIA': 'Biologia',
    'ING': 'Inglês',
    'INGLÊS': 'Inglês',
    'INGLES': 'Inglês',
    'ESP': 'Espanhol',
    'ESPANHOL': 'Espanhol',
    'EDF': 'Educação Física',
    'EDUCAÇÃO FÍSICA': 'Educação Física',
    'EDUCACAO FISICA': 'Educação Física',
    'ART': 'Arte',
    'ARTE': 'Arte',
    'FIL': 'Filosofia',
    'FILOSOFIA': 'Filosofia',
    'SOC': 'Sociologia',
    'SOCIOLOGIA': 'Sociologia',
    'RED': 'Redação',
    'REDAÇÃO': 'Redação',
    'REDACAO': 'Redação',
    // Mapeamentos compostos e técnicos
    'LINGUA ESTRANGEIRA - INGLES': 'Inglês',
    'LINGUA ESTRANGEIRA INGLES': 'Inglês',
    'LINGUA ESTRANGEIRA - ESPANHOL': 'Espanhol',
    'LINGUA ESTRANGEIRA ESPANHOL': 'Espanhol',
    'INFORMATICA BASICA': 'Informática',
    'INFORMÁTICA BÁSICA': 'Informática',
    'INFORMATICA': 'Informática',
    'LOGÍSTICA': 'Logística',
    'LOGISTICA': 'Logística',
    'ADMINISTRAÇÃO': 'Administração',
    'ADMINISTRACAO': 'Administração',
    'CONTABILIDADE': 'Contabilidade',
    'ENFERMAGEM': 'Enfermagem',
};

/**
 * Normaliza nome de disciplina usando o mapeamento global
 */
export function normalizeSubjectName(subject: string): string {
    const upper = subject.toUpperCase().trim();
    // Tenta match exato
    if (GLOBAL_SUBJECT_MAPPING[upper]) {
        return GLOBAL_SUBJECT_MAPPING[upper];
    }

    // Tenta match parcial para casos como "LINGUA ESTRANGEIRA - INGLES (123)"
    for (const [key, value] of Object.entries(GLOBAL_SUBJECT_MAPPING)) {
        if (upper.includes(key)) {
            return value;
        }
    }

    return subject.trim();
}

/**
 * Resultado da extração do PDF
 */
export interface SigeParseResult {
    success: boolean;
    className?: string;
    quarter?: string;
    subjects: string[];
    rows: SigeGradeRow[];
    errors: string[];
    rawText?: string; // texto bruto para debug
}

/**
 * Extrai texto de um arquivo PDF
 */
export async function extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

/**
 * Normaliza nome para comparação (remove acentos, maiúsculas, espaços extras)
 */
export function normalizeNameForComparison(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calcula similaridade entre dois nomes (0 a 1)
 * Usa algoritmo de Levenshtein simplificado e heurísticas para nomes
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = normalizeNameForComparison(name1);
    const n2 = normalizeNameForComparison(name2);

    if (n1 === n2) return 1;

    // Verifica se um está contido no outro (útil para disciplinas e nomes parciais)
    if (n1.includes(n2) || n2.includes(n1)) {
        return 0.9;
    }

    // Palavras a ignorar (preposições)
    const ignoreWords = ['de', 'da', 'do', 'dos', 'das', 'e'];

    // Comparação de palavras
    const words1 = n1.split(' ').filter(w => !ignoreWords.includes(w));
    const words2 = n2.split(' ').filter(w => !ignoreWords.includes(w));

    let matchingWords = 0;

    for (const w1 of words1) {
        // Match exato ou inicial (ex: "B" match "Beatriz")
        const isInitial = w1.length === 1 || (w1.length === 2 && w1.endsWith('.'));

        const match = words2.some(w2 => {
            if (w1 === w2) return true;
            // Match parcial para palavras longas (ex: "Informatica" vs "Info")
            if (w1.length > 3 && w2.length > 3 && (w1.includes(w2) || w2.includes(w1))) return true;
            // Match de inicial
            if (isInitial && w2.startsWith(w1[0])) return true;
            // Match de inicial inversa
            const w2IsInitial = w2.length === 1 || (w2.length === 2 && w2.endsWith('.'));
            if (w2IsInitial && w1.startsWith(w2[0])) return true;

            return false;
        });

        if (match) {
            matchingWords++;
        }
    }

    const totalWords = Math.max(words1.length, words2.length);
    if (totalWords === 0) return 0;

    return matchingWords / totalWords;
}

/**
 * Encontra o melhor match de um nome no sistema
 */
export function findBestStudentMatch(
    extractedName: string,
    students: { id: string; name: string }[],
    minSimilarity = 0.7
): { studentId: string; studentName: string; similarity: number } | null {
    let bestMatch: { studentId: string; studentName: string; similarity: number } | null = null;

    for (const student of students) {
        const similarity = calculateNameSimilarity(extractedName, student.name);

        if (similarity >= minSimilarity && (!bestMatch || similarity > bestMatch.similarity)) {
            bestMatch = {
                studentId: student.id,
                studentName: student.name,
                similarity,
            };
        }
    }

    return bestMatch;
}

/**
 * Parse do texto do PDF do SIGE para extrair notas
 * O formato esperado é uma tabela com:
 * - Primeira linha: cabeçalhos (NOME DO ALUNO + disciplinas)
 * - Linhas seguintes: nome do aluno + notas
 */
export function parseSigeText(text: string): SigeParseResult {
    const errors: string[] = [];
    const rows: SigeGradeRow[] = [];
    let subjects: string[] = [];
    let className: string | undefined;
    let quarter: string | undefined;

    // Tentar extrair turma do cabeçalho
    const turmaMatch = text.match(/(\d+\.\d+\.\d+)/);
    if (turmaMatch) {
        className = turmaMatch[1];
    }

    // Tentar extrair bimestre
    const bimestreMatch = text.match(/(\d)[ºª]?\s*(Bimestre|BIMESTRE|Per[ií]odo)/i);
    if (bimestreMatch) {
        quarter = `${bimestreMatch[1]}º Bimestre`;
    }

    // Disciplinas comuns no ensino médio
    const commonSubjects = [
        'PORTUGUÊS', 'MATEMATICA', 'HISTÓRIA', 'GEOGRAFIA',
        'FÍSICA', 'QUÍMICA', 'BIOLOGIA', 'INGLÊS', 'ESPANHOL',
        'EDUCAÇÃO FÍSICA', 'ARTE', 'FILOSOFIA', 'SOCIOLOGIA',
        'LÍNGUA PORTUGUESA', 'LINGUA PORTUGUESA',
        'LNG', 'MAT', 'HIS', 'GEO', 'FIS', 'QUI', 'BIO', 'ING', 'ESP',
        'EDF', 'ART', 'FIL', 'SOC', 'RED', 'REDAÇÃO'
    ];

    // Extrair disciplinas do cabeçalho
    const lines = text.split('\n').filter(line => line.trim());

    // Procurar linha com disciplinas
    for (const line of lines) {
        const upperLine = line.toUpperCase();
        const foundSubjects: string[] = [];

        for (const subject of commonSubjects) {
            if (upperLine.includes(subject)) {
                // Usar a função global de normalização
                const mappedName = normalizeSubjectName(subject);
                if (!foundSubjects.includes(mappedName)) {
                    foundSubjects.push(mappedName);
                }
            }
        }

        if (foundSubjects.length > 3) {
            subjects = foundSubjects;
            break;
        }
    }

    // Regex para encontrar linhas com notas (número seguido de vírgula ou ponto e mais números)
    const gradePattern = /(\d+[.,]?\d*)/g;

    // Procurar linhas que parecem ter nomes de alunos seguidos de notas
    for (const line of lines) {
        // Pular linhas muito curtas ou que são cabeçalhos
        if (line.length < 20) continue;
        if (line.toUpperCase().includes('NOME DO ALUNO')) continue;
        if (line.toUpperCase().includes('MAPA DE NOTAS')) continue;

        // Verificar se a linha tem números que parecem notas
        const numbers = line.match(gradePattern);
        if (!numbers || numbers.length < 3) continue;

        // Extrair o que parece ser o nome (texto antes dos números)
        const firstNumberIndex = line.search(/\d/);
        if (firstNumberIndex < 5) continue;

        const potentialName = line.substring(0, firstNumberIndex).trim();

        // Validar que parece um nome (pelo menos 2 palavras)
        if (potentialName.split(' ').length < 2) continue;

        // Extrair notas
        const gradeValues: Record<string, number | null> = {};
        const numericValues = numbers.map(n => {
            const parsed = parseFloat(n.replace(',', '.'));
            return isNaN(parsed) ? null : parsed;
        }).filter(n => n !== null && n >= 0 && n <= 10) as number[];

        // Associar notas às disciplinas
        subjects.forEach((subject, index) => {
            gradeValues[subject] = numericValues[index] ?? null;
        });

        rows.push({
            studentName: potentialName,
            grades: gradeValues,
            rawLine: line,
        });
    }

    if (subjects.length === 0) {
        errors.push('Não foi possível identificar as disciplinas no PDF');
    }

    if (rows.length === 0) {
        errors.push('Não foi possível identificar as linhas de notas no PDF');
    }

    return {
        success: errors.length === 0 && rows.length > 0,
        className,
        quarter,
        subjects,
        rows,
        errors,
        rawText: text,
    };
}

/**
 * Processa um arquivo PDF do SIGE e retorna os dados extraídos
 */
export async function processSigePdf(file: File): Promise<SigeParseResult> {
    try {
        const text = await extractTextFromPdf(file);
        return parseSigeText(text);
    } catch (error) {
        return {
            success: false,
            subjects: [],
            rows: [],
            errors: [`Erro ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
        };
    }
}

/**
 * Grade pronta para ser importada no sistema
 */
export interface ImportableGrade {
    studentId: string;
    studentName: string;
    extractedName: string;
    similarity: number;
    classId: string;
    subject: string;
    quarter: string;
    grade: number;
    selected: boolean; // se o usuário quer importar
}

/**
 * Prepara as notas para importação, fazendo matching com alunos do sistema
 */
export function prepareGradesForImport(
    parseResult: SigeParseResult,
    students: { id: string; name: string; classId: string }[],
    classId: string,
    quarter: string
): ImportableGrade[] {
    const importableGrades: ImportableGrade[] = [];

    for (const row of parseResult.rows) {
        // Filtra alunos da turma selecionada
        const classStudents = students.filter(s => s.classId === classId);

        // Encontrar match
        const match = findBestStudentMatch(row.studentName, classStudents);

        if (match) {
            // Para cada disciplina com nota válida
            for (const [subject, grade] of Object.entries(row.grades)) {
                if (grade !== null && grade >= 0 && grade <= 10) {
                    importableGrades.push({
                        studentId: match.studentId,
                        studentName: match.studentName,
                        extractedName: row.studentName,
                        similarity: match.similarity,
                        classId,
                        subject,
                        quarter,
                        grade,
                        selected: match.similarity >= 0.9, // auto-seleciona se similaridade alta
                    });
                }
            }
        }
    }

    return importableGrades;
}

// ============================================================
// SUPORTE A EXCEL (XLS/XLSX)
// ============================================================

// ============================================================

// ATENÇÃO: normalizeSubjectName já foi definida globalmente acima

/**
 * Processa arquivo Excel do SIGE - Parser customizado para estrutura específica
 * Estrutura SIGE: 
 * - MÚLTIPLOS BLOCOS de disciplinas (os alunos se repetem com disciplinas diferentes)
 * - Cada bloco: linha de cabeçalho com disciplinas + linhas de dados
 */
export async function parseSigeExcel(file: File): Promise<SigeParseResult> {
    const errors: string[] = [];
    let allSubjects: string[] = [];
    let className: string | undefined;
    let quarter: string | undefined;

    // Lista de disciplinas conhecidas para identificar linhas de cabeçalho
    const knownSubjects = [
        'ARTE', 'BIOLOGIA', 'EDUCAÇÃO FÍSICA', 'FILOSOFIA', 'FÍSICA',
        'GEOGRAFIA', 'HISTÓRIA', 'INGLÊS', 'LÍNGUA PORTUGUESA', 'MATEMÁTICA',
        'QUÍMICA', 'SOCIOLOGIA', 'ESPANHOL', 'REDAÇÃO',
        'LINGUA PORTUGUESA', 'EDUCACAO FISICA', 'LINGUA ESTRANGEIRA',
        // Disciplinas técnicas/profissionais
        'INFORMATICA', 'INFORMATICA BASICA', 'INFORMÁTICA', 'INFORMÁTICA BÁSICA',
        'LOGÍSTICA', 'ADMINISTRAÇÃO', 'CONTABILIDADE', 'GESTÃO',
        'ENFERMAGEM', 'ELETRICIDADE', 'MECÂNICA', 'ELETRÔNICA'
    ];

    // Mapa para combinar notas por aluno (nome normalizado -> dados)
    const studentGradesMap: Map<string, { originalName: string; grades: Record<string, number | null> }> = new Map();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 5) {
            errors.push('Planilha vazia ou sem dados suficientes');
            return { success: false, subjects: [], rows: [], errors };
        }

        // Extrair informações da escola e período (primeiras 10 linhas)
        for (let i = 0; i < 10 && i < data.length; i++) {
            const rowText = data[i].join(' ');
            if (rowText.includes('ESCOLA:') || rowText.includes('Escola:')) {
                const match = rowText.match(/(\d+\.\d+\.\d+)/);
                if (match) className = match[1];
            }
            if (rowText.includes('Período') || rowText.includes('período')) {
                const bimMatch = rowText.match(/(\d)[ºª]?\s*Per/i);
                if (bimMatch) quarter = `${bimMatch[1]}º Bimestre`;
            }
        }

        // ENCONTRAR TODOS OS BLOCOS DE DISCIPLINAS
        interface Block {
            headerRow: number;
            subjectColumns: { index: number; name: string }[];
            nameColumnIndex: number;
        }

        const blocks: Block[] = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;

            // Verificar se esta linha tem disciplinas
            const foundSubjects: { index: number; name: string }[] = [];

            for (let j = 0; j < row.length; j++) {
                const cellValue = String(row[j] || '').trim().toUpperCase();

                if (cellValue.length > 2) {
                    for (const known of knownSubjects) {
                        if (cellValue.includes(known) || known.includes(cellValue)) {
                            foundSubjects.push({
                                index: j,
                                name: normalizeSubjectName(cellValue)
                            });
                            break;
                        }
                    }
                }
            }

            // Se encontrou 3+ disciplinas, é uma linha de cabeçalho
            if (foundSubjects.length >= 3) {
                // Encontrar coluna do nome
                let nameColumnIndex = 2;
                for (let j = 0; j < 5; j++) {
                    const cell = String(row[j] || '').toUpperCase();
                    if (cell.includes('ALUNO') || cell.includes('NOME') || cell.includes('DISCIP')) {
                        nameColumnIndex = j + 1;
                        break;
                    }
                }

                blocks.push({
                    headerRow: i,
                    subjectColumns: foundSubjects,
                    nameColumnIndex
                });

                // Adicionar disciplinas à lista única
                for (const subj of foundSubjects) {
                    if (!allSubjects.includes(subj.name)) {
                        allSubjects.push(subj.name);
                    }
                }
            }
        }

        if (blocks.length === 0) {
            errors.push('Não foi possível identificar blocos de disciplinas. Verifique se o arquivo é do SIGE.');
            return { success: false, subjects: [], rows: [], errors };
        }

        // PROCESSAR CADA BLOCO
        for (let b = 0; b < blocks.length; b++) {
            const block = blocks[b];
            const nextBlockStart = b < blocks.length - 1 ? blocks[b + 1].headerRow : data.length;

            // Processar linhas de dados deste bloco
            for (let i = block.headerRow + 1; i < nextBlockStart; i++) {
                const row = data[i];
                if (!row) continue;

                const studentName = String(row[block.nameColumnIndex] || '').trim();

                // Validar nome
                if (!studentName || studentName.length < 5) continue;
                if (/^\d+$/.test(studentName)) continue;
                if (studentName.split(' ').length < 2) continue;

                const upperName = studentName.toUpperCase();
                if (upperName.includes('TOTAL') || upperName.includes('MÉDIA') ||
                    upperName.includes('ASSINATURA') || upperName.includes('PROFESSORE') ||
                    upperName.includes('MAPA DE NOTAS')) continue;

                // Normalizar nome para matching
                const normalizedName = normalizeNameForComparison(studentName);

                // Extrair notas deste bloco
                for (const subjectCol of block.subjectColumns) {
                    const cellValue = row[subjectCol.index];

                    if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                        let grade: number | null = null;

                        if (typeof cellValue === 'number') {
                            grade = cellValue;
                        } else {
                            const parsed = parseFloat(String(cellValue).replace(',', '.'));
                            if (!isNaN(parsed)) {
                                grade = parsed;
                            }
                        }

                        // Validar nota
                        if (grade !== null && grade >= 0 && grade <= 10) {
                            // Adicionar ao mapa do aluno
                            if (!studentGradesMap.has(normalizedName)) {
                                studentGradesMap.set(normalizedName, {
                                    originalName: studentName,
                                    grades: {}
                                });
                            }
                            const studentData = studentGradesMap.get(normalizedName)!;
                            studentData.grades[subjectCol.name] = grade;
                        }
                    }
                }
            }
        }

        // Converter mapa para array de rows
        const rows: SigeGradeRow[] = [];
        for (const [, studentData] of studentGradesMap) {
            if (Object.keys(studentData.grades).length > 0) {
                rows.push({
                    studentName: studentData.originalName,
                    grades: studentData.grades,
                    rawLine: `${studentData.originalName}: ${Object.keys(studentData.grades).length} disciplinas`
                });
            }
        }

        if (rows.length === 0) {
            errors.push('Não foi possível identificar as linhas de notas.');
        }

    } catch (error) {
        errors.push(`Erro ao processar Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return {
        success: errors.length === 0 && studentGradesMap.size > 0,
        className,
        quarter,
        subjects: allSubjects,
        rows: Array.from(studentGradesMap.values()).map(s => ({
            studentName: s.originalName,
            grades: s.grades,
            rawLine: ''
        })),
        errors,
    };
}

/**
 * Processa arquivo do SIGE (detecta formato automaticamente)
 * Suporta PDF e Excel (XLS/XLSX)
 */
export async function processSigeFile(file: File): Promise<SigeParseResult> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
        return processSigePdf(file);
    } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        return parseSigeExcel(file);
    } else {
        return {
            success: false,
            subjects: [],
            rows: [],
            errors: ['Formato de arquivo não suportado. Use PDF, XLS ou XLSX.'],
        };
    }
}

