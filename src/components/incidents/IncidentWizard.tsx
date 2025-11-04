import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ContextStep } from './wizard/ContextStep';
import { StudentsStep } from './wizard/StudentsStep';
import { EpisodesStep } from './wizard/EpisodesStep';
import { DetailsStep } from './wizard/DetailsStep';
import { ReviewStep } from './wizard/ReviewStep';
import { IncidentSeverity } from '@/types';
import { useIncidents } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface IncidentFormData {
  classId: string;
  date: string;
  period: 'morning' | 'afternoon' | 'evening';
  studentIds: string[];
  episodes: string[];
  calculatedSeverity: IncidentSeverity;
  finalSeverity: IncidentSeverity;
  severityOverrideReason?: string;
  description: string;
  actions?: string;
}

const steps = [
  { id: 1, name: 'Contexto', component: ContextStep },
  { id: 2, name: 'Alunos', component: StudentsStep },
  { id: 3, name: 'Episódios', component: EpisodesStep },
  { id: 4, name: 'Detalhes', component: DetailsStep },
  { id: 5, name: 'Revisão', component: ReviewStep },
];

export const IncidentWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({
    date: new Date().toISOString().split('T')[0],
    period: 'morning',
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

  const handleSubmit = () => {
    if (!user || !formData.classId || !formData.studentIds || !formData.episodes) {
      return;
    }

    addIncident({
      classId: formData.classId,
      date: formData.date || new Date().toISOString(),
      period: formData.period || 'morning',
      studentIds: formData.studentIds,
      episodes: formData.episodes,
      calculatedSeverity: formData.calculatedSeverity || 'leve',
      finalSeverity: formData.finalSeverity || formData.calculatedSeverity || 'leve',
      description: formData.description || '',
      actions: formData.actions,
      status: 'aberta',
      createdBy: user.id,
    });

    toast({
      title: 'Ocorrência registrada',
      description: 'A ocorrência foi registrada com sucesso.',
    });

    navigate('/');
  };

  const CurrentStepComponent = steps[currentStep - 1].component;
  const canGoNext = () => {
    if (currentStep === 1) return !!formData.classId;
    if (currentStep === 2) return formData.studentIds && formData.studentIds.length > 0;
    if (currentStep === 3) return formData.episodes && formData.episodes.length > 0;
    if (currentStep === 4) return true;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {step.id}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-0.5 flex-1 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="p-6">
        <CurrentStepComponent formData={formData} updateFormData={updateFormData} />
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
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
