import { CertificateType } from '@/lib/certificateTypes';

export interface CertificateTemplateData {
  aluno: string;
  escola: string;
  turma: string;
  anoTurma: string;
  periodo: string;
  referencia?: string;
  cargaHoraria?: string;
  atividade?: string;
  periodoMonitoria?: string;
  eventoNome?: string;
  eventoData?: string;
  eventoLocal?: string;
  eventoPapel?: string;
}

const CERTIFICATE_TEMPLATES: Record<CertificateType, string> = {
  monitoria:
    'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, atuou como monitor(a){{referencia}}, realizando {{atividade}} {{periodoMonitoria}}, totalizando {{cargaHoraria}} horas.',
  destaque:
    'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, foi reconhecido(a) pelo excelente desempenho {{periodo}}{{referencia}}, demonstrando compromisso exemplar com os estudos.',
  evento_participacao:
    'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, participou do evento "{{eventoNome}}"{{eventoPapel}}{{referencia}}, realizado em {{eventoData}}, com carga horária de {{cargaHoraria}} horas.',
  evento_organizacao:
    'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, atuou na organização do evento "{{eventoNome}}"{{eventoPapel}}{{referencia}}, realizado em {{eventoData}}, com carga horária de {{cargaHoraria}} horas.',
};

export const getCertificateTemplate = (certificateType: CertificateType): string =>
  CERTIFICATE_TEMPLATES[certificateType];

const normalizeTemplateValue = (value?: string | null): string => {
  const text = (value || '').trim();
  return text;
};

const normalizeTemplateFragment = (value?: string | null): string =>
  (value || '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+$/g, '');

export const applyCertificateTemplate = (
  template: string,
  data: CertificateTemplateData,
): string => {
  const payload: Record<string, string> = {
    aluno: normalizeTemplateValue(data.aluno),
    escola: normalizeTemplateValue(data.escola),
    turma: normalizeTemplateValue(data.turma),
    anoTurma: normalizeTemplateValue(data.anoTurma),
    periodo: normalizeTemplateValue(data.periodo),
    referencia: normalizeTemplateFragment(data.referencia),
    cargaHoraria: normalizeTemplateValue(data.cargaHoraria),
    atividade: normalizeTemplateValue(data.atividade),
    periodoMonitoria: normalizeTemplateValue(data.periodoMonitoria),
    eventoNome: normalizeTemplateValue(data.eventoNome),
    eventoData: normalizeTemplateValue(data.eventoData),
    eventoLocal: normalizeTemplateValue(data.eventoLocal),
    eventoPapel: normalizeTemplateFragment(data.eventoPapel),
  };

  let resolved = template;
  Object.entries(payload).forEach(([key, value]) => {
    resolved = resolved.split(`{{${key}}}`).join(value);
  });

  // Limpa espaços extras originados por campos opcionais vazios.
  resolved = resolved.replace(/\s{2,}/g, ' ').trim();
  resolved = resolved.replace(/\s+,/g, ',').replace(/\s+\./g, '.');
  resolved = resolved.replace(/,\s*,/g, ', ');
  resolved = resolved.replace(/\.\s*\./g, '.');
  resolved = resolved.replace(/\s*;\s*/g, '; ');

  return resolved;
};
