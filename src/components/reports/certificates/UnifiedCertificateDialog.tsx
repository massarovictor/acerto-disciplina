import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Award,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Medal,
} from 'lucide-react';

import { CertificateType } from '@/lib/certificateTypes';
import {
  Class,
  CreateSavedCertificateEventInput,
  SavedCertificateEvent,
  SignatureMode,
  Student,
  UpdateSavedCertificateEventInput,
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  useGradesAnalytics,
  useProfessionalSubjectTemplates,
  useProfessionalSubjects,
} from '@/hooks/useData';

import {
  CertificateDialogStep,
  CertificateDialogStepper,
} from './CertificateDialogStepper';

import { CertificateContextStep } from './steps/CertificateContextStep';
import { CertificateFinishStep } from './steps/CertificateFinishStep';
import { CertificateTextEditor } from './CertificateTextEditor';
import { StudentsSelector } from './StudentsSelector';
import {
  CertificatePeriodMode,
  formatCertificatePeriodLabel,
  resolveCertificateQuarters,
} from '@/lib/certificatePeriods';
import {
  resolveAreaReferencesForClass,
  resolveSubjectReferencesForClass,
  resolveTechnicalSubjectsForSchoolYear,
} from '@/lib/certificateRules';
import { getCertificateTemplate } from '@/lib/certificateTemplates';
import {
  type ExportCertificatesPdfInput,
} from '@/lib/certificatePdfExport';
import { QUARTERS } from '@/lib/subjects';
import { classifyStudent } from '@/lib/advancedAnalytics';
import { CertificateEventTypeMeta } from '@/lib/certificateEventTypes';

interface UnifiedCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  initialEvent?: SavedCertificateEvent;
  classes: Class[];
  students: Student[];
  onSaveEvent: (
    input: CreateSavedCertificateEventInput,
  ) => Promise<SavedCertificateEvent>;
  onSubmitEdit?: (
    eventId: string,
    input: UpdateSavedCertificateEventInput,
  ) => Promise<SavedCertificateEvent>;
}

interface HighlightClassification {
  eligible: boolean;
  status: 'confirmed' | 'pending';
  average: number | null;
  label: string;
  tone?: 'default' | 'pending' | 'success';
  details?: string;
}

interface DraftSnapshotInput {
  certificateType: CertificateType | null;
  selectedClassId: string;
  selectedStudentIds: string[];
  eventTitle: string;
  selectedSchoolYear: 1 | 2 | 3;
  referenceYear: string;
  periodMode: CertificatePeriodMode;
  selectedQuarters: string[];
  includeReference: boolean;
  referenceType: 'subject' | 'area';
  referenceValue: string;
  eventName: string;
  eventDate: string;
  useDateRange: boolean;
  eventStartDate: string;
  eventEndDate: string;
  role: string;
  workloadHours: string;
  activity: string;
  baseText: string;
  textOverrides: Record<string, string>;
  signatureMode: SignatureMode;
  teacherName: string;
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

const KNOWN_PLACEHOLDER_TOKENS = [
  'aluno',
  'escola',
  'turma',
  'anoTurma',
  'periodo',
  'referencia',
  'cargaHoraria',
  'atividade',
  'periodoMonitoria',
  'eventoNome',
  'eventoData',
  'eventoLocal',
  'eventoPapel',
] as const;

const KNOWN_PLACEHOLDER_SET = new Set<string>(KNOWN_PLACEHOLDER_TOKENS);

const PLACEHOLDER_TOKENS_BY_TYPE: Record<CertificateType, string[]> = {
  monitoria: [
    'aluno',
    'turma',
    'referencia',
    'periodoMonitoria',
    'atividade',
    'cargaHoraria',
  ],
  destaque: ['aluno', 'turma', 'periodo', 'referencia'],
  evento_participacao: [
    'aluno',
    'eventoNome',
    'eventoData',
    'eventoPapel',
    'cargaHoraria',
    'referencia',
  ],
  evento_organizacao: [
    'aluno',
    'eventoNome',
    'eventoData',
    'eventoPapel',
    'cargaHoraria',
    'referencia',
  ],
};

const REQUIRED_TOKENS_BY_TYPE: Record<CertificateType, string[]> = {
  monitoria: ['aluno', 'turma', 'atividade', 'cargaHoraria'],
  destaque: ['aluno', 'turma', 'periodo'],
  evento_participacao: ['aluno', 'eventoNome', 'eventoData', 'cargaHoraria'],
  evento_organizacao: ['aluno', 'eventoNome', 'eventoData', 'cargaHoraria'],
};

const quarterSort = (a: string, b: string) =>
  QUARTERS.indexOf(a) - QUARTERS.indexOf(b);

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const formatAverageLabel = (value: number | null) =>
  typeof value === 'number' ? value.toFixed(1).replace('.', ',') : '-';

const buildSnapshot = (draft: DraftSnapshotInput): string => {
  const sortedOverrides = Object.fromEntries(
    Object.entries(draft.textOverrides).sort(([a], [b]) => a.localeCompare(b)),
  );

  return JSON.stringify({
    ...draft,
    selectedStudentIds: [...draft.selectedStudentIds].sort(),
    selectedQuarters: [...new Set(draft.selectedQuarters)].sort(quarterSort),
    textOverrides: sortedOverrides,
  });
};

const extractPlaceholders = (text: string): string[] => {
  const tokens = new Set<string>();
  const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  let match: RegExpExecArray | null = regex.exec(text);
  while (match) {
    tokens.add(match[1]);
    match = regex.exec(text);
  }
  return Array.from(tokens);
};

export function UnifiedCertificateDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialEvent,
  classes,
  students,
  onSaveEvent,
  onSubmitEdit,
}: UnifiedCertificateDialogProps) {
  const { toast } = useToast();

  const [step, setStep] = useState(STEPS[0].id);
  const [certificateType, setCertificateType] = useState<CertificateType | null>(
    null,
  );

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<1 | 2 | 3>(1);
  const [referenceYear, setReferenceYear] = useState('');

  const [periodMode, setPeriodMode] = useState<CertificatePeriodMode>('quarters');
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);

  const [includeReference, setIncludeReference] = useState(false);
  const [referenceType, setReferenceType] = useState<'subject' | 'area'>(
    'subject',
  );
  const [referenceValue, setReferenceValue] = useState('');

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [role, setRole] = useState('');

  const [workloadHours, setWorkloadHours] = useState('');
  const [activity, setActivity] = useState('');

  const [baseText, setBaseText] = useState('');
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [signatureMode, setSignatureMode] =
    useState<SignatureMode>('digital_cursive');
  const [teacherName, setTeacherName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [hasManualStudentSelection, setHasManualStudentSelection] =
    useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState('');

  const { templates } = useProfessionalSubjectTemplates();
  const { getProfessionalSubjects } = useProfessionalSubjects();
  const { grades: classGrades } = useGradesAnalytics(
    { classId: selectedClassId || undefined },
    { enabled: open && !!selectedClassId },
  );

  const selectedClassData = useMemo(
    () => classes.find((item) => item.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const classStudents = useMemo(
    () =>
      students
        .filter((student) => student.classId === selectedClassId)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [selectedClassId, students],
  );

  const manualSubjects = useMemo(
    () => (selectedClassId ? getProfessionalSubjects(selectedClassId) : []),
    [selectedClassId, getProfessionalSubjects],
  );

  const technicalSubjects = useMemo(
    () =>
      resolveTechnicalSubjectsForSchoolYear({
        classData: selectedClassData,
        schoolYear: selectedSchoolYear,
        templates,
        manualSubjects,
        grades: classGrades,
      }),
    [selectedClassData, selectedSchoolYear, templates, manualSubjects, classGrades],
  );

  const subjectReferences = useMemo(
    () => resolveSubjectReferencesForClass(selectedClassData, technicalSubjects),
    [selectedClassData, technicalSubjects],
  );

  const areaReferences = useMemo(
    () => resolveAreaReferencesForClass(selectedClassData, technicalSubjects),
    [selectedClassData, technicalSubjects],
  );

  const selectedStudentSet = useMemo(
    () => new Set(selectedStudentIds),
    [selectedStudentIds],
  );

  const activeQuarters = useMemo(
    () => resolveCertificateQuarters(periodMode, selectedQuarters),
    [periodMode, selectedQuarters],
  );

  const highlightClassificationByStudentId = useMemo(() => {
    const map: Record<string, HighlightClassification> = {};
    if (certificateType !== 'destaque') return map;

    classStudents.forEach((student) => {
      const scopedGrades = classGrades.filter(
        (grade) =>
          grade.studentId === student.id &&
          (grade.schoolYear ?? 1) === selectedSchoolYear &&
          activeQuarters.includes(grade.quarter),
      );

      if (scopedGrades.length === 0) {
        map[student.id] = {
          eligible: false,
          status: 'pending',
          average: null,
          label: 'Sem dados no recorte',
          tone: 'pending',
          details: 'Sem notas suficientes no período selecionado.',
        };
        return;
      }

      const classification = classifyStudent(scopedGrades, []);
      const avgLabel = `Média ${formatAverageLabel(classification.average)}`;

      if (classification.classification === 'excelencia') {
        map[student.id] = {
          eligible: true,
          status: 'confirmed',
          average: classification.average,
          label: 'Excelência',
          tone: 'success',
          details: avgLabel,
        };
        return;
      }

      if (classification.classification === 'aprovado') {
        map[student.id] = {
          eligible: true,
          status: 'confirmed',
          average: classification.average,
          label: 'Aprovado',
          tone: 'default',
          details: avgLabel,
        };
        return;
      }

      map[student.id] = {
        eligible: false,
        status: 'pending',
        average: classification.average,
        label: 'Fora do critério',
        tone: 'pending',
        details: `${classification.classification === 'atencao' ? 'Atenção' : 'Crítico'} • ${avgLabel}`,
      };
    });

    return map;
  }, [certificateType, classStudents, classGrades, selectedSchoolYear, activeQuarters]);

  const highlightIndicatorsByStudentId = useMemo(() => {
    if (certificateType !== 'destaque') return undefined;

    return Object.fromEntries(
      Object.entries(highlightClassificationByStudentId).map(([studentId, item]) => [
        studentId,
        {
          label: item.label,
          tone: item.tone,
          details: item.details,
        },
      ]),
    );
  }, [certificateType, highlightClassificationByStudentId]);

  const highlightPreselectedIds = useMemo(() => {
    if (certificateType !== 'destaque') return [];
    return classStudents
      .filter((student) => highlightClassificationByStudentId[student.id]?.eligible)
      .map((student) => student.id);
  }, [certificateType, classStudents, highlightClassificationByStudentId]);

  const selectedQuartersKey = useMemo(
    () => selectedQuarters.join('|'),
    [selectedQuarters],
  );

  useEffect(() => {
    if (
      !open ||
      mode !== 'create' ||
      certificateType !== 'destaque' ||
      hasManualStudentSelection
    ) {
      return;
    }

    setSelectedStudentIds(highlightPreselectedIds);
  }, [
    open,
    mode,
    certificateType,
    hasManualStudentSelection,
    highlightPreselectedIds,
  ]);

  useEffect(() => {
    if (!open) return;
    setHasManualStudentSelection(false);
  }, [
    open,
    mode,
    certificateType,
    selectedClassId,
    selectedSchoolYear,
    periodMode,
    selectedQuartersKey,
  ]);

  const applyDraftToState = (draft: DraftSnapshotInput, targetStep: string) => {
    setStep(targetStep);
    setCertificateType(draft.certificateType);
    setSelectedClassId(draft.selectedClassId);
    setSelectedStudentIds(draft.selectedStudentIds);
    setEventTitle(draft.eventTitle);
    setSelectedSchoolYear(draft.selectedSchoolYear);
    setReferenceYear(draft.referenceYear);

    setPeriodMode(draft.periodMode);
    setSelectedQuarters(draft.selectedQuarters);

    setIncludeReference(draft.includeReference);
    setReferenceType(draft.referenceType);
    setReferenceValue(draft.referenceValue);

    setEventName(draft.eventName);
    setEventDate(draft.eventDate);
    setUseDateRange(draft.useDateRange);
    setEventStartDate(draft.eventStartDate);
    setEventEndDate(draft.eventEndDate);
    setRole(draft.role);

    setWorkloadHours(draft.workloadHours);
    setActivity(draft.activity);

    setBaseText(draft.baseText);
    setTextOverrides(draft.textOverrides);
    setSignatureMode(draft.signatureMode);
    setTeacherName(draft.teacherName);
    setIsExporting(false);
    setHasManualStudentSelection(false);
    setBaselineSnapshot(buildSnapshot(draft));
  };

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && initialEvent) {
      const eventTypeMeta = (initialEvent.typeMeta || {}) as CertificateEventTypeMeta;
      const eventMeta = eventTypeMeta.eventMeta;
      const monitoriaMeta = eventTypeMeta.monitoriaMeta;
      const classStudentsForEvent = students.filter(
        (student) => student.classId === initialEvent.classId,
      );

      const selectedIds: string[] = [];
      const initialOverrides: Record<string, string> = {};

      initialEvent.students.forEach((eventStudent) => {
        const fallbackStudent = classStudentsForEvent.find(
          (item) =>
            normalizeName(item.name) === normalizeName(eventStudent.studentNameSnapshot),
        );
        const resolvedId = eventStudent.studentId || fallbackStudent?.id;
        if (!resolvedId) return;
        selectedIds.push(resolvedId);
        if (eventStudent.textOverride?.trim()) {
          initialOverrides[resolvedId] = eventStudent.textOverride.trim();
        }
      });

      const draft: DraftSnapshotInput = {
        certificateType: initialEvent.certificateType,
        selectedClassId: initialEvent.classId || '',
        selectedStudentIds: Array.from(new Set(selectedIds)),
        eventTitle: initialEvent.title,
        selectedSchoolYear: initialEvent.schoolYear,
        referenceYear: String(
          typeof eventTypeMeta.referenceYear === 'number' &&
            Number.isFinite(eventTypeMeta.referenceYear)
            ? Math.trunc(eventTypeMeta.referenceYear)
            : Number.parseInt(
                initialEvent.periodLabel.match(/\b(19|20)\d{2}\b/)?.[0] || '',
                10,
              ) || '',
        ),
        periodMode: initialEvent.periodMode,
        selectedQuarters:
          initialEvent.selectedQuarters.length > 0
            ? [...initialEvent.selectedQuarters]
            : [],
        includeReference: Boolean(
          initialEvent.referenceType && initialEvent.referenceValue,
        ),
        referenceType: initialEvent.referenceType || 'subject',
        referenceValue: initialEvent.referenceValue || '',
        eventName: eventMeta?.eventName || '',
        eventDate: eventMeta?.eventDate || '',
        useDateRange: Boolean(eventMeta?.eventDateStart && eventMeta?.eventDateEnd),
        eventStartDate: eventMeta?.eventDateStart || '',
        eventEndDate: eventMeta?.eventDateEnd || '',
        role: eventMeta?.role || '',
        workloadHours:
          initialEvent.certificateType === 'monitoria'
            ? String(monitoriaMeta?.workloadHours ?? '')
            : initialEvent.certificateType === 'evento_participacao' ||
                initialEvent.certificateType === 'evento_organizacao'
              ? String(eventMeta?.workloadHours ?? '')
              : '',
        activity: monitoriaMeta?.activity || '',
        baseText: initialEvent.baseText || '',
        textOverrides: initialOverrides,
        signatureMode: initialEvent.signatureMode || 'digital_cursive',
        teacherName: initialEvent.teacherName || '',
      };

      applyDraftToState(draft, 'context');
      return;
    }

    const initialPeriodMode: CertificatePeriodMode = 'quarters';
    const draft: DraftSnapshotInput = {
      certificateType: null,
      selectedClassId: '',
      selectedStudentIds: [],
      eventTitle: '',
      selectedSchoolYear: 1,
      referenceYear: '',
      periodMode: initialPeriodMode,
      selectedQuarters: [],
      includeReference: false,
      referenceType: 'subject',
      referenceValue: '',
      eventName: '',
      eventDate: '',
      useDateRange: false,
      eventStartDate: '',
      eventEndDate: '',
      role: '',
      workloadHours: '',
      activity: '',
      baseText: '',
      textOverrides: {},
      signatureMode: 'digital_cursive',
      teacherName: '',
    };

    applyDraftToState(draft, 'type');
  }, [open, mode, initialEvent, students]);

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        certificateType,
        selectedClassId,
        selectedStudentIds,
        eventTitle,
        selectedSchoolYear,
        referenceYear,
        periodMode,
        selectedQuarters,
        includeReference,
        referenceType,
        referenceValue,
        eventName,
        eventDate,
        useDateRange,
        eventStartDate,
        eventEndDate,
        role,
        workloadHours,
        activity,
        baseText,
        textOverrides,
        signatureMode,
        teacherName,
      }),
    [
      certificateType,
      selectedClassId,
      selectedStudentIds,
      eventTitle,
      selectedSchoolYear,
      referenceYear,
      periodMode,
      selectedQuarters,
      includeReference,
      referenceType,
      referenceValue,
      eventName,
      eventDate,
      useDateRange,
      eventStartDate,
      eventEndDate,
      role,
      workloadHours,
      activity,
      baseText,
      textOverrides,
      signatureMode,
      teacherName,
    ],
  );

  const isDirty = open && Boolean(baselineSnapshot) && currentSnapshot !== baselineSnapshot;

  const placeholderDiagnostics = useMemo(() => {
    if (!certificateType) {
      return {
        invalidTokens: [] as string[],
        missingRequiredTokens: [] as string[],
        missingOptionalTokens: [] as string[],
      };
    }

    const relevantTexts = [baseText];
    selectedStudentIds.forEach((studentId) => {
      const overrideText = textOverrides[studentId];
      if (overrideText?.trim()) relevantTexts.push(overrideText);
    });

    const invalid = new Set<string>();
    relevantTexts.forEach((text) => {
      extractPlaceholders(text).forEach((token) => {
        if (!KNOWN_PLACEHOLDER_SET.has(token)) invalid.add(token);
      });
    });

    const baseTokens = new Set(extractPlaceholders(baseText));
    const requiredTokens = REQUIRED_TOKENS_BY_TYPE[certificateType];
    const allowedTokens = PLACEHOLDER_TOKENS_BY_TYPE[certificateType];

    return {
      invalidTokens: Array.from(invalid).sort((a, b) => a.localeCompare(b)),
      missingRequiredTokens: requiredTokens.filter((token) => !baseTokens.has(token)),
      missingOptionalTokens: allowedTokens.filter(
        (token) => !requiredTokens.includes(token) && !baseTokens.has(token),
      ),
    };
  }, [certificateType, baseText, textOverrides, selectedStudentIds]);

  const closeDialog = (force = false) => {
    if (!force && isDirty) {
      const confirmed = window.confirm(
        'Existem alterações não salvas. Deseja realmente fechar?',
      );
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  const handleSelectType = (type: CertificateType) => {
    if (certificateType === type) {
      setStep('context');
      return;
    }

    setCertificateType(type);
    setBaseText(getCertificateTemplate(type));
    setRole('');
    setStep('context');
  };

  const handleQuarterToggle = (quarter: string, checked: boolean) => {
    if (checked) {
      setSelectedQuarters((prev) =>
        Array.from(new Set([...prev, quarter])).sort(quarterSort),
      );
      return;
    }
    setSelectedQuarters((prev) => prev.filter((item) => item !== quarter));
  };

  const currentStepIndex = STEPS.findIndex((item) => item.id === step);
  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setStep(STEPS[currentStepIndex + 1].id);
    }
  };
  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const validateContextStep = (): string | null => {
    if (!selectedClassId) return 'Por favor, selecione uma turma alvo.';
    if (!eventTitle.trim()) return 'Informe o nome interno do certificado/evento.';
    const parsedReferenceYear = Number(referenceYear);
    if (!Number.isInteger(parsedReferenceYear) || parsedReferenceYear < 1900 || parsedReferenceYear > 2100) {
      return 'Informe um ano de referência válido entre 1900 e 2100.';
    }
    if (periodMode === 'quarters' && activeQuarters.length === 0) {
      return 'Selecione ao menos um bimestre para o recorte.';
    }
    if (includeReference && !referenceValue) {
      return 'Selecione a disciplina/área vinculada ou desative o vínculo.';
    }
    if (!certificateType) return 'Selecione o tipo de certificado.';

    const hours = Number(workloadHours);
    const requiresWorkload =
      certificateType === 'monitoria' ||
      certificateType === 'evento_participacao' ||
      certificateType === 'evento_organizacao';

    if (requiresWorkload && (!Number.isFinite(hours) || hours <= 0)) {
      return 'Informe uma carga horária válida maior que zero.';
    }

    if (
      certificateType === 'evento_participacao' ||
      certificateType === 'evento_organizacao'
    ) {
      if (!eventName.trim()) return 'Informe o nome do evento.';
      if (!eventDate) return 'Informe a data principal do evento.';
      if (useDateRange && (!eventStartDate || !eventEndDate)) {
        return 'Preencha as datas de início e fim do período estendido.';
      }
      if (!role.trim()) {
        return 'Informe a função/papel do aluno no evento.';
      }
    }

    if (certificateType === 'monitoria') {
      if (!activity.trim()) return 'Informe a atividade da monitoria.';
    }

    return null;
  };

  const validateTextStep = (): string | null => {
    if (!baseText.trim()) return 'O corpo do certificado não pode estar em branco.';
    if (placeholderDiagnostics.invalidTokens.length > 0) {
      return `Placeholders inválidos encontrados: ${placeholderDiagnostics.invalidTokens.join(', ')}.`;
    }
    if (placeholderDiagnostics.missingRequiredTokens.length > 0 && certificateType) {
      return `Inclua no texto base os placeholders obrigatórios: ${placeholderDiagnostics.missingRequiredTokens.join(', ')}.`;
    }
    return null;
  };

  const handleNextClick = () => {
    if (step === 'context') {
      const contextError = validateContextStep();
      if (contextError) {
        toast({
          variant: 'destructive',
          title: 'Validação de contexto',
          description: contextError,
        });
        return;
      }
    }

    if (step === 'students' && selectedStudentIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Seleção obrigatória',
        description: 'Selecione ao menos um aluno para continuar.',
      });
      return;
    }

    if (step === 'text') {
      const textError = validateTextStep();
      if (textError) {
        toast({
          variant: 'destructive',
          title: 'Validação de placeholders',
          description: textError,
        });
        return;
      }
    }

    goNext();
  };

  const handleExport = async (downloadMode: 'zip' | 'combined') => {
    if (!certificateType || !selectedClassData) return;
    if (!teacherName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Assinatura obrigatória',
        description: 'Preencha o nome do professor para a assinatura.',
      });
      return;
    }

    const contextError = validateContextStep();
    if (contextError) {
      toast({
        variant: 'destructive',
        title: 'Validação de contexto',
        description: contextError,
      });
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Seleção obrigatória',
        description: 'Selecione ao menos um aluno para continuar.',
      });
      return;
    }

    const textError = validateTextStep();
    if (textError) {
      toast({
        variant: 'destructive',
        title: 'Validação de placeholders',
        description: textError,
      });
      return;
    }

    setIsExporting(true);

    const selectedStudentsData = classStudents.filter((student) =>
      selectedStudentSet.has(student.id),
    );
    const parsedReferenceYear = Math.trunc(Number(referenceYear));
    const referenceYearToken = String(parsedReferenceYear);
    const periodLabel = formatCertificatePeriodLabel(
      periodMode,
      selectedQuarters,
      parsedReferenceYear,
    );
    const resolvedReferenceLabel = includeReference
      ? (
          referenceType === 'subject' ? subjectReferences : areaReferences
        ).find((item) => item.value === referenceValue)?.label
      : undefined;
    const resolvedQuarters = resolveCertificateQuarters(
      periodMode,
      selectedQuarters,
    );
    const quarterNumbers = resolvedQuarters
      .map((quarter) => Number(quarter.match(/(\d+)/)?.[1]))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 4)
      .sort((a, b) => a - b);
    const hasContiguousQuarterRange =
      quarterNumbers.length > 1 &&
      quarterNumbers.every((value, index) =>
        index === 0 ? true : value === quarterNumbers[index - 1] + 1,
      );
    const monitoriaPeriodText =
      periodMode === 'annual'
        ? `durante o ano de ${parsedReferenceYear}`
        : quarterNumbers.length === 1
          ? `no período do ${quarterNumbers[0]}º bimestre de ${parsedReferenceYear}`
          : hasContiguousQuarterRange
            ? `no período do ${quarterNumbers[0]}º ao ${quarterNumbers[quarterNumbers.length - 1]}º bimestre de ${parsedReferenceYear}`
            : `no período de ${periodLabel}`;

    const eventMeta =
      certificateType === 'evento_participacao' ||
      certificateType === 'evento_organizacao'
        ? {
            eventName: eventName.trim(),
            eventDate: eventDate.replace(/^\d{4}(?=-)/, referenceYearToken),
            eventDateStart: useDateRange
              ? eventStartDate.replace(/^\d{4}(?=-)/, referenceYearToken)
              : undefined,
            eventDateEnd: useDateRange
              ? eventEndDate.replace(/^\d{4}(?=-)/, referenceYearToken)
              : undefined,
            workloadHours: Number(workloadHours),
            role: role.trim(),
          }
        : undefined;

    const monitoriaMeta =
      certificateType === 'monitoria'
        ? {
            workloadHours: Number(workloadHours),
            monitoriaPeriod: monitoriaPeriodText,
            activity: activity.trim(),
          }
        : undefined;

    const highlightMetaByStudentId =
      certificateType === 'destaque'
        ? selectedStudentsData.reduce<
            Record<string, { status: 'confirmed' | 'pending'; average: number | null }>
          >((acc, student) => {
            const item = highlightClassificationByStudentId[student.id];
            if (!item) {
              acc[student.id] = { status: 'pending', average: null };
              return acc;
            }
            acc[student.id] = {
              status: item.status,
              average: item.average,
            };
            return acc;
          }, {})
        : undefined;

    const typeMeta: Record<string, unknown> = {
      schemaVersion: 3,
      referenceYear: parsedReferenceYear,
      ...(eventMeta ? { eventMeta } : {}),
      ...(monitoriaMeta ? { monitoriaMeta } : {}),
      ...(highlightMetaByStudentId
        ? { highlightMetaByStudentId }
        : {}),
    };

    const savePayloadBase = {
      title: eventTitle.trim(),
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
      typeMeta,
      students: selectedStudentsData.map((student) => {
        const highlight = highlightClassificationByStudentId[student.id];
        return {
          studentId: student.id,
          studentNameSnapshot: student.name,
          textOverride: textOverrides[student.id]?.trim() || undefined,
          highlightStatus:
            certificateType === 'destaque' ? highlight?.status : undefined,
          highlightAverage:
            certificateType === 'destaque' ? highlight?.average ?? null : undefined,
        };
      }),
    };

    const exportInput: ExportCertificatesPdfInput = {
      certificateType,
      classData: { id: selectedClassData.id, name: selectedClassData.name },
      schoolYear: selectedSchoolYear,
      periodLabel,
      referenceLabel: resolvedReferenceLabel,
      baseText,
      students: selectedStudentsData.map((student) => ({
        id: student.id,
        name: student.name,
      })),
      textOverrides,
      teacherName: teacherName.trim() || undefined,
      signatureMode,
      verificationCodesByStudentId: {},
      eventMeta,
      monitoriaMeta,
      highlightMetaByStudentId:
        certificateType === 'destaque'
          ? highlightMetaByStudentId
          : undefined,
    };

    try {
      let savedEvent: SavedCertificateEvent;
      if (mode === 'edit' && initialEvent) {
        if (!onSubmitEdit) {
          throw new Error('Fluxo de edição indisponível no momento.');
        }
        savedEvent = await onSubmitEdit(
          initialEvent.id,
          savePayloadBase as UpdateSavedCertificateEventInput,
        );
      } else {
        savedEvent = await onSaveEvent(
          savePayloadBase as CreateSavedCertificateEventInput,
        );
      }

      const verificationMap: Record<string, string> = {};
      selectedStudentsData.forEach((student) => {
        const matched =
          savedEvent.students.find(
            (savedStudent) => savedStudent.studentId === student.id,
          ) ||
          savedEvent.students.find(
            (savedStudent) =>
              normalizeName(savedStudent.studentNameSnapshot) ===
              normalizeName(student.name),
          );
        if (matched?.verificationCode) {
          verificationMap[student.id] = matched.verificationCode;
        }
      });

      const studentsWithoutCode = selectedStudentsData.filter(
        (student) => !verificationMap[student.id]?.trim(),
      );
      if (studentsWithoutCode.length > 0) {
        const firstName = studentsWithoutCode[0]?.name || 'aluno';
        throw new Error(
          `Não foi possível gerar código de verificação para ${studentsWithoutCode.length} aluno(s). Exemplo: ${firstName}.`,
        );
      }

      exportInput.verificationCodesByStudentId = verificationMap;

      if (downloadMode === 'combined') {
        const { downloadCombinedCertificatePdf } = await import(
          '@/lib/certificatePdfExport'
        );
        await downloadCombinedCertificatePdf(exportInput);
      } else {
        const { downloadCertificateFiles, generateCertificateFiles } = await import(
          '@/lib/certificatePdfExport'
        );
        const files = await generateCertificateFiles(exportInput);
        await downloadCertificateFiles(files, { forceZip: true });
      }

      toast({
        title: 'Sucesso',
        description:
          mode === 'edit'
            ? 'Certificado atualizado e exportado com sucesso.'
            : 'Certificados emitidos e histórico salvo com sucesso.',
      });
      closeDialog(true);
    } catch (error) {
      console.error('Erro na emissão/edição de certificado:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de emissão',
        description:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao salvar e gerar os certificados.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const placeholderTokens = certificateType
    ? PLACEHOLDER_TOKENS_BY_TYPE[certificateType]
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        closeDialog();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-full bg-primary/15 dark:bg-primary/20">
              <FileCheck2 className="h-5 w-5 text-primary" />
            </div>
            {mode === 'edit' ? 'Editar Certificado' : 'Emitir Certificados'}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {mode === 'edit'
              ? 'Atualize as etapas e salve para manter o evento sincronizado.'
              : 'Siga as etapas para configurar e gerar documentos validáveis.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {step !== 'type' && (
            <div className="w-full border-b bg-slate-50/50 flex-shrink-0">
              <CertificateDialogStepper
                steps={STEPS.slice(1)}
                currentStep={step}
                onStepChange={setStep}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white overflow-hidden">
            {step === 'type' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Escolha a categoria
                </h3>
                <div className="space-y-3">
                  {TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelectType(option.id)}
                        className="w-full group text-left border rounded-xl p-4 flex items-start gap-4 hover:border-primary/50 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <div className="bg-primary/5 rounded-full p-2.5 mt-0.5 text-primary group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 mb-0.5">
                            {option.title}
                          </h4>
                          <p className="text-sm text-slate-500 leading-relaxed">
                            {option.description}
                          </p>
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
                  referenceYear={referenceYear}
                  setReferenceYear={setReferenceYear}
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
                  activity={activity}
                  setActivity={setActivity}
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
                    onChange={(ids) => {
                      setHasManualStudentSelection(true);
                      setSelectedStudentIds(ids);
                    }}
                    indicatorsByStudentId={highlightIndicatorsByStudentId}
                    emptyMessage="Nenhum aluno disponível nesta turma."
                  />
                </div>
              </div>
            )}

            {step === 'text' && certificateType && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {(placeholderDiagnostics.invalidTokens.length > 0 ||
                  placeholderDiagnostics.missingRequiredTokens.length > 0 ||
                  placeholderDiagnostics.missingOptionalTokens.length > 0) && (
                  <div className="rounded-lg border bg-slate-50 px-4 py-3 space-y-1 text-xs">
                    {placeholderDiagnostics.invalidTokens.length > 0 && (
                      <p className="text-destructive">
                        Placeholders inválidos: {placeholderDiagnostics.invalidTokens.join(', ')}.
                      </p>
                    )}
                    {placeholderDiagnostics.missingRequiredTokens.length > 0 && (
                      <p className="text-destructive">
                        Placeholders obrigatórios ausentes: {placeholderDiagnostics.missingRequiredTokens.join(', ')}.
                      </p>
                    )}
                    {placeholderDiagnostics.missingOptionalTokens.length > 0 && (
                      <p className="text-muted-foreground">
                        Aviso: placeholders opcionais não utilizados no texto base: {placeholderDiagnostics.missingOptionalTokens.join(', ')}.
                      </p>
                    )}
                  </div>
                )}

                <CertificateTextEditor
                  baseText={baseText}
                  onBaseTextChange={setBaseText}
                  selectedStudents={classStudents.filter((student) =>
                    selectedStudentSet.has(student.id),
                  )}
                  textOverrides={textOverrides}
                  onTextOverrideChange={(id, value) =>
                    setTextOverrides((prev) => ({ ...prev, [id]: value }))
                  }
                  placeholderTokens={placeholderTokens}
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
                />
              </div>
            )}

            {step !== 'type' && (
              <div className="p-4 mt-auto border-t bg-slate-50/50 flex justify-between">
                <Button onClick={goBack} variant="outline">
                  Etapa anterior
                </Button>
                {step === 'finish' ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isExporting}
                      onClick={() => handleExport('zip')}
                    >
                      Salvar + ZIP Individual
                    </Button>
                    <Button
                      type="button"
                      disabled={isExporting}
                      onClick={() => handleExport('combined')}
                    >
                      {isExporting ? 'Processando PDF...' : 'Salvar + PDF Único'}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleNextClick}>Próxima etapa</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
