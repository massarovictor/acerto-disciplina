import {
  applyCertificateTemplate,
  type CertificateTemplateData,
} from '@/lib/certificateTemplates';
import { type CertificateType } from '@/lib/certificateTypes';
import { formatBrasiliaDate } from '@/lib/brasiliaDate';

const MAX_VISIBLE_CERTIFICATE_TEXT = 520;

const joinListWithAnd = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
};

type ReferenceKind = 'disciplina' | 'área';

interface ParsedReferenceLabel {
  kind: ReferenceKind;
  value: string;
}

const parseReferenceLabel = (
  referenceLabel?: string,
): ParsedReferenceLabel | undefined => {
  const rawLabel = referenceLabel?.trim();
  if (!rawLabel) return undefined;

  const disciplineMatch = rawLabel.match(/^disciplina\s*:\s*(.+)$/i);
  if (disciplineMatch?.[1]?.trim()) {
    return {
      kind: 'disciplina',
      value: disciplineMatch[1].trim(),
    };
  }

  const areaMatch = rawLabel.match(/^(?:[aá]rea|area)\s*:\s*(.+)$/i);
  if (areaMatch?.[1]?.trim()) {
    return {
      kind: 'área',
      value: areaMatch[1].trim(),
    };
  }

  return {
    kind: 'área',
    value: rawLabel,
  };
};

const buildReferencePlaceholder = (
  certificateType: CertificateType,
  referenceLabel?: string,
): string => {
  const parsed = parseReferenceLabel(referenceLabel);
  if (!parsed) return '';

  if (certificateType === 'monitoria' || certificateType === 'destaque') {
    return `, na ${parsed.kind} de ${parsed.value}`;
  }

  return `, com referência na ${parsed.kind} de ${parsed.value}`;
};

const buildEventRolePlaceholder = (
  certificateType: CertificateType,
  role?: string,
): string => {
  const cleanedRole = role?.trim();
  if (!cleanedRole) return '';
  const normalizedRole = cleanedRole.replace(/\s{2,}/g, ' ');
  const roleLower = normalizedRole.toLowerCase();
  const alreadyContextualized = /^(como|na condição de|atuando como)\b/i.test(
    normalizedRole,
  );

  if (certificateType === 'evento_participacao') {
    if (roleLower === 'participante') return '';
    if (alreadyContextualized) return `, ${normalizedRole}`;
    return `, na condição de ${normalizedRole}`;
  }

  if (
    roleLower === 'comissão organizadora' ||
    roleLower === 'membro da comissão organizadora'
  ) {
    return '';
  }

  if (alreadyContextualized) return `, ${normalizedRole}`;
  return `, como ${normalizedRole}`;
};

const buildDestaquePeriodPhrase = (periodLabel: string): string => {
  const normalized = periodLabel
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/bimestre/gi, 'bimestre');
  if (!normalized) return 'no período letivo';

  const year = normalized.match(/\b(20\d{2})\b/)?.[1];
  const hasAnnualRange = /1º\s*(?:ao|a)\s*4º\s*bimestre/i.test(normalized);
  const hasAnnualKeyword = /\banual\b/i.test(normalized);

  if (hasAnnualRange || hasAnnualKeyword) {
    return year ? `durante o ano letivo de ${year}` : 'durante o ano letivo';
  }

  const quarterNumbers = Array.from(normalized.matchAll(/(\d)º\s*bimestre/gi)).map(
    (match) => `${match[1]}º`,
  );
  const uniqueQuarterNumbers = Array.from(new Set(quarterNumbers));

  if (uniqueQuarterNumbers.length === 4) {
    return year ? `durante o ano letivo de ${year}` : 'durante o ano letivo';
  }

  if (uniqueQuarterNumbers.length > 1) {
    const joined = joinListWithAnd(uniqueQuarterNumbers);
    return year ? `nos bimestres ${joined} de ${year}` : `nos bimestres ${joined}`;
  }

  if (uniqueQuarterNumbers.length === 1) {
    return year
      ? `no ${uniqueQuarterNumbers[0]} bimestre de ${year}`
      : `no ${uniqueQuarterNumbers[0]} bimestre`;
  }

  if (/^(no|nos|durante)\s+/i.test(normalized)) {
    return normalized;
  }

  return `no período de ${normalized}`;
};

export interface CertificateLanguageMonitoriaMeta {
  workloadHours: number;
  monitoriaPeriod: string;
  activity: string;
}

export interface CertificateLanguageEventMeta {
  eventName: string;
  eventDate: string;
  eventDateStart?: string;
  eventDateEnd?: string;
  workloadHours: number;
  role: string;
}

const resolveEventDateLabel = (eventMeta?: CertificateLanguageEventMeta): string => {
  if (!eventMeta) return '-';

  if (eventMeta.eventDateStart && eventMeta.eventDateEnd) {
    return `${formatBrasiliaDate(eventMeta.eventDateStart)} a ${formatBrasiliaDate(eventMeta.eventDateEnd)}`;
  }

  return formatBrasiliaDate(eventMeta.eventDate);
};

const buildTemplateDataPayload = (params: {
  certificateType: CertificateType;
  schoolName: string;
  className: string;
  schoolYear: 1 | 2 | 3;
  periodLabel: string;
  referenceLabel?: string;
  monitoriaMeta?: CertificateLanguageMonitoriaMeta;
  eventMeta?: CertificateLanguageEventMeta;
  studentName: string;
}): CertificateTemplateData => ({
  aluno: params.studentName,
  escola: params.schoolName,
  turma: params.className,
  anoTurma: `${params.schoolYear}º ano`,
  periodo:
    params.certificateType === 'destaque'
      ? buildDestaquePeriodPhrase(params.periodLabel)
      : params.periodLabel,
  referencia: buildReferencePlaceholder(params.certificateType, params.referenceLabel),
  cargaHoraria: params.monitoriaMeta
    ? String(params.monitoriaMeta.workloadHours)
    : params.eventMeta
      ? String(params.eventMeta.workloadHours)
      : '',
  atividade: (params.monitoriaMeta?.activity || '').toLocaleLowerCase('pt-BR'),
  periodoMonitoria: params.monitoriaMeta?.monitoriaPeriod || '',
  eventoNome: params.eventMeta?.eventName || '',
  eventoData: resolveEventDateLabel(params.eventMeta),
  eventoPapel: buildEventRolePlaceholder(params.certificateType, params.eventMeta?.role),
});

const normalizeCertificateText = (
  rawText: string,
  certificateType: CertificateType,
  schoolName: string,
): string => {
  let normalized = rawText
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ', ')
    .replace(/\.\s*\./g, '.')
    .replace(/\.\s*,/g, '. ')
    .replace(/,\s*\./g, '.')
    .trim();

  normalized = normalized.replace(
    /^Certificamos que\s+/i,
    `A ${schoolName} certifica que o(a) aluno(a) `,
  );
  normalized = normalized.replace(
    new RegExp(
      `^A\\s+${schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,\\s*certifica`,
      'i',
    ),
    `A ${schoolName} certifica`,
  );
  normalized = normalized.replace(/no período\s+(\d{4})(?!\d)/gi, 'no período de $1');

  if (certificateType === 'destaque') {
    normalized = normalized.replace(
      /pelo excelente desempenho\s+(?:no período de|em)\s+(.+?)(?=,\s*demonstrando\b)/i,
      (_fullMatch, rawPeriod: string) =>
        `pelo excelente desempenho ${buildDestaquePeriodPhrase(rawPeriod)}`,
    );
  }

  if (certificateType === 'monitoria') {
    normalized = normalized
      .replace(/exerceu atividades de monitoria/gi, 'atuou na monitoria')
      .replace(/monitoria\s+acad[eê]mica/gi, 'monitoria')
      .replace(/na disciplina:\s*/gi, 'em ')
      .replace(/na monitoria de de /gi, 'na monitoria de ')
      .replace(/na fun[cç][aã]o de monitor(?:ia)?/gi, 'na monitoria')
      .replace(/monitoriaem/gi, 'monitoria em')
      .replace(/atuou na monitoria\b/gi, 'atuou como monitor(a)')
      .replace(
        /atuou como monitor\(a\)\s+na\s+(área|area|disciplina)\s+de/gi,
        'atuou como monitor(a), na $1 de',
      )
      .replace(
        /atuou como monitor\(a\)\.\s*na\s+(área|area|disciplina)\s+de/gi,
        'atuou como monitor(a), na $1 de',
      )
      .replace(
        /no período relativo a\s+(\d+º)\s+bimestre\s+de\s+(20\d{2})/gi,
        'no período relativo ao $1 bimestre de $2',
      )
      .replace(
        /no período relativo a\s+((?:\d+º\s+bimestre(?:\s*,\s*|\s+e\s+)*)+)\s+de\s+(20\d{2})/gi,
        (_fullMatch, rawList: string, year: string) => {
          const quarterNumbers = Array.from(
            rawList.matchAll(/(\d+)º\s*bimestre/gi),
          ).map((match) => `${match[1]}º`);

          if (quarterNumbers.length > 1) {
            return `no período relativo aos ${joinListWithAnd(quarterNumbers)} bimestres de ${year}`;
          }

          if (quarterNumbers.length === 1) {
            return `no período relativo ao ${quarterNumbers[0]} bimestre de ${year}`;
          }

          return `no período relativo a ${rawList} de ${year}`;
        },
      )
      .replace(/,\s*Realizando\b/g, ', realizando')
      .replace(/\s+Realizando\b/g, ', realizando');
  }

  if (certificateType === 'evento_participacao') {
    normalized = normalized.replace(
      /na condição de participante/gi,
      'como participante',
    );
  }

  if (
    certificateType === 'evento_participacao' ||
    certificateType === 'evento_organizacao'
  ) {
    normalized = normalized.replace(/,\s*com vínculo em\s+/gi, ', com referência em ');
    normalized = normalized.replace(
      /(evento\s+"[^"]+")((?:[^.]|\n)*?),\s*realizado em\s+([^,]+),\s*com carga horária de\s+([^,]+)\s+horas,\s*com referência na\s+(área|disciplina)\s+de\s+([^.]+)\./gi,
      '$1, com referência na $5 de $6, realizado em $3, com carga horária de $4 horas.',
    );
  }

  return normalized;
};

const clampCertificateText = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_VISIBLE_CERTIFICATE_TEXT) return trimmed;
  return `${trimmed.slice(0, MAX_VISIBLE_CERTIFICATE_TEXT - 1).trimEnd()}…`;
};

export interface CertificateTextPreviewInput {
  certificateType: CertificateType;
  schoolName: string;
  className: string;
  schoolYear: 1 | 2 | 3;
  periodLabel: string;
  referenceLabel?: string;
  baseText: string;
  studentName: string;
  monitoriaMeta?: CertificateLanguageMonitoriaMeta;
  eventMeta?: CertificateLanguageEventMeta;
}

export const buildCertificateTextPreview = (
  input: CertificateTextPreviewInput,
): string => {
  const templateData = buildTemplateDataPayload({
    certificateType: input.certificateType,
    schoolName: input.schoolName,
    className: input.className,
    schoolYear: input.schoolYear,
    periodLabel: input.periodLabel,
    referenceLabel: input.referenceLabel,
    monitoriaMeta: input.monitoriaMeta,
    eventMeta: input.eventMeta,
    studentName: input.studentName,
  });

  const renderedText = applyCertificateTemplate(input.baseText.trim(), templateData);
  const normalizedText = normalizeCertificateText(
    renderedText,
    input.certificateType,
    input.schoolName,
  );

  return clampCertificateText(normalizedText);
};
