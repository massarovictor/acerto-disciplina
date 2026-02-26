import { useState, useRef, useEffect, type ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ContextStep } from "./wizard/ContextStep";
import { StudentsStep } from "./wizard/StudentsStep";
import { EpisodesStep } from "./wizard/EpisodesStep";
import { DetailsStep } from "./wizard/DetailsStep";
import { ReviewStep } from "./wizard/ReviewStep";
import { IncidentSeverity, IncidentType } from "@/types";
import { useIncidents, useClasses, useStudents } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { getSeverityColor } from "@/lib/incidentUtils";
import { sendIncidentEmail } from "@/lib/emailService";
import { getBrasiliaISODate } from "@/lib/brasiliaDate";
import { getIncidentSeverityLabel } from "@/lib/incidentType";

export interface IncidentFormData {
  classId: string;
  date: string;
  studentIds: string[];
  episodes: string[];
  calculatedSeverity: IncidentSeverity;
  finalSeverity: IncidentSeverity;
  severityOverrideReason?: string;
  description: string;
  actions?: string;
  suggestedAction?: string;
}

interface IncidentWizardStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
  incidentType: IncidentType;
}

const steps: Array<{
  id: number;
  name: string;
  component: ComponentType<IncidentWizardStepProps>;
}> = [
  { id: 1, name: "Contexto", component: ContextStep },
  { id: 2, name: "Alunos", component: StudentsStep },
  { id: 3, name: "Episódios", component: EpisodesStep },
  { id: 4, name: "Detalhes", component: DetailsStep },
  { id: 5, name: "Revisão", component: ReviewStep },
];

interface IncidentWizardProps {
  onComplete?: () => void;
  incidentType?: IncidentType;
}

export const IncidentWizard = ({
  onComplete,
  incidentType = "disciplinar",
}: IncidentWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({
    date: getBrasiliaISODate(),
    studentIds: [],
    episodes: [],
  });

  const { addIncident } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateFormData = (data: Partial<IncidentFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Ref para scroll container
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll para o topo quando troca de página
  useEffect(() => {
    // Encontra o container com scroll (DialogContent ou página)
    const scrollableParent = contentRef.current?.closest('[data-radix-scroll-area-viewport], .overflow-y-auto, [style*="overflow"]');
    if (scrollableParent) {
      scrollableParent.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Fallback: scroll da janela
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (
      !user ||
      !formData.classId ||
      !formData.studentIds ||
      !formData.episodes
    ) {
      return;
    }

    const calculatedSeverity = formData.calculatedSeverity || "leve";
    const finalSeverity = formData.finalSeverity || calculatedSeverity;

    if (
      finalSeverity !== calculatedSeverity &&
      !formData.severityOverrideReason?.trim()
    ) {
      toast({
        title: "Erro",
        description:
          incidentType === "acompanhamento_familiar"
            ? "Informe o motivo da alteração do nível final de atenção."
            : "Informe o motivo da alteração do grau final.",
        variant: "destructive",
      });
      setCurrentStep(3);
      return;
    }

    try {
      setIsSubmitting(true);
      const newIncident = await addIncident({
        incidentType,
        classId: formData.classId,
        date: formData.date || getBrasiliaISODate(),
        studentIds: formData.studentIds,
        episodes: formData.episodes,
        calculatedSeverity,
        finalSeverity,
        severityOverrideReason:
          formData.severityOverrideReason?.trim() || undefined,
        description: formData.description || "",
        actions: formData.actions,
        suggestedAction: formData.suggestedAction,
        status: "aberta",
        createdBy: user.id,
      });

      // Enviar email de notificação ao diretor de turma
      if (newIncident) {
        const incidentClass = classes.find(c => c.id === formData.classId);
        if (incidentClass?.directorEmail) {
          sendIncidentEmail('new_incident', newIncident, incidentClass, students)
            .then(result => {
              if (result.success) {
                console.log('Email de notificação enviado com sucesso');
              } else {
                console.warn('Falha ao enviar email:', result.error);
              }
            })
            .catch(err => console.error('Erro ao enviar email:', err));
        }
      }

      toast({
        title:
          incidentType === "acompanhamento_familiar"
            ? "Acompanhamento familiar registrado"
            : "Ocorrência registrada",
        description:
          incidentType === "acompanhamento_familiar"
            ? "O acompanhamento familiar foi registrado com sucesso."
            : "A ocorrência foi registrada com sucesso e aguarda validação.",
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description:
          incidentType === "acompanhamento_familiar"
            ? "Não foi possível registrar o acompanhamento familiar."
            : "Não foi possível registrar a ocorrência.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;
  const canGoNext = () => {
    if (currentStep === 1) return !!formData.classId;
    if (currentStep === 2)
      return formData.studentIds && formData.studentIds.length > 0;
    if (currentStep === 3) {
      if (!formData.episodes || formData.episodes.length === 0) return false;
      const calculatedSeverity = formData.calculatedSeverity || "leve";
      const finalSeverity = formData.finalSeverity || calculatedSeverity;
      if (
        finalSeverity !== calculatedSeverity &&
        !formData.severityOverrideReason?.trim()
      ) {
        return false;
      }
      return true;
    }
    if (currentStep === 4) return true;
    return true;
  };



  // Determina a gravidade a exibir (final se definida, senão calculada)
  const displaySeverity = formData.finalSeverity || formData.calculatedSeverity;

  return (
    <div ref={contentRef} className="space-y-6">
      {/* Progress indicator with severity badge */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center justify-between flex-1">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${currentStep >= step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                    }`}
                >
                  {step.id}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${currentStep >= step.id
                    ? "text-foreground"
                    : "text-muted-foreground"
                    }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-4 h-0.5 flex-1 ${currentStep > step.id ? "bg-primary" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Severity Badge - appears after episodes are selected */}
        {displaySeverity &&
          formData.episodes &&
          formData.episodes.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {incidentType === "acompanhamento_familiar"
                  ? "Nível de atenção:"
                  : "Gravidade:"}
              </span>
              <Badge
                variant="outline"
                className={getSeverityColor(displaySeverity)}
              >
                {getIncidentSeverityLabel(displaySeverity, incidentType)}
              </Badge>
            </div>
          )}
      </div>

      {/* Step content */}
      <div className="border rounded-lg p-6 bg-background/50">
        <CurrentStepComponent
          formData={formData}
          updateFormData={updateFormData}
          incidentType={incidentType}
        />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Voltar
        </Button>
        {currentStep < steps.length ? (
          <Button onClick={handleNext} disabled={!canGoNext()}>
            Avançar
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {incidentType === "acompanhamento_familiar"
              ? "Registrar Acompanhamento Familiar"
              : isSubmitting
                ? "Registrando..."
                : "Registrar Ocorrência"}
          </Button>
        )}
      </div>
    </div>
  );
};

