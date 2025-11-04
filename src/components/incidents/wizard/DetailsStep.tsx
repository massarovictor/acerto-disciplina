import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IncidentFormData } from '../IncidentWizard';

interface DetailsStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
}

export const DetailsStep = ({ formData, updateFormData }: DetailsStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Detalhes da Ocorrência</h2>
        <p className="text-muted-foreground mt-1">
          Descreva o que aconteceu e as providências tomadas ou sugeridas
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
          <p className="text-xs text-muted-foreground">
            {formData.description?.length || 0} / 1000 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="actions">Providências Tomadas / Sugeridas</Label>
          <Textarea
            id="actions"
            placeholder="Descreva as ações já tomadas ou sugestões de providências..."
            value={formData.actions || ''}
            onChange={(e) => updateFormData({ actions: e.target.value })}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Opcional - pode ser preenchido posteriormente pelo diretor
          </p>
        </div>
      </div>
    </div>
  );
};
