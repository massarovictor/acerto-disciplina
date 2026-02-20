import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClasses, useStudents } from '@/hooks/useData';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { FAMILY_FOLLOW_UP_EPISODES } from '@/data/familyFollowUpEpisodes';
import { IncidentFormData } from '../IncidentWizard';
import { useAuth } from '@/contexts/AuthContext';
import { formatBrasiliaDate } from '@/lib/brasiliaDate';
import { getSeverityColor } from '@/lib/incidentUtils';
import { IncidentType } from '@/types';
import { getIncidentSeverityLabel } from '@/lib/incidentType';

interface ReviewStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
  incidentType: IncidentType;
}

export const ReviewStep = ({ formData, incidentType }: ReviewStepProps) => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { user } = useAuth();
  const episodesCatalog =
    incidentType === 'acompanhamento_familiar'
      ? FAMILY_FOLLOW_UP_EPISODES
      : INCIDENT_EPISODES;

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const selectedStudents = students.filter((s) => formData.studentIds?.includes(s.id));
  const selectedEpisodes = formData.episodes || [];
  const listedEpisodes = episodesCatalog.filter((episode) =>
    selectedEpisodes.includes(episode.id),
  );
  const customEpisodes = selectedEpisodes.filter(
    (episode) => !episodesCatalog.some((item) => item.id === episode),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Revisão Final</h2>
        <p className="text-muted-foreground mt-1">
          {incidentType === 'acompanhamento_familiar'
            ? 'Revise as informações antes de registrar o acompanhamento familiar'
            : 'Revise todas as informações antes de registrar a ocorrência'}
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">
                {incidentType === 'acompanhamento_familiar'
                  ? 'Acompanhamento Familiar'
                  : 'Ocorrência Disciplinar'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turma:</span>
              <span className="font-medium">{selectedClass?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {formData.date && formatBrasiliaDate(formData.date, { dateStyle: 'long' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registrado por:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alunos Envolvidos ({selectedStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{student.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBrasiliaDate(student.birthDate)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {incidentType === 'acompanhamento_familiar'
                  ? 'Pontos de Acompanhamento'
                  : 'Episódios Selecionados'}
              </span>
              {formData.calculatedSeverity && (
                <Badge className={getSeverityColor(formData.calculatedSeverity)}>
                  {getIncidentSeverityLabel(
                    formData.calculatedSeverity,
                    incidentType,
                  )}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {listedEpisodes.map((episode) => (
                  <div key={episode.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      {episode.category}
                    </Badge>
                    <span className="text-sm">{episode.description}</span>
                  </div>
                ))}
                {customEpisodes.map((episode) => (
                  <div key={episode} className="flex items-start gap-2 py-2 border-b last:border-0">
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      Customizado
                    </Badge>
                    <span className="text-sm">{episode}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        {formData.finalSeverity && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {incidentType === 'acompanhamento_familiar'
                  ? 'Nível Final de Atenção'
                  : 'Grau Final'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculado:</span>
                <span className="font-medium">
                  {getIncidentSeverityLabel(
                    formData.calculatedSeverity,
                    incidentType,
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final:</span>
                <span className="font-medium">
                  {getIncidentSeverityLabel(formData.finalSeverity, incidentType)}
                </span>
              </div>
              {formData.severityOverrideReason && (
                <div className="pt-2">
                  <div className="text-muted-foreground">Motivo:</div>
                  <div className="whitespace-pre-wrap">{formData.severityOverrideReason}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {formData.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descrição Detalhada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{formData.description}</p>
            </CardContent>
          </Card>
        )}

        {formData.actions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Providências</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{formData.actions}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
