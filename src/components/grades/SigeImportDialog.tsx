import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Settings,
    Users,
    BookOpen,
    ArrowRight,
    Upload,
    FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClasses, useStudents, useGradesScoped, useProfessionalSubjects, useProfessionalSubjectTemplates } from '@/hooks/useData';
import { QUARTERS, getAllSubjects } from '@/lib/subjects';
import {
    processSigeFile,
    ImportableGrade,
    SigeParseResult,
    calculateNameSimilarity,
    normalizeSubjectName,
    normalizeNameForComparison
} from '@/lib/sigeParser';

interface StudentMatch {
    fileStudentName: string;
    systemStudentId: string | null;
    similarity: number;
    isManual: boolean;
}

// Mapeamento de disciplina do Excel para disciplina do sistema
interface SubjectMapping {
    excelSubject: string;           // Nome como veio do Excel
    systemSubject: string | null;   // Disciplina do sistema (null = ignorar)
    autoMatched: boolean;           // Se foi match automático ou manual
}

interface SigeImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultClassId?: string;
    defaultQuarter?: string;
    defaultSchoolYear?: 1 | 2 | 3;
    onRefresh?: () => Promise<void>;
}

export const SigeImportDialog = ({
    open,
    onOpenChange,
    defaultClassId,
    defaultQuarter,
    defaultSchoolYear,
    onRefresh,
}: SigeImportDialogProps) => {
    const { classes } = useClasses();
    const { students } = useStudents();
    const { professionalSubjects } = useProfessionalSubjects();
    const { templates } = useProfessionalSubjectTemplates();
    const { toast } = useToast();

    const [step, setStep] = useState<'configure' | 'upload' | 'match-students' | 'map-subjects' | 'review-subjects' | 'preview'>('configure');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importPhase, setImportPhase] = useState<'deleting' | 'importing'>('importing');
    const [parseResult, setParseResult] = useState<SigeParseResult | null>(null);
    const [fileQuarter, setFileQuarter] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('1º Bimestre');
    const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);
    const [replaceExisting, setReplaceExisting] = useState(true); // Por padrão, substituir
    const [importableGrades, setImportableGrades] = useState<ImportableGrade[]>([]);
    const [studentMatches, setStudentMatches] = useState<StudentMatch[]>([]);
    const [subjectMappings, setSubjectMappings] = useState<SubjectMapping[]>([]);
    const [lastSelectedClass, setLastSelectedClass] = useState<string | null>(null);
    const mappingKeyRef = useRef<string | null>(null);

    const { addGrades, deleteGrades, grades: existingGrades } = useGradesScoped({
        classId: selectedClass || undefined,
        quarter: selectedQuarter || undefined,
        schoolYear: selectedSchoolYear,
    });

    const activeClasses = classes.filter(c => !c.archived && c.active);
    const schoolYearOptions: Array<{ value: 1 | 2 | 3; label: string }> = [
        { value: 1, label: '1º ano' },
        { value: 2, label: '2º ano' },
        { value: 3, label: '3º ano' },
    ];
    const selectedClassData = useMemo(
        () => classes.find((c) => c.id === selectedClass),
        [classes, selectedClass],
    );
    const allowUnlistedSubjects = !selectedClassData?.templateId;

    useEffect(() => {
        if (!open) return;
        if (defaultClassId) setSelectedClass(defaultClassId);
        if (defaultQuarter) setSelectedQuarter(defaultQuarter);
        if (defaultSchoolYear) setSelectedSchoolYear(defaultSchoolYear);
    }, [open, defaultClassId, defaultQuarter, defaultSchoolYear]);

    useEffect(() => {
        if (!selectedClass) {
            setSelectedSchoolYear(defaultSchoolYear ?? 1);
            setLastSelectedClass(null);
            return;
        }
        if (selectedClass === lastSelectedClass) return;

        const useDefaultForClass = defaultClassId && selectedClass === defaultClassId;
        const baseYear = useDefaultForClass
            ? (defaultSchoolYear ?? selectedClassData?.currentYear ?? 1)
            : (selectedClassData?.currentYear ?? 1);
        const parsedYear = Number(baseYear);
        const normalizedYear = [1, 2, 3].includes(parsedYear)
            ? (parsedYear as 1 | 2 | 3)
            : 1;
        setSelectedSchoolYear(normalizedYear);
        setLastSelectedClass(selectedClass);
    }, [
        selectedClass,
        selectedClassData?.currentYear,
        defaultClassId,
        defaultSchoolYear,
        lastSelectedClass,
    ]);

    const normalizeTemplateYear = (value: unknown): 1 | 2 | 3 | null => {
        if (value === null || value === undefined) return null;
        const str = String(value).trim();
        // extrai primeiro dígito 1, 2 ou 3 de strings como "3", "3º", "3 ano", "Ano 3"
        const digitMatch = str.match(/[1-3]/);
        if (digitMatch) {
            const parsed = Number(digitMatch[0]);
            if (parsed === 1 || parsed === 2 || parsed === 3) {
                return parsed as 1 | 2 | 3;
            }
        }
        return null;
    };

    const getTemplateSubjectsForClass = (classId: string, schoolYear: 1 | 2 | 3 = selectedSchoolYear): string[] => {
        const classData = classes.find((c) => c.id === classId);
        if (!classData?.templateId) return [];
        const template = templates.find((t) => t.id === classData.templateId);
        if (!template) return [];
        const yearData = template.subjectsByYear.find(
            (y) => normalizeTemplateYear(y.year) === schoolYear,
        );
        return yearData?.subjects ?? [];
    };

    // NOVA: Retorna TODAS as disciplinas do template de todos os anos
    // Usado para validação na importação - aceita disciplinas de qualquer ano
    const getAllTemplateSubjectsForClass = (classId: string): string[] => {
        const classData = classes.find((c) => c.id === classId);
        if (!classData?.templateId) return [];
        const template = templates.find((t) => t.id === classData.templateId);
        if (!template) return [];

        const allSubjects = new Set<string>();
        for (const yearData of template.subjectsByYear) {
            for (const subject of yearData.subjects) {
                allSubjects.add(subject);
            }
        }
        return Array.from(allSubjects);
    };

    const templateSubjectsForSelectedClass = useMemo(
        () => (selectedClass ? getTemplateSubjectsForClass(selectedClass, selectedSchoolYear) : []),
        [selectedClass, classes, templates, selectedSchoolYear],
    );

    // Função para obter disciplinas válidas de uma turma
    // Retorna tanto o nome original quanto o normalizado para comparação flexível
    // IMPORTANTE: Se há template, usa apenas disciplinas do ano selecionado.
    const getValidSubjectsForClass = (
        classId: string,
        schoolYear: 1 | 2 | 3 = selectedSchoolYear,
        templateSubjectsOverride?: string[]
    ): { original: string; normalized: string }[] => {
        const classData = classes.find((c) => c.id === classId);
        const hasTemplate = !!classData?.templateId;

        // Disciplinas da Base Nacional Comum (ENEM)
        const baseSubjects = getAllSubjects().map(s => ({
            original: s,
            normalized: normalizeNameForComparison(normalizeSubjectName(s))
        }));

        // Apenas disciplinas do template para o ano selecionado.
        const templateSubjects = hasTemplate
            ? (templateSubjectsOverride ?? getTemplateSubjectsForClass(classId, schoolYear))
            : [];

        // Disciplinas Profissionais da turma (manuais)
        const classSubjects = hasTemplate
            ? []
            : (professionalSubjects || [])
                .filter(ps => ps.classId === classId)
                .map(ps => ({
                    original: ps.subject,
                    normalized: normalizeNameForComparison(normalizeSubjectName(ps.subject))
                }));

        // Combinar ambas (sem duplicatas por nome normalizado)
        const seenNormalized = new Set<string>();
        const allValidSubjects: { original: string; normalized: string }[] = [];

        for (const subj of [
            ...baseSubjects,
            ...templateSubjects.map((subject) => ({
                original: subject,
                normalized: normalizeNameForComparison(normalizeSubjectName(subject)),
            })),
            ...classSubjects,
        ]) {
            if (!seenNormalized.has(subj.normalized)) {
                seenNormalized.add(subj.normalized);
                allValidSubjects.push(subj);
            }
        }

        return allValidSubjects;
    };

    const normalizeSubjectForMatch = (value: string): string => {
        return normalizeNameForComparison(normalizeSubjectName(value));
    };

    // Função para verificar se uma disciplina é válida (comparação normalizada)
    // Usa matching baseado em palavras para disciplinas técnicas longas
    const isValidSubject = (
        subject: string,
        validSubjects: { original: string; normalized: string }[],
        mappings: SubjectMapping[] = [],
        allowUnlisted = false,
        debug = false
    ): string | null => {
        const normalizedSubject = normalizeSubjectForMatch(subject);

        // 1. PRIORIDADE: verificar se há mapeamento manual
        const manualMapping = mappings.find(
            m => normalizeSubjectForMatch(m.excelSubject) === normalizedSubject
        );
        if (manualMapping) {
            if (debug) console.log(`[SUBJECT MATCH] "${subject}" → Manual mapping: ${manualMapping.systemSubject ?? 'IGNORADO'}`);
            if (manualMapping.systemSubject === null) return null;
            if (allowUnlisted) return manualMapping.systemSubject;

            const normalizedManual = normalizeSubjectForMatch(manualMapping.systemSubject);
            const allowed = validSubjects.some(vs => vs.normalized === normalizedManual);
            return allowed ? manualMapping.systemSubject : null;
        }
        // Palavras significativas (ignorar preposições curtas)
        const subjectWords = normalizedSubject.split(/\s+/).filter(w => w.length > 2);

        if (debug) {
            console.log(`[SUBJECT MATCH] "${subject}"`);
            console.log(`  → Normalized: "${normalizedSubject}"`);
            console.log(`  → Words: [${subjectWords.join(', ')}]`);
        }

        // 2. Match exato pelo nome normalizado
        const exactMatch = validSubjects.find(vs => vs.normalized === normalizedSubject);
        if (exactMatch) {
            if (debug) console.log(`  → EXACT MATCH: "${exactMatch.original}"`);
            return exactMatch.original;
        }

        // 3. Word-based similarity (pelo menos 60% das palavras coincidem)
        let bestWordMatch: { subject: string; ratio: number } | null = null;

        for (const vs of validSubjects) {
            const targetWords = vs.normalized.split(/\s+/).filter(w => w.length > 2);
            if (targetWords.length === 0 || subjectWords.length === 0) continue;

            // Contar palavras que coincidem (incluindo parcialmente)
            const matchingWords = subjectWords.filter(w =>
                targetWords.some(tw => tw.includes(w) || w.includes(tw))
            );

            const matchRatio = matchingWords.length / Math.max(subjectWords.length, targetWords.length);

            if (debug && matchRatio > 0.3) {

            }

            if (matchRatio >= 0.6 && (!bestWordMatch || matchRatio > bestWordMatch.ratio)) {
                bestWordMatch = { subject: vs.original, ratio: matchRatio };
            }
        }

        if (bestWordMatch) {

            return bestWordMatch.subject;
        }

        // 4. Substring match como fallback (uma contém a outra)
        const substringMatch = validSubjects.find((vs) => {
            const targetNormalized = vs.normalized;
            if (Math.min(normalizedSubject.length, targetNormalized.length) < 3) return false;
            if (normalizedSubject.includes(targetNormalized) || targetNormalized.includes(normalizedSubject)) {
                return true;
            }
            return false;
        });

        if (substringMatch) {
            if (debug) console.log(`  → SUBSTRING MATCH: "${substringMatch.original}"`);
            return substringMatch.original;
        }

        if (debug) console.log(`  → NO MATCH FOUND`);
        return null; // Não encontrou match
    };


    // Função para preparar mapeamentos de disciplinas
    const prepareSubjectMappings = () => {
        if (!parseResult || !selectedClass) return;

        const validSubjects = getValidSubjectsForClass(selectedClass, selectedSchoolYear, templateSubjectsForSelectedClass);
        const mappings: SubjectMapping[] = [];

        // Debug: mostrar breakdown de disciplinas
        const templateByYear = getTemplateSubjectsForClass(selectedClass, selectedSchoolYear);
        const templateAll = getAllTemplateSubjectsForClass(selectedClass);

        // Usar apenas disciplinas presentes nas notas dos alunos mapeados
        const matchedNames = new Set(
            studentMatches
                .filter(m => m.systemStudentId)
                .map(m => normalizeNameForComparison(m.fileStudentName))
        );
        const sourceRows = matchedNames.size > 0
            ? parseResult.rows.filter(r => matchedNames.has(normalizeNameForComparison(r.studentName)))
            : parseResult.rows;
        const subjectMap = new Map<string, string>();
        for (const row of sourceRows) {
            for (const subject of Object.keys(row.grades)) {
                const normalized = normalizeSubjectForMatch(subject);
                if (!subjectMap.has(normalized)) {
                    subjectMap.set(normalized, subject);
                }
            }
        }
        const excelSubjects = subjectMap.size > 0
            ? Array.from(subjectMap.values())
            : parseResult.subjects;

        for (const excelSubject of excelSubjects) {
            const autoMatch = isValidSubject(excelSubject, validSubjects, [], allowUnlistedSubjects, true);
            mappings.push({
                excelSubject,
                systemSubject: autoMatch,
                autoMatched: autoMatch !== null
            });
        }

        const matched = mappings.filter(m => m.autoMatched).length;
        const unmatched = mappings.filter(m => !m.autoMatched).length;


        setSubjectMappings(mappings);
        setStep('map-subjects');
    };

    useEffect(() => {
        if (!parseResult || !selectedClass) return;
        if (step !== 'map-subjects' && step !== 'review-subjects' && step !== 'preview') return;

        const templateKey = templateSubjectsForSelectedClass.join('|');
        const parseKey = parseResult.subjects.join('|');
        const mappingKey = `${selectedClass}|${selectedSchoolYear}|${selectedClassData?.templateId ?? ''}|${templateKey}|${parseKey}`;

        if (mappingKeyRef.current === mappingKey) return;
        mappingKeyRef.current = mappingKey;
        prepareSubjectMappings();
    }, [
        parseResult,
        selectedClass,
        selectedSchoolYear,
        selectedClassData?.templateId,
        step,
        templateSubjectsForSelectedClass,
    ]);

    // Reset mapeamento quando turma ou ano mudarem (evita cache de ano anterior)
    useEffect(() => {
        mappingKeyRef.current = null;
        setSubjectMappings([]);
    }, [selectedClass, selectedSchoolYear]);


    // Função para atualizar um mapeamento
    const updateSubjectMapping = (excelSubject: string, systemSubject: string | null) => {
        setSubjectMappings(prev => prev.map(m =>
            m.excelSubject === excelSubject
                ? { ...m, systemSubject, autoMatched: false }
                : m
        ));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isValidFormat = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');

        if (!isValidFormat) {
            toast({
                title: 'Formato inválido',
                description: 'Por favor, selecione um arquivo XLS ou XLSX.',
                variant: 'destructive',
            });
            return;
        }

        setStep('upload');
        setParseResult(null);
        setFileQuarter(null);
        setImportableGrades([]);
        setStudentMatches([]);
        mappingKeyRef.current = null;
        setIsProcessing(true);
        try {
            const result = await processSigeFile(file);

            if (result.success) {
                const subjectsSummary = result.subjects.length <= 5
                    ? result.subjects.join(', ')
                    : `${result.subjects.slice(0, 5).join(', ')}... (+${result.subjects.length - 5})`;

                toast({
                    title: 'Excel processado com sucesso',
                    description: `${result.rows.length} alunos e ${result.subjects.length} disciplinas encontradas: ${subjectsSummary}`,
                });


                setFileQuarter(result.quarter ?? null);
                if (result.quarter && result.quarter !== selectedQuarter) {
                    toast({
                        title: 'Bimestre detectado no arquivo',
                        description: `Arquivo indica ${result.quarter}, mas está selecionado ${selectedQuarter}.`,
                    });
                }

                // Preparar matches imediatamente com o resultado
                if (selectedClass) {
                    const classStudents = students.filter(s => s.classId === selectedClass);
                    const uniqueStudentNames = Array.from(new Set(result.rows.map(r => r.studentName)));

                    const matches: StudentMatch[] = uniqueStudentNames.map(fileStudentName => {
                        let bestMatch: { student: typeof classStudents[0], score: number } | null = null;

                        for (const student of classStudents) {
                            const score = calculateNameSimilarity(fileStudentName, student.name);
                            if (!bestMatch || score > bestMatch.score) {
                                bestMatch = { student, score };
                            }
                        }

                        return {
                            fileStudentName,
                            systemStudentId: (bestMatch && bestMatch.score >= 0.6) ? bestMatch.student.id : null,
                            similarity: bestMatch ? bestMatch.score : 0,
                            isManual: false
                        };
                    });

                    // Ordenar
                    matches.sort((a, b) => {
                        if (a.similarity < 0.9 && b.similarity >= 0.9) return -1;
                        if (a.similarity >= 0.9 && b.similarity < 0.9) return 1;
                        return a.fileStudentName.localeCompare(b.fileStudentName);
                    });

                    setStudentMatches(matches);
                }

                setParseResult(result);

                setStep('match-students');
            } else {
                toast({
                    title: 'Erro ao processar Excel',
                    description: result.errors.join(', '),
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível processar o arquivo.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrepareMatching = () => {
        if (!parseResult || !selectedClass) return;

        const classStudents = students.filter(s => s.classId === selectedClass);

        // Agrupar linhas por nome de aluno para criar matches únicos
        const uniqueStudentNames = Array.from(new Set(parseResult.rows.map(r => r.studentName)));

        const matches: StudentMatch[] = uniqueStudentNames.map(fileStudentName => {
            // Encontrar melhor match
            let bestMatch: { student: typeof classStudents[0], score: number } | null = null;

            for (const student of classStudents) {
                const score = calculateNameSimilarity(fileStudentName, student.name);
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { student, score };
                }
            }

            // Auto-selecionar se score >= 0.6 (já que temos validação manual agora, podemos ser mais lenientes na sugestão)
            return {
                fileStudentName,
                systemStudentId: (bestMatch && bestMatch.score >= 0.6) ? bestMatch.student.id : null,
                similarity: bestMatch ? bestMatch.score : 0,
                isManual: false
            };
        });

        // Ordenar: primeiro os com menor score (para atenção), depois alfabético
        matches.sort((a, b) => {
            if (a.similarity < 0.9 && b.similarity >= 0.9) return -1;
            if (a.similarity >= 0.9 && b.similarity < 0.9) return 1;
            return a.fileStudentName.localeCompare(b.fileStudentName);
        });

        setStudentMatches(matches);
        setStep('match-students');
    };

    const handleConfirmMatches = () => {
        // Ir para o passo de mapeamento de disciplinas
        mappingKeyRef.current = null; // força recalcular mapeamento com ano atual
        prepareSubjectMappings();
    };

    const handleConfirmSubjects = () => {
        if (!parseResult) return;

        const classStudents = students.filter(s => s.classId === selectedClass);
        const validSubjects = getValidSubjectsForClass(selectedClass, selectedSchoolYear, templateSubjectsForSelectedClass);
        const grades: ImportableGrade[] = [];

        // 📊 ESTATÍSTICAS DE DEBUG
        let totalNotasNoArquivo = 0;
        let notasDescartadasPorAluno = 0;
        let notasDescartadasPorDisciplina = 0;
        let notasDescartadasPorValorInvalido = 0;
        let notasValidas = 0;

        // Para cada match confirmado
        for (const match of studentMatches) {
            const systemStudent = classStudents.find(s => s.id === match.systemStudentId);

            // Encontrar TODAS as linhas de notas para este nome do arquivo
            const studentRows = parseResult.rows.filter(r => r.studentName === match.fileStudentName);

            for (const row of studentRows) {
                for (const [subject, grade] of Object.entries(row.grades)) {
                    totalNotasNoArquivo++;

                    // Verificar por que a nota seria descartada
                    if (!match.systemStudentId || !systemStudent) {
                        notasDescartadasPorAluno++;
                        continue;
                    }

                    if (grade === null || grade < 0 || grade > 10) {
                        notasDescartadasPorValorInvalido++;
                        continue;
                    }

                    // Verificar se a disciplina é válida (usando mapeamentos manuais)
                    const matchedSubject = isValidSubject(subject, validSubjects, subjectMappings, allowUnlistedSubjects);
                    if (!matchedSubject) {
                        notasDescartadasPorDisciplina++;
                        continue;
                    }

                    // ✅ Nota válida!
                    notasValidas++;
                    grades.push({
                        studentId: systemStudent.id,
                        studentName: systemStudent.name,
                        extractedName: match.fileStudentName,
                        similarity: match.similarity,
                        classId: selectedClass,
                        subject: matchedSubject, // Usar o nome normalizado/oficial
                        quarter: parseResult.quarter ?? selectedQuarter,
                        schoolYear: parseResult.schoolYear ?? selectedSchoolYear,
                        grade,
                        selected: true,
                    });
                }
            }
        }

        // 📊 LOG DETALHADO


        if (grades.length === 0) {
            toast({
                title: 'Nenhuma nota válida encontrada',
                description: `${totalNotasNoArquivo} notas no arquivo: ${notasDescartadasPorAluno} sem aluno, ${notasDescartadasPorDisciplina} sem disciplina, ${notasDescartadasPorValorInvalido} inválidas.`,
                variant: 'destructive',
            });
            return;
        }

        // Mostrar resumo ao usuário
        const descartadas = totalNotasNoArquivo - notasValidas;
        if (descartadas > 0) {
            toast({
                title: '⚠️ Algumas notas foram descartadas',
                description: `${notasValidas} de ${totalNotasNoArquivo} notas serão importadas. ${descartadas} descartadas (veja console para detalhes).`,
                variant: 'default',
            });
        }

        setImportableGrades(grades);
        setStep('preview');
    };

    const updateMatch = (index: number, systemStudentId: string | null) => {
        setStudentMatches(prev => prev.map((m, i) => {
            if (i === index) {
                return { ...m, systemStudentId, isManual: true };
            }
            return m;
        }));
    };

    const handleToggleGrade = (index: number) => {
        setImportableGrades(prev =>
            prev.map((g, i) => i === index ? { ...g, selected: !g.selected } : g)
        );
    };

    const handleSelectAll = (selected: boolean) => {
        setImportableGrades(prev => prev.map(g => ({ ...g, selected })));
    };

    const handleImport = async () => {
        // Validação crítica
        if (!selectedSchoolYear) {
            toast({
                title: 'Erro de Configuração',
                description: 'Ano letivo (1, 2 ou 3) não foi selecionado. A importação não pode continuar.',
                variant: 'destructive',
            });
            return;
        }

        if (!selectedQuarter) {
            toast({
                title: 'Erro de Configuração',
                description: 'Bimestre não foi selecionado. A importação não pode continuar.',
                variant: 'destructive',
            });
            return;
        }

        const toImport = importableGrades.filter(g => g.selected);

        if (toImport.length === 0) {
            toast({
                title: 'Nenhuma nota selecionada',
                description: 'Selecione pelo menos uma nota para importar.',
                variant: 'destructive',
            });
            return;
        }

        setIsImporting(true);

        // Contadores para o resultado
        let gradesToDeleteCount = 0;
        let importedCount = toImport.length;

        try {
            // ETAPA 1: Se replaceExisting, deletar notas do bimestre em bulk
            if (replaceExisting) {
                setImportPhase('deleting');
                const gradesToDelete = existingGrades.filter(
                    g =>
                        g.classId === selectedClass &&
                        g.quarter === selectedQuarter &&
                        (g.schoolYear ?? 1) === selectedSchoolYear
                );

                gradesToDeleteCount = gradesToDelete.length;
                setImportProgress({ current: 0, total: gradesToDelete.length });

                if (gradesToDelete.length > 0) {
                    const idsToDelete = gradesToDelete.map(g => g.id);
                    // Deletar em chunks de 500 para segurança
                    const CHUNK_SIZE = 500;
                    for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
                        const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
                        await deleteGrades(chunk);
                        setImportProgress({
                            current: Math.min(i + CHUNK_SIZE, idsToDelete.length),
                            total: idsToDelete.length
                        });
                    }
                }
            }

            // ETAPA 2: Importar novas notas em bulk
            setImportPhase('importing');
            setImportProgress({ current: 0, total: toImport.length });

            const gradesPayload = toImport.map(grade => ({
                studentId: grade.studentId,
                classId: grade.classId,
                subject: grade.subject.trim(),
                quarter: selectedQuarter.trim(), // FORÇAR O BIMESTRE SELECIONADO
                schoolYear: selectedSchoolYear,  // FORÇAR O ANO SELECIONADO
                grade: grade.grade,
                observation: '', // Caso precise de campo, mas o import não traz
            }));

            // Importar em chunks de 500 para segurança
            const INSERT_CHUNK_SIZE = 500;
            for (let i = 0; i < gradesPayload.length; i += INSERT_CHUNK_SIZE) {
                const chunk = gradesPayload.slice(i, i + INSERT_CHUNK_SIZE);
                await addGrades(chunk);
                setImportProgress({
                    current: Math.min(i + INSERT_CHUNK_SIZE, gradesPayload.length),
                    total: gradesPayload.length
                });
            }

            toast({
                title: 'Importação concluída com sucesso',
                description: replaceExisting
                    ? `${gradesToDeleteCount} nota(s) antiga(s) removida(s), ${importedCount} nota(s) nova(s) importada(s).`
                    : `${importedCount} nota(s) importada(s)/atualizada(s).`,
            });

            // Reset e fechar
            handleClose();
            if (onRefresh) {
                await onRefresh();
            }

        } catch (error) {
            console.error(error);
            toast({
                title: 'Erro na Importação',
                description: 'Ocorreu um erro ao processar as notas. Verifique o console ou tente novamente com menos dados.',
                variant: 'destructive',
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setStep('configure');
        setParseResult(null);
        setFileQuarter(null);
        setImportableGrades([]);
        setStudentMatches([]);
        setSubjectMappings([]);
        mappingKeyRef.current = null;
        onOpenChange(false);
    };

    const selectedGradesCount = importableGrades.filter(g => g.selected).length;
    const quarterMismatch = !!fileQuarter && fileQuarter !== selectedQuarter;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Importar Notas do SIGE
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'configure' && 'Selecione a turma, o ano e o bimestre, depois faça o upload do arquivo Excel.'}
                        {step === 'upload' && 'Aguarde enquanto processamos o arquivo...'}
                        {step === 'match-students' && 'Valide a associação entre os nomes do arquivo e do sistema.'}
                        {step === 'review-subjects' && 'Revise as disciplinas encontradas. Apenas disciplinas cadastradas serão importadas.'}
                        {step === 'preview' && 'Revise as notas antes de importar.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 bg-muted/20 border-b">
                    <div className="flex items-center justify-between relative max-w-2xl mx-auto">
                        {/* Linhas de conexão */}
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted-foreground/20 -z-10" />

                        {/* Passo 1: Configuração */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'configure' || step === 'upload' ? 'border-primary' : 'border-muted-foreground/20'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'configure' || step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Settings className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'configure' || step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>Configuração</span>
                        </div>

                        {/* Passo 2: Alunos */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'match-students' ? 'border-primary' : (['match-students', 'map-subjects', 'review-subjects', 'preview'].includes(step) ? 'border-green-500/50' : 'border-muted-foreground/20')}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'match-students' ? 'bg-primary text-primary-foreground' : (['match-students', 'map-subjects', 'review-subjects', 'preview'].includes(step) ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}`}>
                                <Users className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'match-students' ? 'text-primary' : 'text-muted-foreground'}`}>Validação</span>
                        </div>

                        {/* Passo 3: Disciplinas */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'map-subjects' || step === 'review-subjects' ? 'border-primary' : (['map-subjects', 'review-subjects', 'preview'].includes(step) ? 'border-green-500/50' : 'border-muted-foreground/20')}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'map-subjects' || step === 'review-subjects' ? 'bg-primary text-primary-foreground' : (['map-subjects', 'review-subjects', 'preview'].includes(step) ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}`}>
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'map-subjects' || step === 'review-subjects' ? 'text-primary' : 'text-muted-foreground'}`}>Mapeamento</span>
                        </div>

                        {/* Passo 4: Preview */}
                        <div className={`flex flex-col items-center gap-2 bg-background p-2 rounded-lg border-2 z-10 w-32 ${step === 'preview' ? 'border-primary' : 'border-muted-foreground/20'}`}>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-medium ${step === 'preview' ? 'text-primary' : 'text-muted-foreground'}`}>Finalizar</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    {/* Step 1: Configure - AGORA É O PRIMEIRO PASSO */}
                    {step === 'configure' && (
                        <div className="space-y-6">
                            {/* Seleção de Turma e Bimestre - GRID */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Selecione a turma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeClasses.map(cls => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Select
                                        value={String(selectedSchoolYear)}
                                        onValueChange={(value) => setSelectedSchoolYear(Number(value) as 1 | 2 | 3)}
                                    >
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Selecione o ano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {schoolYearOptions.map((option) => (
                                                <SelectItem key={option.value} value={String(option.value)}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Selecione o bimestre" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUARTERS.map(q => (
                                                <SelectItem key={q} value={q}>{q}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedClass && selectedClassData?.templateId && templateSubjectsForSelectedClass.length === 0 && (
                                <Alert className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <AlertDescription>
                                        Nenhuma disciplina profissional cadastrada para o {selectedSchoolYear}º ano neste template.
                                        Apenas disciplinas da base comum serão consideradas.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Opção de substituir notas */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => setReplaceExisting(!replaceExisting)}>
                                <div className="space-y-1 flex-1 pr-4">
                                    <Label className="text-base font-medium cursor-pointer">
                                        Substituir notas existentes
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {replaceExisting
                                            ? `Todas as notas antigas deste bimestre no ${selectedSchoolYear}º ano serão deletadas e substituídas pelas novas`
                                            : `As notas do arquivo serão adicionadas/atualizadas sem deletar as existentes do ${selectedSchoolYear}º ano`
                                        }
                                    </p>
                                </div>
                                <Checkbox
                                    checked={replaceExisting}
                                    onCheckedChange={(checked) => setReplaceExisting(!!checked)}
                                />
                            </div>

                            {/* Upload após selecionar turma */}
                            {selectedClass && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div
                                        className="border-2 border-dashed rounded-xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer group bg-muted/20"
                                        onClick={() => document.getElementById('sige-upload')?.click()}
                                    >
                                        {isProcessing ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                                                    <div className="bg-background rounded-full p-4 relative shadow-sm border">
                                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-lg text-foreground">Processando arquivo...</p>
                                                    <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="bg-background rounded-full p-4 shadow-sm border group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/30">
                                                    <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                                                        Clique para selecionar o arquivo Excel
                                                    </p>
                                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                                        Suporte para arquivos .XLS ou .XLSX exportados do SIGE ("Mapa de Notas")
                                                    </p>
                                                </div>
                                                <Button variant="outline" size="sm" className="mt-2 pointer-events-none">
                                                    Selecionar Arquivo
                                                </Button>
                                            </div>
                                        )}
                                        <Input
                                            id="sige-upload"
                                            type="file"
                                            accept=".xls,.xlsx"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                </div>
                            )}

                            {!selectedClass && (
                                <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 text-center space-y-3 opacity-60">
                                    <div className="bg-muted p-3 rounded-full">
                                        <FileText className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Aguardando seleção de turma</p>
                                        <p className="text-sm text-muted-foreground">Selecione uma turma acima para habilitar o upload.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Match Students (NOVO) */}
                    {step === 'match-students' && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertDescription>
                                    Verifique se os alunos foram identificados corretamente.
                                    Altere manualmente ou selecione "Ignorar" para não importar notas de um aluno.
                                </AlertDescription>
                            </Alert>

                            {quarterMismatch && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="flex flex-wrap items-center gap-2">
                                        <span>
                                            O arquivo indica <strong>{fileQuarter}</strong>, mas está selecionado{' '}
                                            <strong>{selectedQuarter}</strong>.
                                        </span>
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="p-0 h-auto"
                                            onClick={() => fileQuarter && setSelectedQuarter(fileQuarter)}
                                        >
                                            Usar {fileQuarter}
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <ScrollArea className="h-[400px] border rounded-lg bg-background">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40%] font-semibold">Nome no Arquivo</TableHead>
                                            <TableHead className="w-[40%] font-semibold">Nome no Sistema</TableHead>
                                            <TableHead className="w-[20%] font-semibold">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentMatches.map((match, index) => (
                                            <TableRow key={index} className={!match.systemStudentId ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-sm">{match.fileStudentName}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Original do Excel</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Select
                                                        value={match.systemStudentId || 'ignore'}
                                                        onValueChange={(val) => updateMatch(index, val === 'ignore' ? null : val)}
                                                    >
                                                        <SelectTrigger className={`w-full h-9 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted/50 transition-colors justify-start text-left ${!match.systemStudentId ? 'text-muted-foreground italic' : ''}`}>
                                                            <div className="flex items-center gap-2 overflow-hidden w-full">
                                                                {match.systemStudentId ? (
                                                                    <>
                                                                        {/* Mini avatar simulation */}
                                                                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] uppercase shrink-0">
                                                                            {students.find(s => s.id === match.systemStudentId)?.name.substring(0, 2)}
                                                                        </div>
                                                                        <span className="truncate">{students.find(s => s.id === match.systemStudentId)?.name}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="truncate">Ignorar (Não importar)</span>
                                                                )}
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent align="start" className="w-[300px]">
                                                            <SelectItem value="ignore" className="text-muted-foreground italic">
                                                                -- Ignorar (Não importar) --
                                                            </SelectItem>
                                                            {students
                                                                .filter(s => s.classId === selectedClass)
                                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                                .map(s => (
                                                                    <SelectItem key={s.id} value={s.id}>
                                                                        {s.name}
                                                                    </SelectItem>
                                                                ))
                                                            }
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {match.systemStudentId ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={`h-6 ${match.isManual
                                                                    ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                                                                    : (match.similarity >= 0.9
                                                                        ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                        : 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400')
                                                                    }`}
                                                            >
                                                                {match.isManual ? 'Manual' : `${Math.round(match.similarity * 100)}% Match`}
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                                            Ignorado
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Step 4: Map Subjects - Mapeamento de Disciplinas */}
                    {step === 'map-subjects' && parseResult && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertDescription>
                                    <strong>Relacione as disciplinas do SIGE com as disciplinas do sistema.</strong>
                                    <br />
                                    Disciplinas não mapeadas serão descartadas. Selecione "Ignorar" para não importar uma disciplina.
                                </AlertDescription>
                            </Alert>

                            <ScrollArea className="h-[400px] border rounded-lg bg-background">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[45%] font-semibold">Disciplina no SIGE</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead className="w-[45%] font-semibold">Disciplina no Sistema</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subjectMappings.map((mapping) => {
                                            const validSubjects = getValidSubjectsForClass(selectedClass, selectedSchoolYear, templateSubjectsForSelectedClass);
                                            return (
                                                <TableRow
                                                    key={mapping.excelSubject}
                                                    className={!mapping.systemSubject ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}
                                                >
                                                    <TableCell className="py-3 font-medium text-sm">
                                                        {mapping.excelSubject}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto opacity-50" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Select
                                                            value={mapping.systemSubject || 'ignore'}
                                                            onValueChange={(val) => updateSubjectMapping(
                                                                mapping.excelSubject,
                                                                val === 'ignore' ? null : val
                                                            )}
                                                        >
                                                            <SelectTrigger className={`w-full h-9 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted/50 transition-colors ${!mapping.systemSubject ? 'text-muted-foreground italic' : ''}`}>
                                                                <SelectValue placeholder="Selecione..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                <SelectItem value="ignore" className="text-muted-foreground italic">
                                                                    -- Ignorar (Não importar) --
                                                                </SelectItem>
                                                                {validSubjects.map(vs => (
                                                                    <SelectItem key={vs.original} value={vs.original}>
                                                                        {vs.original}
                                                                    </SelectItem>
                                                                ))}
                                                                {/* Opção para usar o nome do Excel diretamente se não está na lista */}
                                                                {allowUnlistedSubjects && !validSubjects.some(vs => vs.original === mapping.excelSubject) && (
                                                                    <SelectItem
                                                                        value={mapping.excelSubject}
                                                                        className="text-blue-600 font-medium"
                                                                    >
                                                                        ➕ Usar "{mapping.excelSubject}" como está
                                                                    </SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        {mapping.systemSubject && (
                                                            <div className="mt-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] h-5 ${mapping.autoMatched
                                                                        ? 'text-emerald-600 border-emerald-100 bg-emerald-50'
                                                                        : 'text-blue-600 border-blue-100 bg-blue-50'
                                                                        }`}
                                                                >
                                                                    {mapping.autoMatched ? 'Auto Match' : 'Manual'}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            <div className="border rounded-lg p-4 bg-muted/50">
                                <h4 className="font-semibold mb-2">Resumo</h4>
                                <div className="space-y-1 text-sm">
                                    <p>📊 Total de disciplinas: {subjectMappings.length}</p>
                                    <p className="text-green-700 dark:text-green-400">
                                        ✓ Mapeadas automaticamente: {subjectMappings.filter(m => m.autoMatched && m.systemSubject).length}
                                    </p>
                                    <p className="text-blue-700 dark:text-blue-400">
                                        ✓ Mapeadas manualmente: {subjectMappings.filter(m => !m.autoMatched && m.systemSubject).length}
                                    </p>
                                    <p className="text-amber-700 dark:text-amber-400">
                                        ⚠ Serão ignoradas: {subjectMappings.filter(m => !m.systemSubject).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review Subjects */}
                    {step === 'review-subjects' && parseResult && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertDescription>
                                    Confirme as disciplinas que serão importadas com base nos mapeamentos definidos.
                                </AlertDescription>
                            </Alert>

                            {(() => {
                                const validSubjects = selectedClass
                                    ? getValidSubjectsForClass(selectedClass, selectedSchoolYear, templateSubjectsForSelectedClass)
                                    : [];
                                const mappedSubjects = subjectMappings.filter(m => m.systemSubject !== null);
                                const unmappedSubjects = subjectMappings.filter(m => m.systemSubject === null);
                                const mappedNormalized = new Set(
                                    mappedSubjects
                                        .map(m => m.systemSubject)
                                        .filter((subject): subject is string => !!subject)
                                        .map(normalizeSubjectForMatch)
                                );
                                const missingSystemSubjects = validSubjects
                                    .filter(vs => !mappedNormalized.has(vs.normalized))
                                    .map(vs => vs.original);

                                return (
                                    <div className="space-y-4">
                                        {/* Disciplinas Válidas */}
                                        <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ArrowRight className="h-5 w-5 text-green-600" />
                                                <h3 className="font-semibold text-green-900 dark:text-green-100">
                                                    Disciplinas que serão importadas ({mappedSubjects.length})
                                                </h3>
                                            </div>
                                            {mappedSubjects.length > 0 ? (
                                                <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                                                    {mappedSubjects.map(m => (
                                                        <div key={m.excelSubject} className="flex items-center justify-between p-2 rounded border bg-background/50">
                                                            <div className="flex items-center gap-2 text-sm overflow-hidden">
                                                                <span className="font-medium truncate max-w-[120px]" title={m.excelSubject}>{m.excelSubject}</span>
                                                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                <span className="truncate max-w-[120px] text-green-700 dark:text-green-400" title={m.systemSubject!}>{m.systemSubject}</span>
                                                            </div>
                                                            {!m.autoMatched && (
                                                                <Badge variant="secondary" className="text-[10px] h-5 px-1 ml-1">Manual</Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    Nenhuma disciplina mapeada. Volte e mapeie pelo menos uma disciplina.
                                                </p>
                                            )}
                                        </div>

                                        {/* Disciplinas Ignoradas */}
                                        {unmappedSubjects.length > 0 && (
                                            <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                                                        Disciplinas ignoradas ({unmappedSubjects.length})
                                                    </h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {unmappedSubjects.map(m => (
                                                        <div key={m.excelSubject} className="flex items-center gap-1.5 px-2 py-1 rounded border bg-background/50 text-xs text-muted-foreground">
                                                            <span>{m.excelSubject}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Se deseja importar estas disciplinas, volte à etapa anterior e mapeie-as.
                                                </p>
                                            </div>
                                        )}

                                        {/* Disciplinas do Sistema Nao Preenchidas */}
                                        {missingSystemSubjects.length > 0 && (
                                            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FileText className="h-5 w-5 text-blue-600" />
                                                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                                                        Disciplinas do sistema nao preenchidas ({missingSystemSubjects.length})
                                                    </h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {missingSystemSubjects.map(subject => (
                                                        <Badge
                                                            key={subject}
                                                            variant="outline"
                                                            className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                                        >
                                                            {subject}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Essas disciplinas pertencem ao ano selecionado e nao tem notas no arquivo.
                                                </p>
                                            </div>
                                        )}

                                        {/* Resumo */}
                                        <div className="border rounded-lg p-4 bg-muted/50">
                                            <h4 className="font-semibold mb-2">Resumo da Importação</h4>
                                            <div className="space-y-1 text-sm">
                                                <p>📊 Total de disciplinas no arquivo: {subjectMappings.length}</p>
                                                <p className="text-green-700 dark:text-green-400">
                                                    ✓ Serão importadas: {mappedSubjects.length}
                                                </p>
                                                {unmappedSubjects.length > 0 && (
                                                    <p className="text-amber-700 dark:text-amber-400">
                                                        ⚠ Ignoradas: {unmappedSubjects.length}
                                                    </p>
                                                )}
                                                {missingSystemSubjects.length > 0 && (
                                                    <p className="text-blue-700 dark:text-blue-400">
                                                        Disciplinas do sistema nao preenchidas: {missingSystemSubjects.length}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {mappedSubjects.length === 0 && (
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Nenhuma disciplina mapeada para importar. Volte e mapeie pelo menos uma disciplina.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Step 5: Preview */}
                    {step === 'preview' && parseResult && (
                        <div className="space-y-4">
                            {/* Estatísticas da Importação */}
                            {/* Estatísticas da Importação - Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                                        {parseResult.rows.length}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alunos (Arq)</span>
                                </div>
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                                        {studentMatches.filter(m => m.systemStudentId).length}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Identificados</span>
                                </div>
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                                        {importableGrades.length}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas Válidas</span>
                                </div>
                                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                                        {new Set(importableGrades.map(g => g.subject)).size}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disciplinas</span>
                                </div>
                            </div>

                            {isImporting && (
                                <Alert className="bg-primary/5 border-primary/20">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium text-primary">
                                                    {importPhase === 'deleting'
                                                        ? '🗑️ Removendo notas antigas...'
                                                        : '📝 Importando novas notas...'
                                                    }
                                                </span>
                                                <span className="font-medium">
                                                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}
                                                className="h-2 bg-primary/20"
                                            />
                                            {importPhase === 'deleting' && (
                                                <p className="text-xs text-muted-foreground">
                                                    Substituindo todas as notas do bimestre selecionado no {selectedSchoolYear}º ano
                                                </p>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={selectedGradesCount === importableGrades.length}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        disabled={isImporting}
                                    />
                                    <span className="text-sm font-medium">
                                        Selecionar todas para importação
                                    </span>
                                </div>
                                <Badge variant={selectedGradesCount > 0 ? 'default' : 'secondary'} className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                    {selectedGradesCount} notas selecionadas
                                </Badge>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-lg bg-background">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-12 text-center">
                                                <Checkbox
                                                    checked={selectedGradesCount === importableGrades.length}
                                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                    disabled={isImporting}
                                                    className="translate-y-[2px]"
                                                />
                                            </TableHead>
                                            <TableHead className="font-semibold">Aluno (Sistema)</TableHead>
                                            <TableHead className="font-semibold">Match Info</TableHead>
                                            <TableHead className="font-semibold">Disciplina</TableHead>
                                            <TableHead className="font-semibold">Nota</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importableGrades.map((grade, index) => (
                                            <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-center py-2">
                                                    <Checkbox
                                                        checked={grade.selected}
                                                        onCheckedChange={() => handleToggleGrade(index)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium py-2">
                                                    {grade.studentName}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] h-5 ${grade.similarity >= 0.9
                                                                ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                                                                : 'text-amber-600 border-amber-200 bg-amber-50'
                                                                }`}
                                                        >
                                                            {Math.round(grade.similarity * 100)}%
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={grade.extractedName}>
                                                            {grade.extractedName}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 text-sm text-muted-foreground">{grade.subject}</TableCell>
                                                <TableCell className="py-2">
                                                    <Badge variant="outline" className={`font-mono text-sm ${grade.grade < 6 ? 'text-red-500 border-red-200 bg-red-50' : 'text-slate-700 bg-slate-50'}`}>
                                                        {grade.grade.toFixed(1)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            {importableGrades.length === 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Nenhum aluno do arquivo foi encontrado na turma selecionada.
                                        Verifique se a turma está correta.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                </div>
                <DialogFooter className="flex-wrap gap-2 sm:space-x-0">
                    {step === 'configure' && (
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                    )}

                    {step === 'match-students' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleConfirmMatches}>
                                Continuar para Disciplinas
                            </Button>
                        </>
                    )}

                    {step === 'map-subjects' && parseResult && (
                        <>
                            <Button variant="outline" onClick={() => setStep('match-students')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={() => setStep('review-subjects')}
                                disabled={subjectMappings.filter(m => m.systemSubject).length === 0}
                            >
                                Continuar para Revisão
                            </Button>
                        </>
                    )}

                    {step === 'review-subjects' && parseResult && (
                        <>
                            <Button variant="outline" onClick={() => setStep('map-subjects')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={handleConfirmSubjects}
                                disabled={subjectMappings.filter(m => m.systemSubject).length === 0}
                            >
                                Continuar para Preview
                            </Button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep('review-subjects')}
                                disabled={isImporting}
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={selectedGradesCount === 0 || isImporting}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Importar {selectedGradesCount} nota(s)
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};
