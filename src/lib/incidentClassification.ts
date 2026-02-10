import { Incident } from '@/types';

const normalize = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Identifica ocorrências de convocação pedagógica por rendimento.
 * Esse tipo de ocorrência deve gerar comparecimento de responsáveis
 * para alinhamento pedagógico, sem sanção de suspensão.
 */
export const isPerformanceConvocationIncident = (
  incident?: Pick<Incident, 'description' | 'suggestedAction'> | null,
): boolean => {
  const text = `${normalize(incident?.description)} ${normalize(incident?.suggestedAction)}`;

  const isParentConvocation = text.includes('convocacao de pais');
  const isAcademicLowPerformance =
    text.includes('baixo rendimento') ||
    text.includes('3 ou mais disciplinas') ||
    text.includes('disciplinas abaixo da media');

  return isParentConvocation && isAcademicLowPerformance;
};

