/**
 * SIGE Parser (Excel)
 * Extrai dados de notas do arquivo Excel "Mapa de Notas" do SIGE (Sistema de Gestão Escolar do Ceará)
 */

import * as XLSX from 'xlsx';

/**
 * Estrutura de uma linha de notas extraída do SIGE
 */
export interface SigeGradeRow {
    studentName: string;
    grades: Record<string, number | null>; // disciplina -> nota
    rawLine: string; // linha original para debug
}

const HEADER_NAME_KEYS = ['ALUNO', 'NOME', 'DISCENTE'];
const HEADER_EXACT_EXCLUDES = new Set([
    'N',
    'Nº',
    'NO',
    'NUM',
    'NUMERO',
    'MATRICULA',
    'MATRICULA SIGE',
    'ID',
    'ID CENSO',
    'CENSO',
    'CPF',
    'RG',
]);
const HEADER_CONTAINS_EXCLUDES = [
    'MATRIC',
    'CENSO',
    'TURMA',
    'SERIE',
    'SÉRIE',
    'CURSO',
    'TURNO',
    'ANO',
    'DATA',
    'NASC',
    'MOVIMENTO',
    'STATUS',
    'SITUACAO',
    'SITUAÇÃO',
    'TOTAL',
    'MEDIA',
    'MÉDIA',
    'RESULTADO',
    'RECUPERACAO',
    'RECUPERAÇÃO',
    'FALTAS',
    'FREQUENCIA',
    'FREQUÊNCIA',
    'DIAS',
    'AULAS',
    'OBS',
    'DISCIPLINA',
    'DISCIPLINAS',
];

const normalizeHeaderText = (value: string): string => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
};

const normalizeSubjectKey = (subject: string): string => normalizeHeaderText(subject);

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
    // Disciplinas técnicas de Redes de Computadores
    'BANCO DE DADOS': 'Banco de Dados',
    'SISTEMA OPERACIONAL': 'Sistema Operacional',
    'SISTEMAS OPERACIONAIS': 'Sistema Operacional',
    'GESTÃO DE STARTUPS': 'Gestão de Startups',
    'GESTAO DE STARTUPS': 'Gestão de Startups',
    'REDES DE COMPUTADORES': 'Redes de Computadores',
    'PROGRAMAÇÃO': 'Programação',
    'PROGRAMACAO': 'Programação',
    // Disciplinas técnicas adicionais
    'ADMINISTRACAO DA PRODUCAO QUALIDADE E PROCESSOS': 'Administração da Produção, Qualidade e Processos',
    'ADMINISTRAÇÃO DA PRODUÇÃO QUALIDADE E PROCESSOS': 'Administração da Produção, Qualidade e Processos',
    'ADMINISTRACAO DA PRODUCAO, QUALIDADE E PROCESSOS': 'Administração da Produção, Qualidade e Processos',
    'ADMINISTRAÇÃO DA PRODUÇÃO, QUALIDADE E PROCESSOS': 'Administração da Produção, Qualidade e Processos',
    'PRODUCAO': 'Produção',
    'PRODUÇÃO': 'Produção',
    'QUALIDADE': 'Qualidade',
    'PROCESSOS': 'Processos',
    'EMPREENDEDORISMO': 'Empreendedorismo',
    'GESTÃO': 'Gestão',
    'GESTAO': 'Gestão',
    'MARKETING': 'Marketing',
    'RECURSOS HUMANOS': 'Recursos Humanos',
    'FINANÇAS': 'Finanças',
    'FINANCAS': 'Finanças',
    'PROJETO INTEGRADOR': 'Projeto Integrador',
    'PROJETO DE VIDA': 'Projeto de Vida',
    'ELETIVA': 'Eletiva',
    'ESTUDO ORIENTADO': 'Estudo Orientado',
    'FORMAÇÃO PARA CIDADANIA': 'Formação para Cidadania',
    'FORMACAO PARA CIDADANIA': 'Formação para Cidadania',
    // Segurança e saúde
    'SEGURANCA DO TRABALHO': 'Segurança do Trabalho',
    'SEGURANÇA DO TRABALHO': 'Segurança do Trabalho',
    'SAUDE E SEGURANCA': 'Saúde e Segurança',
    'SAÚDE E SEGURANÇA': 'Saúde e Segurança',
    // Tecnologia
    'HARDWARE': 'Hardware',
    'SOFTWARE': 'Software',
    'ARQUITETURA DE COMPUTADORES': 'Arquitetura de Computadores',
    'CABEAMENTO ESTRUTURADO': 'Cabeamento Estruturado',
    'SEGURANCA DA INFORMACAO': 'Segurança da Informação',
    'SEGURANÇA DA INFORMAÇÃO': 'Segurança da Informação',
};

const SUBJECT_MAPPING = new Map(
    Object.entries(GLOBAL_SUBJECT_MAPPING).map(([key, value]) => [
        normalizeSubjectKey(key),
        value,
    ]),
);

/**
 * Normaliza nome de disciplina usando o mapeamento global
 */
export function normalizeSubjectName(subject: string): string {
    const normalized = normalizeSubjectKey(subject);
    // Tenta match exato
    const directMatch = SUBJECT_MAPPING.get(normalized);
    if (directMatch) {
        return directMatch;
    }

    return subject.replace(/\s+/g, ' ').trim();
}

/**
 * Resultado da extração do SIGE
 */
export interface SigeParseResult {
    success: boolean;
    className?: string;
    quarter?: string;
    schoolYear?: 1 | 2 | 3;
    subjects: string[];
    rows: SigeGradeRow[];
    errors: string[];
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
    schoolYear?: 1 | 2 | 3;
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

const isNameHeaderCell = (value: string): boolean => {
    const normalized = normalizeHeaderText(value);
    return HEADER_NAME_KEYS.some((key) => normalized.includes(key));
};

const isExcludedHeader = (normalized: string): boolean => {
    if (!normalized) return false;
    if (HEADER_EXACT_EXCLUDES.has(normalized)) return true;
    return HEADER_CONTAINS_EXCLUDES.some((part) => normalized.includes(part));
};

const isLikelySubjectHeader = (value: string): boolean => {
    const normalized = normalizeHeaderText(value);
    if (!normalized) return false;

    // Deve ter pelo menos uma letra
    if (!/[A-Z]/.test(normalized)) return false;

    // Não pode ser coluna de nome
    if (HEADER_NAME_KEYS.some((key) => normalized.includes(key))) return false;

    // Não pode ser coluna excluída
    if (isExcludedHeader(normalized)) return false;

    // Contar caracteres alfabéticos
    const alphaCount = (normalized.match(/[A-Z]/g) || []).length;

    // Se tem pelo menos 3 caracteres alfabéticos, provavelmente é uma disciplina
    if (alphaCount >= 3) return true;

    // Aceitar abreviações curtas (2-4 letras)
    if (alphaCount >= 2 && normalized.length <= 5) return true;

    // Aceitar nomes compostos longos (ex: "SISTEMA OPERACIONAL I")
    // que são comuns em cursos técnicos
    const words = normalized.split(/\s+/);
    if (words.length >= 2) {
        // Se tem múltiplas palavras com pelo menos 3 letras cada
        const significantWords = words.filter(w => w.length >= 3);
        if (significantWords.length >= 2) return true;
    }

    return false;
};

const parseGradeValue = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') {
        return value;
    }
    const cleaned = String(value).replace(',', '.');
    const match = cleaned.match(/\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = parseFloat(match[0]);
    return isNaN(parsed) ? null : parsed;
};

const isLikelyStudentName = (value: unknown): boolean => {
    const name = String(value || '').trim();
    if (!name || name.length < 5) return false;
    const upperName = name.toUpperCase();
    if (
        upperName.includes('TOTAL') ||
        upperName.includes('MÉDIA') ||
        upperName.includes('MEDIA') ||
        upperName.includes('ASSINATURA') ||
        upperName.includes('PROFESSORE') ||
        upperName.includes('MAPA DE NOTAS')
    ) {
        return false;
    }
    if (/^\d+$/.test(name)) return false;
    if (name.split(' ').length < 2) return false;
    return true;
};

const findNameColumnIndex = (
    data: any[][],
    headerRow: number,
    nextBlockStart: number,
    fallbackIndex: number,
): number => {
    const header = data[headerRow] || [];
    const candidateIndices = new Set<number>();
    const maxCandidate = Math.min(header.length, 8);
    for (let i = 0; i < maxCandidate; i++) {
        candidateIndices.add(i);
    }
    if (fallbackIndex >= 0) {
        candidateIndices.add(fallbackIndex);
        candidateIndices.add(fallbackIndex - 1);
        candidateIndices.add(fallbackIndex + 1);
    }

    let bestIndex = fallbackIndex >= 0 ? fallbackIndex : 2;
    let bestScore = -1;
    const endRow = Math.min(nextBlockStart, headerRow + 30);

    for (const index of candidateIndices) {
        if (index < 0 || index >= header.length) continue;
        let score = 0;
        for (let rowIndex = headerRow + 1; rowIndex < endRow; rowIndex++) {
            const cellValue = data[rowIndex]?.[index];
            if (isLikelyStudentName(cellValue)) {
                score += 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }

    return bestIndex;
};

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
    let schoolYear: 1 | 2 | 3 | undefined;
    const allSubjectKeys = new Set<string>();
    const subjectDisplayByKey = new Map<string, string>();

    const getSubjectDisplay = (rawValue: string) => {
        const cleaned = String(rawValue || '').replace(/\s+/g, ' ').trim();
        const key = normalizeHeaderText(cleaned);
        if (!key) {
            return { key: '', display: cleaned };
        }
        const existing = subjectDisplayByKey.get(key);
        if (existing) {
            return { key, display: existing };
        }
        subjectDisplayByKey.set(key, cleaned);
        return { key, display: cleaned };
    };

    // Lista de disciplinas comuns da Base Nacional Comum (para priorização, não exclusão)
    const commonSubjects = [
        'ARTE', 'BIOLOGIA', 'EDUCAÇÃO FÍSICA', 'EDUCACAO FISICA', 'FILOSOFIA', 'FÍSICA', 'FISICA',
        'GEOGRAFIA', 'HISTÓRIA', 'HISTORIA', 'INGLÊS', 'INGLES', 'LÍNGUA PORTUGUESA', 'LINGUA PORTUGUESA',
        'MATEMÁTICA', 'MATEMATICA', 'QUÍMICA', 'QUIMICA', 'SOCIOLOGIA', 'ESPANHOL', 'REDAÇÃO', 'REDACAO',
        'LINGUA ESTRANGEIRA',
        // Abreviações comuns
        'ART', 'BIO', 'EDF', 'FIL', 'FIS', 'GEO', 'HIS', 'ING', 'LNG', 'POR',
        'MAT', 'QUI', 'SOC', 'ESP', 'RED',
        // Palavras-chave para identificar disciplinas técnicas
        'BANCO', 'DADOS', 'SISTEMA', 'OPERACIONAL', 'REDES', 'COMPUTADORES', 'PROGRAMAÇÃO', 'PROGRAMACAO',
        'DESENVOLVIMENTO', 'HARDWARE', 'SOFTWARE', 'SEGURANÇA', 'INFORMAÇÃO', 'ARQUITETURA',
        'CABEAMENTO', 'INFORMATICA', 'INFORMÁTICA', 'LOGÍSTICA', 'LOGISTICA', 'ADMINISTRAÇÃO', 'ADMINISTRACAO',
        'CONTABILIDADE', 'GESTÃO', 'GESTAO', 'ENFERMAGEM', 'ELETRICIDADE', 'MECÂNICA', 'MECANICA',
        'ELETRÔNICA', 'ELETRONICA', 'STARTUPS', 'EMPREENDEDORISMO', 'PROJETO', 'VIDA', 'FORMAÇÃO', 'FORMACAO',
        'ELETIVA', 'ESTUDO', 'ORIENTADO', 'TÉCNICO', 'TECNICO', 'PROFISSIONAL'
    ];
    const commonSubjectsNormalized = commonSubjects.map(normalizeSubjectKey);

    // Verifica se uma disciplina tem palavras-chave conhecidas (mais flexível)
    const hasCommonKeywords = (normalized: string): boolean => {
        return commonSubjectsNormalized.some((known) => {
            if (normalized === known) return true;
            if (normalized.includes(known) && known.length >= 3) return true;
            if (known.includes(normalized) && normalized.length >= 3) return true;
            return false;
        });
    };

    // Mapa para combinar notas por aluno (nome normalizado -> dados)
    const studentGradesMap: Map<string, { originalName: string; grades: Record<string, number | null> }> = new Map();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        if (workbook.SheetNames.length === 0) {
            errors.push('Nenhuma planilha encontrada no arquivo.');
            return { success: false, subjects: [], rows: [], errors };
        }

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (data.length < 5) {
                continue;
            }

            // Extrair informações da escola e período (primeiras 10 linhas)
            for (let i = 0; i < 10 && i < data.length; i++) {
                const rowText = data[i].join(' ');
                if (!className && (rowText.includes('ESCOLA:') || rowText.includes('Escola:'))) {
                    const match = rowText.match(/(\d+\.\d+\.\d+)/);
                    if (match) className = match[1];
                }
                if (!quarter && (rowText.includes('Período') || rowText.includes('período'))) {
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
            const processedHeaderRows = new Set<number>();

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row || processedHeaderRows.has(i)) continue;

                // Verificar se esta linha tem disciplinas
                const subjectColumnsMap = new Map<number, string>();
                const nameHeaderIndex = row.findIndex((cell: any) => isNameHeaderCell(String(cell || '')));
                let commonSubjectCount = 0;

                for (let j = 0; j < row.length; j++) {
                    const rawValue = String(row[j] || '').trim();
                    if (!rawValue) continue;

                    const normalized = normalizeHeaderText(rawValue);
                    if (!normalized) continue;

                    // Pular apenas colunas antes da coluna de nome (não igual)
                    if (nameHeaderIndex >= 0 && j < nameHeaderIndex) continue;

                    // Se é a coluna de nome, pular
                    if (HEADER_NAME_KEYS.some((key) => normalized.includes(key))) continue;
                    if (isExcludedHeader(normalized)) continue;

                    const hasKeywords = hasCommonKeywords(normalized);

                    // NOVA LÓGICA: Mais flexível - aceita qualquer texto que pareça disciplina
                    // Não exige que seja "conhecida", apenas que tenha características de disciplina
                    if (hasKeywords || isLikelySubjectHeader(rawValue)) {
                        if (hasKeywords) {
                            commonSubjectCount += 1;
                        }

                        const { key, display } = getSubjectDisplay(rawValue);
                        if (!key) continue;
                        subjectColumnsMap.set(j, display);

                        // Log de debug - REMOVER DEPOIS
                        console.log(`[DEBUG] (${sheetName}) Linha ${i}, Coluna ${j}: "${rawValue}" -> "${display}" (comum: ${hasKeywords})`);
                    }
                }

                const subjectColumns = Array.from(subjectColumnsMap.entries()).map(([index, name]) => ({
                    index,
                    name,
                }));

                const hasNameHeader = nameHeaderIndex >= 0;

                // LÓGICA MAIS FLEXÍVEL: aceitar blocos com disciplinas mesmo que não sejam "conhecidas"
                // Aceitar se:
                // 1. Tem cabeçalho de nome "Alunos / Disciplinas" E pelo menos 1 disciplina
                // 2. Tem pelo menos 1 disciplina comum (conhecida)
                // 3. Tem pelo menos 2 disciplinas que parecem ser nomes de matérias
                const minSubjects = hasNameHeader ? 1 : 2;
                if (subjectColumns.length < minSubjects) continue;

                // Se não tem cabeçalho de nome, exigir pelo menos alguma palavra-chave conhecida ou várias colunas
                if (!hasNameHeader) {
                    // Precisa ter pelo menos 1 disciplina com palavra-chave conhecida OU 3+ colunas
                    if (commonSubjectCount === 0 && subjectColumns.length < 3) continue;
                }

                const nameColumnIndex = hasNameHeader ? nameHeaderIndex : 2;

                blocks.push({
                    headerRow: i,
                    subjectColumns,
                    nameColumnIndex,
                });

                processedHeaderRows.add(i);

                // Adicionar disciplinas à lista única
                for (const subj of subjectColumns) {
                    const subjKey = normalizeHeaderText(subj.name);
                    if (subjKey && !allSubjectKeys.has(subjKey)) {
                        allSubjectKeys.add(subjKey);
                        allSubjects.push(subj.name);
                    }
                }

                // Log de debug - REMOVER DEPOIS
                console.log(`[DEBUG] (${sheetName}) Bloco ${blocks.length} encontrado na linha ${i} com ${subjectColumns.length} disciplinas:`, subjectColumns.map(s => s.name).join(', '));
            }

            console.log(`[DEBUG] (${sheetName}) Total de blocos identificados: ${blocks.length}`);

            if (blocks.length === 0) {
                continue;
            }

            // PROCESSAR CADA BLOCO
            for (let b = 0; b < blocks.length; b++) {
                const block = blocks[b];
                const nextBlockStart = b < blocks.length - 1 ? blocks[b + 1].headerRow : data.length;
                const nameColumnIndex = findNameColumnIndex(
                    data,
                    block.headerRow,
                    nextBlockStart,
                    block.nameColumnIndex,
                );

                console.log(`[DEBUG] (${sheetName}) Processando bloco ${b + 1}/${blocks.length}, linhas ${block.headerRow + 1} até ${nextBlockStart - 1}, coluna de nome: ${nameColumnIndex}`);

                // Processar linhas de dados deste bloco
                let studentsInBlock = 0;
                for (let i = block.headerRow + 1; i < nextBlockStart; i++) {
                    const row = data[i];
                    if (!row) continue;

                    const studentName = String(row[nameColumnIndex] || '').trim();

                    // Validar nome
                    if (!isLikelyStudentName(studentName)) continue;

                    studentsInBlock++;

                    // Normalizar nome para matching
                    const normalizedName = normalizeNameForComparison(studentName);

                    // Extrair notas deste bloco
                    let gradesAddedForStudent = 0;
                    for (const subjectCol of block.subjectColumns) {
                        const cellValue = row[subjectCol.index];
                        const grade = parseGradeValue(cellValue);

                        // Validar nota (permitir 0 como nota válida)
                        if (grade !== null && grade >= 0 && grade <= 10) {
                            // Adicionar ao mapa do aluno
                            if (!studentGradesMap.has(normalizedName)) {
                                studentGradesMap.set(normalizedName, {
                                    originalName: studentName,
                                    grades: {},
                                });
                            }
                            const studentData = studentGradesMap.get(normalizedName)!;

                            // Sobrescrever nota se já existir (o último bloco prevalece)
                            studentData.grades[subjectCol.name] = grade;
                            gradesAddedForStudent++;
                        }
                    }

                    if (gradesAddedForStudent > 0) {
                        console.log(`[DEBUG] (${sheetName}) Aluno "${studentName}" - ${gradesAddedForStudent} notas capturadas neste bloco`);
                    }
                }

                console.log(`[DEBUG] (${sheetName}) Bloco ${b + 1}: ${studentsInBlock} alunos processados`);
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

        // Log de resumo - REMOVER DEPOIS
        console.log(`[DEBUG] === RESUMO DA IMPORTAÇÃO ===`);
        console.log(`[DEBUG] Total de disciplinas únicas: ${allSubjects.length}`);
        console.log(`[DEBUG] Disciplinas: ${allSubjects.join(', ')}`);
        console.log(`[DEBUG] Total de alunos: ${rows.length}`);
        if (rows.length > 0) {
            console.log(`[DEBUG] Exemplo - ${rows[0].studentName}: ${Object.keys(rows[0].grades).length} disciplinas`);
            console.log(`[DEBUG] Disciplinas do aluno: ${Object.keys(rows[0].grades).join(', ')}`);
        }
        console.log(`[DEBUG] =============================`);

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
        schoolYear,
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
 * Processa arquivo do SIGE (Excel)
 * Suporta XLS/XLSX
 */
export async function processSigeFile(file: File): Promise<SigeParseResult> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        return parseSigeExcel(file);
    } else {
        return {
            success: false,
            subjects: [],
            rows: [],
            errors: ['Formato de arquivo não suportado. Use XLS ou XLSX.'],
        };
    }
}
