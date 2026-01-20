import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClasses, useStudents } from '@/hooks/useData';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { IncidentFormData } from '../IncidentWizard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
}

const severityConfig = {
  leve: { label: 'Leve', color: 'bg-severity-light-bg text-severity-light border-severity-light' },
  intermediaria: { label: 'Intermediária', color: 'bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate' },
  grave: { label: 'Grave', color: 'bg-severity-serious-bg text-severity-serious border-severity-serious' },
  gravissima: { label: 'Gravíssima', color: 'bg-severity-critical-bg text-severity-critical border-severity-critical' },
};

export const ReviewStep = ({ formData }: ReviewStepProps) => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { user, profile } = useAuth();

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const selectedStudents = students.filter((s) => formData.studentIds?.includes(s.id));
  const selectedEpisodes = INCIDENT_EPISODES.filter((e) => formData.episodes?.includes(e.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Revisão Final</h2>
        <p className="text-muted-foreground mt-1">
          Revise todas as informações antes de registrar a ocorrência
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turma:</span>
              <span className="font-medium">{selectedClass?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {formData.date && format(new Date(formData.date), 'PPP', { locale: ptBR })}
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
                    {new Date(student.birthDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Episódios Selecionados</span>
              {formData.calculatedSeverity && (
                <Badge className={severityConfig[formData.calculatedSeverity].color}>
                  {severityConfig[formData.calculatedSeverity].label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedEpisodes.map((episode) => (
                <div key={episode.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                  <Badge variant="outline" className="shrink-0 mt-0.5">
                    {episode.category}
                  </Badge>
                  <span className="text-sm">{episode.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {formData.finalSeverity && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grau Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculado:</span>
                <span className="font-medium">
                  {formData.calculatedSeverity
                    ? severityConfig[formData.calculatedSeverity].label
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final:</span>
                <span className="font-medium">
                  {severityConfig[formData.finalSeverity].label}
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
