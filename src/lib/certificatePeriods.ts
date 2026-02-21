import { QUARTERS } from '@/lib/subjects';

export type CertificatePeriodMode = 'quarters' | 'annual';

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
): string => {
  const currentYear = new Date().getFullYear();

  if (periodMode === 'annual') {
    return `Anual (1º ao 4º bimestre) — ${currentYear}`;
  }

  const resolved = resolveCertificateQuarters(periodMode, selectedQuarters);
  if (resolved.length === 0) return 'Bimestres não selecionados';
  return `${resolved.join(', ')} — ${currentYear}`;
};
