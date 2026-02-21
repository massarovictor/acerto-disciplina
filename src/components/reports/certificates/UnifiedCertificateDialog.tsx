import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Award, CalendarCheck, ClipboardCheck, Medal, ChevronRight } from 'lucide-react';

import { CertificateType } from '@/lib/certificateTypes';
import {
    Class,
    CreateSavedCertificateEventInput,
    SavedCertificateEvent,
    Student,
    SignatureMode
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
    useGradesAnalytics,
    useProfessionalSubjectTemplates,
    useProfessionalSubjects
} from '@/hooks/useData';

import { CertificateDialogStep, CertificateDialogStepper } from './CertificateDialogStepper';

// Exported Steps Components
import { CertificateContextStep } from './steps/CertificateContextStep';
import { CertificateFinishStep } from './steps/CertificateFinishStep';
import { CertificateTextEditor } from './CertificateTextEditor';
import { StudentsSelector } from './StudentsSelector';
import { CertificatePeriodMode, formatCertificatePeriodLabel, resolveCertificateQuarters } from '@/lib/certificatePeriods';
import { getDefaultSchoolYearForClass, resolveAreaReferencesForClass, resolveSubjectReferencesForClass, resolveTechnicalSubjectsForSchoolYear } from '@/lib/certificateRules';
import { getCertificateTemplate } from '@/lib/certificateTemplates';
import { type SidebarPattern } from '@/lib/certificatePdfExport';

interface UnifiedCertificateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classes: Class[];
    students: Student[];
    onSaveEvent: (input: CreateSavedCertificateEventInput) => Promise<SavedCertificateEvent>;
}

const TYPE_OPTIONS = [
    {
        id: 'monitoria' as const,
        title: 'Monitoria Escolar',
        description: 'Emita certificados de monitoria com carga horária e atividade.',
        icon: ClipboardCheck,
    },
    {
        id: 'destaque' as const,
        title: 'Aluno Destaque',
        description: 'Gere certificados de mérito acadêmico e honra ao mérito.',
        icon: Medal,
    },
    {
        id: 'evento_participacao' as const,
        title: 'Participação em Evento',
        description: 'Certifique alunos que compareceram a eventos escolares.',
        icon: CalendarCheck,
    },
    {
        id: 'evento_organizacao' as const,
        title: 'Organizador de Evento',
        description: 'Gere certificados para alunos que lideraram a organização.',
        icon: Award,
    },
];

const STEPS: CertificateDialogStep[] = [
    { id: 'type', title: 'Tipo', description: 'Modelo de certificado' },
    { id: 'context', title: 'Contexto', description: 'Turma e parâmetros' },
    { id: 'students', title: 'Alunos', description: 'Seleção de destinatários' },
    { id: 'text', title: 'Texto', description: 'Prévia e edição' },
    { id: 'finish', title: 'Exportar', description: 'Formato e assinaturas' },
];

const getCurrentQuarter = (): string => {
    const month = new Date().getMonth(); // 0-based
    if (month < 3) return '1º Bimestre';
    if (month < 6) return '2º Bimestre';
    if (month < 9) return '3º Bimestre';
    return '4º Bimestre';
};

export function UnifiedCertificateDialog({
    open,
    onOpenChange,
    classes,
    students,
    onSaveEvent,
}: UnifiedCertificateDialogProps) {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [step, setStep] = useState(STEPS[0].id);
    const [certificateType, setCertificateType] = useState<CertificateType | null>(null);

    // States - Genéricos
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [eventTitle, setEventTitle] = useState('');
    const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);

    // States - Período
    const [periodMode, setPeriodMode] = useState<CertificatePeriodMode>('quarters');
    const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);

    // States - Referências (Disciplinas, Áreas)
    const [includeReference, setIncludeReference] = useState(false);
    const [referenceType, setReferenceType] = useState<'subject' | 'area'>('subject');
    const [referenceValue, setReferenceValue] = useState('');

    // States - Eventos
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [useDateRange, setUseDateRange] = useState(false);
    const [eventStartDate, setEventStartDate] = useState('');
    const [eventEndDate, setEventEndDate] = useState('');
    const [role, setRole] = useState('');

    // States - Compartilhado (Carga Horária) e Monitoria
    const [workloadHours, setWorkloadHours] = useState('');
    const [monitoriaPeriod, setMonitoriaPeriod] = useState('');
    const [activity, setActivity] = useState('');

    // States - Text e Finish
    const [baseText, setBaseText] = useState('');
    const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
    const [signatureMode, setSignatureMode] = useState<SignatureMode>('digital_cursive');
    const [teacherName, setTeacherName] = useState('');
    const [sidebarPattern, setSidebarPattern] = useState<SidebarPattern>('chevrons');
    const [isExporting, setIsExporting] = useState(false);

    // Hooks Padrão (Grades Analíticas, Disciplinas Profissionais)
    const { templates } = useProfessionalSubjectTemplates();
    const { getProfessionalSubjects } = useProfessionalSubjects();
    const { grades: classGrades } = useGradesAnalytics(
        { classId: selectedClassId || undefined },
        { enabled: open && !!selectedClassId },
    );

    // Computed Properties - Class
    const selectedClassData = useMemo(
        () => classes.find((item) => item.id === selectedClassId) || null,
        [classes, selectedClassId],
    );

    const classStudents = useMemo(
        () => students.filter((student) => student.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        [selectedClassId, students],
    );

    // Computed Properties - Disciplinas & Referências
    const manualSubjects = useMemo(() => (selectedClassId ? getProfessionalSubjects(selectedClassId) : []), [selectedClassId, getProfessionalSubjects]);
    const technicalSubjects = useMemo(() => resolveTechnicalSubjectsForSchoolYear({ classData: selectedClassData, schoolYear: selectedSchoolYear, templates, manualSubjects, grades: classGrades }), [selectedClassData, selectedSchoolYear, templates, manualSubjects, classGrades]);

    const subjectReferences = useMemo(() => resolveSubjectReferencesForClass(selectedClassData, technicalSubjects), [selectedClassData, technicalSubjects]);
    const areaReferences = useMemo(() => resolveAreaReferencesForClass(selectedClassData, technicalSubjects), [selectedClassData, technicalSubjects]);

    // Resets e Setups do Form
    useEffect(() => {
        if (open) {
            setStep('type');
            setCertificateType(null);
            setSelectedClassId('');
            setSelectedStudentIds([]);
            setEventTitle('');
            setPeriodMode('quarters');
            setSelectedQuarters([getCurrentQuarter()]);
            setIncludeReference(false);
            setReferenceType('subject');
            setReferenceValue('');
            setEventName('');
            setEventDate('');
            setUseDateRange(false);
            setEventStartDate('');
            setEventEndDate('');
            setRole('');
            setWorkloadHours('');
            setMonitoriaPeriod('');
            setActivity('');
            setBaseText('');
            setTextOverrides({});
            setSignatureMode('digital_cursive');
            setSidebarPattern('chevrons');
            setTeacherName('');
            setIsExporting(false);
        }
    }, [open, profile]);

    useEffect(() => {
        if (!selectedClassData) return;
        setSelectedSchoolYear(getDefaultSchoolYearForClass(selectedClassData));
    }, [selectedClassData]);

    // Autopreenchimento de Períodos
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        if (periodMode === 'annual') {
            setMonitoriaPeriod(`durante o ano letivo de ${currentYear}`);
        } else if (periodMode === 'quarters' && selectedQuarters.length > 0) {
            const joined = [...selectedQuarters].sort().join(', ');
            setMonitoriaPeriod(`no período relativo ao ${joined} de ${currentYear}`);
        }
    }, [periodMode, selectedQuarters]);

    // Autopreenchimento de Atividade (Monitoria)
    useEffect(() => {
        if (certificateType === 'monitoria' && eventTitle) {
            if (!activity) setActivity(eventTitle);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certificateType, eventTitle]);

    const handleSelectType = (type: CertificateType) => {
        setCertificateType(type);
        setBaseText(getCertificateTemplate(type));
        setRole(type === 'evento_participacao' ? 'participante' : type === 'evento_organizacao' ? 'membro da comissão organizadora' : '');
        setStep('context');
    };

    const handleQuarterToggle = (quarter: string, checked: boolean) => {
        if (checked) {
            setSelectedQuarters((prev) => Array.from(new Set([...prev, quarter])));
            return;
        }
        setSelectedQuarters((prev) => prev.filter((item) => item !== quarter));
    };

    const currentStepIndex = STEPS.findIndex((s) => s.id === step);
    const goNext = () => { if (currentStepIndex < STEPS.length - 1) setStep(STEPS[currentStepIndex + 1].id); };
    const goBack = () => { if (currentStepIndex > 0) setStep(STEPS[currentStepIndex - 1].id); };

    const handleNextClick = () => {
        if (step === 'context') {
            if (!selectedClassId) {
                toast({ variant: 'destructive', title: 'Turma obrigatória', description: 'Por favor, selecione uma turma alvo.' });
                return;
            }
            if (certificateType === 'evento_participacao' || certificateType === 'evento_organizacao') {
                if (!eventName.trim()) {
                    toast({ variant: 'destructive', title: 'Nome do evento obrigatório', description: 'Informe o nome do evento.' });
                    return;
                }
            }
        }
        if (step === 'students' && selectedStudentIds.length === 0) {
            toast({ variant: 'destructive', title: 'Selecione ao menos 1 aluno', description: 'Nenhum aluno foi marcado para receber o certificado.' });
            return;
        }
        if (step === 'text' && !baseText.trim()) {
            toast({ variant: 'destructive', title: 'Texto base vazio', description: 'O corpo do certificado não pode estar em branco.' });
            return;
        }
        goNext();
    };

    const handleExport = async (mode: 'zip' | 'combined') => {
        if (!certificateType || !selectedClassData) return;
        if (!teacherName.trim()) {
            toast({ variant: 'destructive', title: 'Assinatura obrigatória', description: 'Preencha o nome do professor para a assinatura.' });
            return;
        }
        setIsExporting(true);

        const selectedStudentsData = classStudents.filter((s) => selectedStudentIds.includes(s.id));
        const periodLabel = formatCertificatePeriodLabel(periodMode, selectedQuarters);
        const resolvedReferenceLabel = includeReference ? (referenceType === 'subject' ? subjectReferences : areaReferences).find((r) => r.value === referenceValue)?.label : undefined;
        const resolvedQuarters = resolveCertificateQuarters(periodMode, selectedQuarters);

        const eventMeta = (certificateType === 'evento_participacao' || certificateType === 'evento_organizacao') ? {
            eventName: eventName.trim(),
            eventDate,
            eventDateStart: useDateRange ? eventStartDate : undefined,
            eventDateEnd: useDateRange ? eventEndDate : undefined,
            workloadHours: Number(workloadHours),
            role: role.trim(),
        } : undefined;

        const monitoriaMeta = certificateType === 'monitoria' ? {
            workloadHours: Number(workloadHours),
            monitoriaPeriod: monitoriaPeriod.trim(),
            activity: activity.trim()
        } : undefined;

        const exportInput = {
            certificateType,
            classData: { id: selectedClassData.id, name: selectedClassData.name },
            schoolYear: selectedSchoolYear,
            periodLabel,
            referenceLabel: resolvedReferenceLabel,
            baseText,
            students: selectedStudentsData.map((s) => ({ id: s.id, name: s.name })),
            textOverrides,
            teacherName: teacherName.trim() || undefined,
            signatureMode,
            verificationCodesByStudentId: {} as Record<string, string>,
            sidebarPattern,
            eventMeta,
            monitoriaMeta,
        };

        const savePayload: CreateSavedCertificateEventInput = {
            title: eventTitle.trim() || `Emissão Lote - ${selectedClassData.name}`,
            certificateType,
            classId: selectedClassData.id,
            classNameSnapshot: selectedClassData.name,
            schoolYear: selectedSchoolYear,
            periodMode,
            selectedQuarters: resolvedQuarters,
            periodLabel,
            referenceType: includeReference ? referenceType : undefined,
            referenceValue: includeReference ? referenceValue : undefined,
            referenceLabel: resolvedReferenceLabel,
            baseText,
            teacherName: teacherName.trim() || undefined,
            signatureMode,
            typeMeta: { eventMeta, monitoriaMeta },
            students: selectedStudentsData.map((student) => ({
                studentId: student.id,
                studentNameSnapshot: student.name,
                textOverride: textOverrides[student.id]?.trim() || undefined,
            })),
        };

        try {
            const savedEvent = await onSaveEvent(savePayload);

            const verificationMap: Record<string, string> = {};
            selectedStudentsData.forEach((s) => {
                const matched = savedEvent?.students.find(es => es.studentId === s.id);
                if (matched?.verificationCode) verificationMap[s.id] = matched.verificationCode;
            });
            exportInput.verificationCodesByStudentId = verificationMap;

            if (mode === 'combined') {
                const { downloadCombinedCertificatePdf } = await import('@/lib/certificatePdfExport');
                await downloadCombinedCertificatePdf(exportInput);
            } else {
                const { downloadCertificateFiles, generateCertificateFiles } = await import('@/lib/certificatePdfExport');
                const files = await generateCertificateFiles(exportInput);
                await downloadCertificateFiles(files, { forceZip: true });
            }

            toast({ title: 'Sucesso', description: 'Certificados emitidos e histórico salvo no Mural.' });
            onOpenChange(false);
        } catch (error) {
            console.error('Erro de PDF:', error);
            toast({ variant: 'destructive', title: 'Erro de Geração', description: 'Ocorreu um erro ao emitir os PDFS.' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
                <DialogHeader className="px-6 pt-6 pb-2 border-b">
                    <DialogTitle className="text-xl font-semibold">Emitir Certificados</DialogTitle>
                    <DialogDescription>Siga as etapas para configurar e gerar documentos validáveis.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0">
                    {step !== 'type' && (
                        <div className="w-full border-b bg-slate-50/50 flex-shrink-0">
                            <CertificateDialogStepper steps={STEPS.slice(1)} currentStep={step} onStepChange={setStep} />
                        </div>
                    )}

                    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white overflow-hidden">
                        {step === 'type' && (
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Escolha a categoria</h3>
                                <div className="space-y-3">
                                    {TYPE_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleSelectType(opt.id)}
                                                className="w-full group text-left border rounded-xl p-4 flex items-start gap-4 hover:border-primary/50 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                <div className="bg-primary/5 rounded-full p-2.5 mt-0.5 text-primary group-hover:scale-110 transition-transform">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-slate-900 mb-0.5">{opt.title}</h4>
                                                    <p className="text-sm text-slate-500 leading-relaxed">{opt.description}</p>
                                                </div>
                                                <div className="text-slate-300 group-hover:text-primary transition-colors flex items-center justify-center self-center h-8">
                                                    <ChevronRight className="h-5 w-5" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 'context' && certificateType && (
                            <div className="flex-1 overflow-y-auto p-6">
                                <CertificateContextStep
                                    type={certificateType}
                                    classes={classes}
                                    selectedClassId={selectedClassId}
                                    setSelectedClassId={setSelectedClassId}
                                    selectedSchoolYear={selectedSchoolYear}
                                    setSelectedSchoolYear={setSelectedSchoolYear}
                                    eventTitle={eventTitle}
                                    setEventTitle={setEventTitle}
                                    periodMode={periodMode}
                                    setPeriodMode={setPeriodMode}
                                    selectedQuarters={selectedQuarters}
                                    toggleQuarter={handleQuarterToggle}
                                    includeReference={includeReference}
                                    setIncludeReference={setIncludeReference}
                                    referenceType={referenceType}
                                    setReferenceType={setReferenceType}
                                    referenceValue={referenceValue}
                                    setReferenceValue={setReferenceValue}
                                    subjectReferences={subjectReferences}
                                    areaReferences={areaReferences}
                                    eventName={eventName}
                                    setEventName={setEventName}
                                    eventDate={eventDate}
                                    setEventDate={setEventDate}
                                    useDateRange={useDateRange}
                                    setUseDateRange={setUseDateRange}
                                    eventStartDate={eventStartDate}
                                    setEventStartDate={setEventStartDate}
                                    eventEndDate={eventEndDate}
                                    setEventEndDate={setEventEndDate}
                                    role={role}
                                    setRole={setRole}
                                    workloadHours={workloadHours}
                                    setWorkloadHours={setWorkloadHours}
                                    monitoriaPeriod={monitoriaPeriod}
                                />
                            </div>
                        )}

                        {step === 'students' && certificateType && (
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-3 rounded-lg border p-4">
                                    <p className="text-sm font-semibold">Selecionar alunos alvo</p>
                                    <StudentsSelector
                                        students={classStudents}
                                        selectedStudentIds={selectedStudentIds}
                                        onChange={setSelectedStudentIds}
                                        emptyMessage="Nenhum aluno disponível nesta turma."
                                    />
                                </div>
                            </div>
                        )}

                        {step === 'text' && certificateType && (
                            <div className="flex-1 overflow-y-auto p-6">
                                <CertificateTextEditor
                                    baseText={baseText}
                                    onBaseTextChange={setBaseText}
                                    selectedStudents={classStudents.filter((s) => selectedStudentIds.includes(s.id))}
                                    textOverrides={textOverrides}
                                    onTextOverrideChange={(id, v) => setTextOverrides(p => ({ ...p, [id]: v }))}
                                    placeholderTokens={['aluno', 'eventoNome', 'eventoData', 'eventoPapel', 'cargaHoraria', 'referencia']}
                                    onResetBaseText={() => setBaseText(getCertificateTemplate(certificateType))}
                                />
                            </div>
                        )}

                        {step === 'finish' && certificateType && (
                            <div className="flex-1 overflow-y-auto p-6">
                                <CertificateFinishStep
                                    type={certificateType}
                                    eventTitle={eventTitle}
                                    selectedClassData={selectedClassData}
                                    studentCount={selectedStudentIds.length}
                                    teacherName={teacherName}
                                    setTeacherName={setTeacherName}
                                    signatureMode={signatureMode}
                                    setSignatureMode={setSignatureMode}
                                    sidebarPattern={sidebarPattern}
                                    setSidebarPattern={setSidebarPattern}
                                />
                            </div>
                        )}

                        {/* Footer Controls for Tab Switching */}
                        {step !== 'type' && (
                            <div className="p-4 mt-auto border-t bg-slate-50/50 flex justify-between">
                                <Button onClick={goBack} variant="outline">
                                    Etapa anterior
                                </Button>
                                {step === 'finish' ? (
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" disabled={isExporting} onClick={() => handleExport('zip')}>
                                            Salvar + ZIP Individual
                                        </Button>
                                        <Button type="button" disabled={isExporting} onClick={() => handleExport('combined')}>
                                            {isExporting ? 'Processando PDF...' : 'Salvar + PDF Único'}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button onClick={handleNextClick}>
                                        Próxima etapa
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

