import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FollowUpType } from '@/types';

interface FollowUpFormProps {
  type: FollowUpType;
  setType: (type: FollowUpType) => void;
  date: string;
  setDate: (date: string) => void;
  responsavel: string;
  setResponsavel: (responsavel: string) => void;
  motivo: string;
  setMotivo: (motivo: string) => void;
  assuntosTratados: string;
  setAssuntosTratados: (assuntos: string) => void;
  encaminhamentos: string;
  setEncaminhamentos: (encaminhamentos: string) => void;
  providencias: string;
  setProvidencias: (providencias: string) => void;
  disciplina: string;
  setDisciplina: (disciplina: string) => void;
  tipoSituacao: string;
  setTipoSituacao: (tipo: string) => void;
  descricaoSituacao: string;
  setDescricaoSituacao: (descricao: string) => void;
}

export const FollowUpForm = ({
  type,
  setType,
  date,
  setDate,
  responsavel,
  setResponsavel,
  motivo,
  setMotivo,
  assuntosTratados,
  setAssuntosTratados,
  encaminhamentos,
  setEncaminhamentos,
  providencias,
  setProvidencias,
  disciplina,
  setDisciplina,
  tipoSituacao,
  setTipoSituacao,
  descricaoSituacao,
  setDescricaoSituacao,
}: FollowUpFormProps) => {
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

  return (
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
  );
};
