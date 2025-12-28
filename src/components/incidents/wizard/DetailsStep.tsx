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
    const suggested = calculateSuggestedAction(
      formData.studentIds,
      formData.finalSeverity,
      incidents,
      students
    );

    // Atualiza a sugestão e pré-preenche as providências se estiver vazio
    updateFormData({
      suggestedAction: suggested,
      actions: formData.actions || suggested
    });
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
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {formData.description?.length || 0} / 1000 caracteres
          </p>
        </div>

        {formData.suggestedAction && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 border">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              💡 Sugestão do Sistema
            </h4>
            <p className="text-sm text-muted-foreground">{formData.suggestedAction}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="actions">Providências Tomadas</Label>
          <Textarea
            id="actions"
            placeholder="Descreva as providências iniciais (ex: conversa, advertência)..."
            value={formData.actions || ''}
            onChange={(e) => updateFormData({ actions: e.target.value })}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Este texto aparecerá no campo "Providências Tomadas" do PDF.
          </p>
        </div>
      </div>
    </div>
  );
};
