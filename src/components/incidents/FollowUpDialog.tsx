import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Incident, FollowUpType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIncidents, useStudents } from '@/hooks/useData';
import { calculateSuggestedAction, suggestFollowUpType } from '@/lib/incidentActions';

interface FollowUpDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFollowUp: (incidentId: string, followUp: any) => void;
}

export const FollowUpDialog = ({ incident, open, onOpenChange, onAddFollowUp }: FollowUpDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { incidents } = useIncidents();
  const { students } = useStudents();
  const [type, setType] = useState<FollowUpType>('conversa_individual');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsavel, setResponsavel] = useState('');
  
  // Conversa Individual/Pais fields
  const [motivo, setMotivo] = useState('');
  const [assuntosTratados, setAssuntosTratados] = useState('');
  const [encaminhamentos, setEncaminhamentos] = useState('');
  const [providencias, setProvidencias] = useState('');
  
  // Situações Diversas fields
  const [disciplina, setDisciplina] = useState('');
  const [tipoSituacao, setTipoSituacao] = useState('');
  const [descricaoSituacao, setDescricaoSituacao] = useState('');

  // Auto-preencher tipo e providências ao abrir (SEMPRE recalcula)
  useEffect(() => {
    if (open) {
      // Calcular automaticamente com base na gravidade e histórico REAL
      const suggested = calculateSuggestedAction(
        incident.studentIds,
        incident.finalSeverity,
        incidents,
        students
      );
      const autoType = suggestFollowUpType(suggested, incident.finalSeverity);
      
      // Preenche automaticamente
      setType(autoType);
      setProvidencias(suggested);
      
      // Define motivo padrão baseado na gravidade
      if (incident.finalSeverity === 'grave' || incident.finalSeverity === 'gravissima') {
        setMotivo('1 - Comportamento inadequado');
      } else if (incident.finalSeverity === 'intermediaria') {
        setMotivo('2 - Conflitos/Relação interpessoal');
      }

      // Reset dos outros campos (mantém os auto-preenchidos)
      setDate(new Date().toISOString().split('T')[0]);
      setResponsavel('');
      setAssuntosTratados('');
      setEncaminhamentos('');
      setDisciplina('');
      setTipoSituacao('');
      setDescricaoSituacao('');
    }
  }, [open, incidents, students, incident.studentIds, incident.finalSeverity]);

  const motivoOptions = [
    '1 - Comportamento inadequado',
    '2 - Conflitos/Relação interpessoal',
    '3 - Atrasos ou faltas não justificados',
    '4 - Apoio pedagógico',
    '5 - Infrequência/Risco de abandono',
    '6 - Rendimento (Intervenções por baixo rendimento/Elogios/Reconhecimento)',
    '7 - Problemas de saúde',
    '8 - Questões socioemocionais',
    '9 - Desengajamento com atividades',
    '10 - Desinteresse/Desmotivação',
    '11 - Outros...',
  ];

  const tipoSituacaoOptions = [
    '1 - Indisciplina',
    '2 - Infrequência',
    '3 - Faltas por transporte',
    '4 - Atrasos',
    '5 - Problemas de saúde',
    '6 - Saídas da escola/sala',
    '7 - Desrespeito às normas da escola',
    '8 - Realização/não-entrega de atividades',
  ];

  const handleSubmit = () => {
    if (!user) return;

    const followUp: any = {
      type,
      date,
      responsavel,
      createdBy: user.id,
    };

    if (type === 'conversa_individual' || type === 'conversa_pais') {
      followUp.motivo = motivo;
      followUp.providencias = providencias;
      followUp.assuntosTratados = assuntosTratados;
      followUp.encaminhamentos = encaminhamentos;
    }

    if (type === 'situacoes_diversas') {
      followUp.disciplina = disciplina;
      followUp.tipoSituacao = tipoSituacao;
      followUp.descricaoSituacao = descricaoSituacao;
    }

    onAddFollowUp(incident.id, followUp);
    
    toast({
      title: 'Acompanhamento registrado',
      description: 'O registro foi salvo com sucesso',
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setType('conversa_individual');
    setDate(new Date().toISOString().split('T')[0]);
    setResponsavel('');
    setMotivo('');
    setProvidencias('');
    setAssuntosTratados('');
    setEncaminhamentos('');
    setDisciplina('');
    setTipoSituacao('');
    setDescricaoSituacao('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Registrar Acompanhamento</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Acompanhamento</Label>
            <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversa_individual">Conversa Individual com Estudante</SelectItem>
                <SelectItem value="conversa_pais">Conversa com Pais/Responsáveis</SelectItem>
                <SelectItem value="situacoes_diversas">Registro de Situações Diversas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável pelo Registro</Label>
              <Input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
          </div>

          {(type === 'conversa_individual' || type === 'conversa_pais') && (
            <>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivoOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Providências Tomadas / Sugeridas</Label>
                <div className="mb-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="text-xs font-medium text-primary mb-1">✓ Sugestão Automática (baseada na gravidade e histórico):</p>
                  <p className="text-sm font-medium">{providencias}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  A providência acima foi calculada automaticamente. Você pode editá-la se necessário.
                </p>
                <Textarea
                  value={providencias}
                  onChange={(e) => setProvidencias(e.target.value)}
                  placeholder="Edite as providências se necessário..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição dos Assuntos Tratados</Label>
                <Textarea
                  value={assuntosTratados}
                  onChange={(e) => setAssuntosTratados(e.target.value)}
                  placeholder="Descreva os assuntos tratados durante a conversa..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Encaminhamentos / Combinados</Label>
                <Textarea
                  value={encaminhamentos}
                  onChange={(e) => setEncaminhamentos(e.target.value)}
                  placeholder="Descreva os encaminhamentos e combinados..."
                  rows={4}
                />
              </div>
            </>
          )}

          {type === 'situacoes_diversas' && (
            <>
              <div className="space-y-2">
                <Label>Disciplina/Professor</Label>
                <Input
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Ex: Matemática - Prof. João"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Situação</Label>
                <Select value={tipoSituacao} onValueChange={setTipoSituacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoSituacaoOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição da Situação</Label>
                <Textarea
                  value={descricaoSituacao}
                  onChange={(e) => setDescricaoSituacao(e.target.value)}
                  placeholder="Descreva detalhadamente a situação..."
                  rows={4}
                />
              </div>
            </>
          )}

          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Registrar Acompanhamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
