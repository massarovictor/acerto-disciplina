import { useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { IncidentFormData } from '../IncidentWizard';
import { IncidentSeverity, IncidentType } from '@/types';
import {
  calculateSuggestedAction,
  getRequiredActionLevel,
  checkEscalationStatus,
  ActionLevel
} from '@/lib/incidentActions';
import { useIncidents, useStudents } from '@/hooks/useData';

interface DetailsStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
  incidentType: IncidentType;
}

const ACTION_LEVEL_LABELS: Record<ActionLevel, string> = {
  'conversa_registro': 'Conversa e Registro',
  'comunicado_pais': 'Comunicado aos Pais',
  'suspensao_1_dia': 'Suspensão de 1 Dia',
  'suspensao_3_dias': 'Suspensão de 3 Dias',
};

export const DetailsStep = ({
  formData,
  updateFormData,
  incidentType,
}: DetailsStepProps) => {
  const { incidents } = useIncidents();
  const { students } = useStudents();
  const isFamilyFlow = incidentType === 'acompanhamento_familiar';

  const getFamilySuggestedAction = (severity: IncidentSeverity): string => {
    switch (severity) {
      case 'gravissima':
        return 'Acionar imediatamente equipe gestora e rede de apoio para construir plano protetivo com a família.';
      case 'grave':
        return 'Realizar reunião prioritária com responsáveis e equipe pedagógica para definir plano intensivo de acompanhamento.';
      case 'intermediaria':
        return 'Promover atendimento com responsáveis e alinhar intervenções pedagógicas e socioemocionais de curto prazo.';
      default:
        return 'Registrar escuta inicial com estudante e responsáveis, com orientações pedagógicas e monitoramento próximo.';
    }
  };

  // Calculate required action level based on current severity + history
  const requiredLevel = useMemo(() => {
    if (isFamilyFlow) return 'conversa_registro';
    if (!formData.studentIds?.length || !formData.finalSeverity) return 'conversa_registro';
    return getRequiredActionLevel(formData.studentIds, formData.finalSeverity, incidents);
  }, [formData.studentIds, formData.finalSeverity, incidents, isFamilyFlow]);

  // Check escalation status for each student
  const escalationInfo = useMemo(() => {
    if (isFamilyFlow) return [];
    if (!formData.studentIds?.length) return [];
    return formData.studentIds.map(studentId => {
      const student = students.find(s => s.id === studentId);
      const status = checkEscalationStatus(studentId, incidents);
      return {
        studentId,
        studentName: student?.name || 'Aluno',
        ...status
      };
    }).filter(info => info.isEscalated);
  }, [formData.studentIds, incidents, students, isFamilyFlow]);

  useEffect(() => {
    const severity = formData.finalSeverity || 'leve';
    const suggested = isFamilyFlow
      ? getFamilySuggestedAction(severity)
      : calculateSuggestedAction(
          formData.studentIds || [],
          severity,
          incidents,
          students
        );

    const hasManualActions = (formData.actions ?? '').trim().length > 0;
    const shouldUpdateSuggested = formData.suggestedAction !== suggested;
    const shouldPrefillActions = !hasManualActions && formData.actions !== suggested;

    if (shouldUpdateSuggested || shouldPrefillActions) {
      updateFormData({
        suggestedAction: suggested,
        actions: hasManualActions ? formData.actions : suggested,
      });
    }
  }, [
    formData.actions,
    formData.finalSeverity,
    formData.studentIds,
    formData.suggestedAction,
    incidents,
    isFamilyFlow,
    students,
    updateFormData,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {isFamilyFlow
            ? 'Detalhes do Acompanhamento Familiar'
            : 'Detalhes da Ocorrência'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isFamilyFlow
            ? 'Descreva o contexto pedagógico e emocional do acompanhamento'
            : 'Descreva detalhadamente o que aconteceu'}
        </p>
      </div>

      {/* Escalation Warning */}
      {!isFamilyFlow && escalationInfo.length > 0 && (
        <Alert variant="destructive" className="border-warning/30 bg-warning/10 dark:bg-warning/20">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="text-warning dark:text-warning font-bold">
            ⚠️ Acumulação de Acompanhamentos Detectada
          </AlertTitle>
          <AlertDescription className="text-warning dark:text-warning space-y-2">
            <p className="font-medium">
              Ação obrigatória: <strong>{ACTION_LEVEL_LABELS[requiredLevel]}</strong>
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {escalationInfo.map(info => (
                <li key={info.studentId}>
                  <strong>{info.studentName}</strong>: {info.reason}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-2 font-medium">
              O acompanhamento desta ocorrência exigirá contato com os responsáveis.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Required Action Level Badge */}
      {!isFamilyFlow && requiredLevel !== 'conversa_registro' && (
        <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 dark:border-destructive/40 p-4 rounded-lg">
          <p className="text-sm font-semibold text-destructive dark:text-destructive">
            📋 Nível de Ação Obrigatório: {ACTION_LEVEL_LABELS[requiredLevel]}
          </p>
          <p className="text-xs text-destructive dark:text-destructive mt-1">
            Baseado na gravidade atual e histórico acumulado do(s) aluno(s).
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Descrição Detalhada</Label>
          <Textarea
            id="description"
            placeholder={
              isFamilyFlow
                ? 'Descreva os fatores pedagógicos e emocionais observados no acompanhamento...'
                : 'Descreva com detalhes o que aconteceu, contexto e circunstâncias...'
            }
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
              💡
              {isFamilyFlow
                ? ' Plano de apoio sugerido'
                : ' Ação Sugerida pelo Sistema'}
            </h4>
            <p className="text-sm text-muted-foreground">{formData.suggestedAction}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="actions">Providências Tomadas</Label>
          <Textarea
            id="actions"
            placeholder={
              isFamilyFlow
                ? 'Descreva as ações pedagógicas e socioemocionais combinadas com a família...'
                : 'Descreva as providências iniciais (ex: conversa, advertência)...'
            }
            value={formData.actions || ''}
            onChange={(e) => updateFormData({ actions: e.target.value })}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Este texto aparecerá no campo de providências do PDF.
          </p>
        </div>
      </div>
    </div>
  );
};
