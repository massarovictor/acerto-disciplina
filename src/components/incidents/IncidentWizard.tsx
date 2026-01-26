import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ContextStep } from "./wizard/ContextStep";
import { StudentsStep } from "./wizard/StudentsStep";
import { EpisodesStep } from "./wizard/EpisodesStep";
import { DetailsStep } from "./wizard/DetailsStep";
import { ReviewStep } from "./wizard/ReviewStep";
import { IncidentSeverity } from "@/types";
import { useIncidents } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

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

const steps = [
  { id: 1, name: "Contexto", component: ContextStep },
  { id: 2, name: "Alunos", component: StudentsStep },
  { id: 3, name: "Episódios", component: EpisodesStep },
  { id: 4, name: "Detalhes", component: DetailsStep },
  { id: 5, name: "Revisão", component: ReviewStep },
];

interface IncidentWizardProps {
  onComplete?: () => void;
}

export const IncidentWizard = ({ onComplete }: IncidentWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({
    date: format(new Date(), "yyyy-MM-dd"),
    studentIds: [],
    episodes: [],
  });

  const { addIncident } = useIncidents();
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

  const handleSubmit = async () => {
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
        description: "Informe o motivo da alteracao do grau final.",
        variant: "destructive",
      });
      setCurrentStep(3);
      return;
    }

    try {
      await addIncident({
        classId: formData.classId,
        date: formData.date || new Date().toISOString().split("T")[0],
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

      toast({
        title: "Ocorrência registrada",
        description:
          "A ocorrência foi registrada com sucesso e aguarda validação.",
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a ocorrência.",
        variant: "destructive",
      });
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

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case "leve":
        return "bg-severity-light-bg text-severity-light border-severity-light";
      case "intermediaria":
        return "bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate";
      case "grave":
        return "bg-severity-serious-bg text-severity-serious border-severity-serious";
      case "gravissima":
        return "bg-severity-critical-bg text-severity-critical border-severity-critical";
      default:
        return "";
    }
  };

  const getSeverityLabel = (severity: IncidentSeverity) => {
    switch (severity) {
      case "leve":
        return "Leve";
      case "intermediaria":
        return "Intermediária";
      case "grave":
        return "Grave";
      case "gravissima":
        return "Gravíssima";
      default:
        return severity;
    }
  };

  // Determina a gravidade a exibir (final se definida, senão calculada)
  const displaySeverity = formData.finalSeverity || formData.calculatedSeverity;

  return (
    <div className="space-y-6">
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
              <span className="text-sm text-muted-foreground">Gravidade:</span>
              <Badge
                variant="outline"
                className={getSeverityColor(displaySeverity)}
              >
                {getSeverityLabel(displaySeverity)}
              </Badge>
            </div>
          )}
      </div>

      {/* Step content */}
      <div className="border rounded-lg p-6 bg-background/50">
        <CurrentStepComponent
          formData={formData}
          updateFormData={updateFormData}
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
          <Button onClick={handleSubmit}>Registrar Ocorrência</Button>
        )}
      </div>
    </div>
  );
};
