import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FollowUpType, IncidentType } from '@/types';

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
  nomeResponsavelPai: string;
  setNomeResponsavelPai: (nome: string) => void;
  grauParentesco: string;
  setGrauParentesco: (grau: string) => void;
  incidentType?: IncidentType;
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
  nomeResponsavelPai,
  setNomeResponsavelPai,
  grauParentesco,
  setGrauParentesco,
  incidentType = 'disciplinar',
}: FollowUpFormProps) => {
  const isFamilyFlow = incidentType === 'acompanhamento_familiar';
  const motivoOptions = isFamilyFlow
    ? [
        '1 - Apoio pedagógico com a família',
        '2 - Apoio socioemocional ao estudante',
        '3 - Rotina de estudos e organização',
        '4 - Frequência e permanência escolar',
        '5 - Engajamento e vínculo com a escola',
        '6 - Articulação com rede de apoio',
        '7 - Saúde e bem-estar',
        '8 - Ajustes no plano de acompanhamento',
        '9 - Devolutiva de evolução',
        '10 - Outros contextos familiares',
      ]
    : [
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

  const tipoSituacaoOptions = isFamilyFlow
    ? [
        '1 - Queda de rendimento',
        '2 - Dificuldade de aprendizagem',
        '3 - Desorganização de rotina de estudos',
        '4 - Baixa participação em aula',
        '5 - Questões socioemocionais',
        '6 - Infrequência',
        '7 - Vulnerabilidade familiar',
        '8 - Encaminhamento para rede de apoio',
      ]
    : [
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
            <SelectItem value="conversa_individual">
              {isFamilyFlow
                ? 'Atendimento Individual com Estudante'
                : 'Conversa Individual com Estudante'}
            </SelectItem>
            <SelectItem value="conversa_pais">
              {isFamilyFlow
                ? 'Atendimento com Família/Responsáveis'
                : 'Conversa com Pais/Responsáveis'}
            </SelectItem>
            <SelectItem value="situacoes_diversas">
              {isFamilyFlow
                ? 'Registro Pedagógico/Emocional'
                : 'Registro de Situações Diversas'}
            </SelectItem>
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
          {type === 'conversa_pais' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Responsável</Label>
                <Input
                  value={nomeResponsavelPai}
                  onChange={(e) => setNomeResponsavelPai(e.target.value)}
                  placeholder="Nome completo do responsável"
                />
              </div>
              <div className="space-y-2">
                <Label>Grau de Parentesco</Label>
                <Select value={grauParentesco} onValueChange={setGrauParentesco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pai">Pai</SelectItem>
                    <SelectItem value="Mãe">Mãe</SelectItem>
                    <SelectItem value="Avô/Avó">Avô/Avó</SelectItem>
                    <SelectItem value="Tio/Tia">Tio/Tia</SelectItem>
                    <SelectItem value="Irmão/Irmã">Irmão/Irmã</SelectItem>
                    <SelectItem value="Tutor Legal">Tutor Legal</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
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
              <p className="text-xs font-medium text-primary mb-1">
                ✓ Sugestão Automática
                {isFamilyFlow
                  ? ' (baseada no nível de atenção e no contexto do acompanhamento):'
                  : ' (baseada na gravidade e histórico):'}
              </p>
              <p className="text-sm font-medium">{providencias}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {isFamilyFlow
                ? 'A recomendação acima considera o contexto pedagógico e emocional e pode ser ajustada.'
                : 'A providência acima foi calculada automaticamente. Você pode editá-la se necessário.'}
            </p>
            <Textarea
              value={providencias}
              onChange={(e) => setProvidencias(e.target.value)}
              placeholder={
                isFamilyFlow
                  ? 'Edite o plano de apoio, os combinados e os encaminhamentos...'
                  : 'Edite as providências se necessário...'
              }
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
            <Label>
              {isFamilyFlow ? 'Área/Profissional de Referência' : 'Disciplina/Professor'}
            </Label>
            <Input
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              placeholder={
                isFamilyFlow
                  ? 'Ex: Matemática - Coordenação Pedagógica'
                  : 'Ex: Matemática - Prof. João'
              }
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
