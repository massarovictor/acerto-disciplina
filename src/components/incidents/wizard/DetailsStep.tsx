import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IncidentFormData } from '../IncidentWizard';
import { calculateSuggestedAction } from '@/lib/incidentActions';
import { useIncidents } from '@/hooks/useLocalStorage';
import { useStudents } from '@/hooks/useLocalStorage';

interface DetailsStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
}

export const DetailsStep = ({ formData, updateFormData }: DetailsStepProps) => {
  const { incidents } = useIncidents();
  const { students } = useStudents();

  useEffect(() => {
    if (formData.studentIds && formData.finalSeverity && formData.studentIds.length > 0 && !formData.suggestedAction) {
      const suggested = calculateSuggestedAction(
        formData.studentIds,
        formData.finalSeverity,
        incidents,
        students
      );
      updateFormData({ suggestedAction: suggested });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.studentIds, formData.finalSeverity, formData.suggestedAction]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Detalhes da Ocorrência</h2>
        <p className="text-muted-foreground mt-1">
          Descreva detalhadamente o que aconteceu
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Descrição Detalhada</Label>
          <Textarea
            id="description"
            placeholder="Descreva com detalhes o que aconteceu, contexto e circunstâncias..."
            value={formData.description || ''}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={8}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {formData.description?.length || 0} / 1000 caracteres
          </p>
        </div>
      </div>
    </div>
  );
};
