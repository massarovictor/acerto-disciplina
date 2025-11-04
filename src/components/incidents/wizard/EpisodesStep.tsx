import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { IncidentFormData } from '../IncidentWizard';
import { IncidentSeverity } from '@/types';
import { AlertCircle } from 'lucide-react';

interface EpisodesStepProps {
  formData: Partial<IncidentFormData>;
  updateFormData: (data: Partial<IncidentFormData>) => void;
}

const severityConfig = {
  leve: { label: 'Leve', color: 'bg-severity-light-bg text-severity-light border-severity-light' },
  intermediaria: { label: 'Intermediária', color: 'bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate' },
  grave: { label: 'Grave', color: 'bg-severity-serious-bg text-severity-serious border-severity-serious' },
  gravissima: { label: 'Gravíssima', color: 'bg-severity-critical-bg text-severity-critical border-severity-critical' },
};

export const EpisodesStep = ({ formData, updateFormData }: EpisodesStepProps) => {
  const selectedEpisodes = formData.episodes || [];

  const toggleEpisode = (episodeId: string) => {
    const newEpisodes = selectedEpisodes.includes(episodeId)
      ? selectedEpisodes.filter((id) => id !== episodeId)
      : [...selectedEpisodes, episodeId];
    
    updateFormData({ 
      episodes: newEpisodes,
      calculatedSeverity: calculateSeverity(newEpisodes),
    });
  };

  const calculateSeverity = (episodeIds: string[]): IncidentSeverity => {
    const episodes = INCIDENT_EPISODES.filter((e) => episodeIds.includes(e.id));
    
    if (episodes.some((e) => e.severity === 'gravissima')) return 'gravissima';
    if (episodes.some((e) => e.severity === 'grave')) return 'grave';
    if (episodes.some((e) => e.severity === 'intermediaria')) return 'intermediaria';
    return 'leve';
  };

  const groupedEpisodes = INCIDENT_EPISODES.reduce((acc, episode) => {
    if (!acc[episode.severity]) {
      acc[episode.severity] = [];
    }
    acc[episode.severity].push(episode);
    return acc;
  }, {} as Record<string, typeof INCIDENT_EPISODES>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Episódios</h2>
        <p className="text-muted-foreground mt-1">
          Selecione os episódios que melhor descrevem a ocorrência
        </p>
      </div>

      {formData.calculatedSeverity && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Grau Calculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Baseado nos episódios selecionados:</span>
              <Badge className={severityConfig[formData.calculatedSeverity].color}>
                {severityConfig[formData.calculatedSeverity].label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedEpisodes.length} episódio(s) selecionado(s)
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(Object.keys(groupedEpisodes) as IncidentSeverity[]).map((severity) => (
          <Card key={severity}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline" className={severityConfig[severity].color}>
                  {severityConfig[severity].label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedEpisodes[severity].map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={episode.id}
                    checked={selectedEpisodes.includes(episode.id)}
                    onCheckedChange={() => toggleEpisode(episode.id)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={episode.id}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="font-medium text-sm">{episode.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {episode.category}
                    </div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
