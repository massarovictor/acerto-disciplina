import { QUARTERS } from '@/lib/subjects';

export type CertificatePeriodMode = 'quarters' | 'annual';

const toLowerQuarterLabel = (quarter: string): string =>
  quarter.replace(/bimestre/gi, 'bimestre');

const joinWithAnd = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
};

export const resolveCertificateQuarters = (
  periodMode: CertificatePeriodMode,
  selectedQuarters: string[],
): string[] => {
  if (periodMode === 'annual') {
    return [...QUARTERS];
  }

  const unique = Array.from(new Set(selectedQuarters));
  return unique.filter((quarter) => QUARTERS.includes(quarter));
};

export const formatCertificatePeriodLabel = (
  periodMode: CertificatePeriodMode,
  selectedQuarters: string[],
  referenceYear?: number,
): string => {
  const currentYear = new Date().getFullYear();
  const resolvedYear =
    typeof referenceYear === 'number' && Number.isFinite(referenceYear)
      ? Math.trunc(referenceYear)
      : currentYear;

  if (periodMode === 'annual') {
    return `1º ao 4º bimestre de ${resolvedYear}`;
  }

  const resolved = resolveCertificateQuarters(periodMode, selectedQuarters);
  if (resolved.length === 0) return 'bimestres não selecionados';
  const normalized = resolved.map(toLowerQuarterLabel);
  return `${joinWithAnd(normalized)} de ${resolvedYear}`;
};
