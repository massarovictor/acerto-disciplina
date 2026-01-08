import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { IncidentFormData } from '../IncidentWizard';
import { IncidentSeverity } from '@/types';
import { AlertCircle, Plus, X } from 'lucide-react';

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
  const [customEpisode, setCustomEpisode] = useState('');

  // Separar episódios da lista e customizados
  const listedEpisodes = selectedEpisodes.filter(ep => 
    INCIDENT_EPISODES.some(e => e.id === ep)
  );
  const customEpisodes = selectedEpisodes.filter(ep => 
    !INCIDENT_EPISODES.some(e => e.id === ep)
  );

  const toggleEpisode = (episodeId: string) => {
    const newEpisodes = selectedEpisodes.includes(episodeId)
      ? selectedEpisodes.filter((id) => id !== episodeId)
      : [...selectedEpisodes, episodeId];
    
    const nextCalculated = calculateSeverity(newEpisodes);
    const shouldSyncFinal =
      !formData.finalSeverity || formData.finalSeverity === formData.calculatedSeverity;

    updateFormData({
      episodes: newEpisodes,
      calculatedSeverity: nextCalculated,
      finalSeverity: shouldSyncFinal ? nextCalculated : formData.finalSeverity,
      severityOverrideReason: shouldSyncFinal ? undefined : formData.severityOverrideReason,
    });
  };

  const addCustomEpisode = () => {
    if (!customEpisode.trim()) return;
    
    const newEpisodes = [...selectedEpisodes, customEpisode.trim()];
    const nextCalculated = calculateSeverity(newEpisodes);
    const shouldSyncFinal =
      !formData.finalSeverity || formData.finalSeverity === formData.calculatedSeverity;

    updateFormData({
      episodes: newEpisodes,
      calculatedSeverity: nextCalculated,
      finalSeverity: shouldSyncFinal ? nextCalculated : formData.finalSeverity,
      severityOverrideReason: shouldSyncFinal ? undefined : formData.severityOverrideReason,
    });
    
    setCustomEpisode('');
  };

  const removeCustomEpisode = (episodeText: string) => {
    const newEpisodes = selectedEpisodes.filter(ep => ep !== episodeText);
    const nextCalculated = calculateSeverity(newEpisodes);
    const shouldSyncFinal =
      !formData.finalSeverity || formData.finalSeverity === formData.calculatedSeverity;

    updateFormData({
      episodes: newEpisodes,
      calculatedSeverity: nextCalculated,
      finalSeverity: shouldSyncFinal ? nextCalculated : formData.finalSeverity,
      severityOverrideReason: shouldSyncFinal ? undefined : formData.severityOverrideReason,
    });
  };

  const calculateSeverity = (episodeIds: string[]): IncidentSeverity => {
    const episodes = INCIDENT_EPISODES.filter((e) => episodeIds.includes(e.id));
    
    // Episódios customizados não afetam o cálculo automático de gravidade
    // O usuário deve ajustar manualmente se necessário
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

  const calculatedSeverity = formData.calculatedSeverity || 'leve';
  const finalSeverity = formData.finalSeverity || calculatedSeverity;
  const hasOverride = finalSeverity !== calculatedSeverity;

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

      {/* Episódios Customizados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Episódio Não Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Se o episódio não estiver na lista acima, você pode adicionar um episódio customizado.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Descreva o episódio..."
              value={customEpisode}
              onChange={(e) => setCustomEpisode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addCustomEpisode();
                }
              }}
            />
            <Button
              type="button"
              onClick={addCustomEpisode}
              disabled={!customEpisode.trim()}
              size="default"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          
          {customEpisodes.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label className="text-sm">Episódios Customizados Adicionados:</Label>
              <div className="space-y-2">
                {customEpisodes.map((episode, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-lg bg-accent/30"
                  >
                    <span className="text-sm">{episode}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomEpisode(episode)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grau Final</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="finalSeverity">Grau final da ocorrência</Label>
            <Select
              value={finalSeverity}
              onValueChange={(value) => {
                const selected = value as IncidentSeverity;
                updateFormData({
                  finalSeverity: selected,
                  severityOverrideReason:
                    selected === calculatedSeverity ? undefined : formData.severityOverrideReason,
                });
              }}
            >
              <SelectTrigger id="finalSeverity">
                <SelectValue placeholder="Selecione o grau final" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="intermediaria">Intermediária</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
                <SelectItem value="gravissima">Gravíssima</SelectItem>
              </SelectContent>
            </Select>
            {hasOverride && (
              <p className="text-xs text-muted-foreground">
                O grau final esta diferente do calculado automaticamente.
              </p>
            )}
          </div>

          {hasOverride && (
            <div className="space-y-2">
              <Label htmlFor="severityOverrideReason">Motivo da alteracao *</Label>
              <Textarea
                id="severityOverrideReason"
                placeholder="Explique por que o grau final foi alterado..."
                value={formData.severityOverrideReason || ''}
                onChange={(e) => updateFormData({ severityOverrideReason: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
