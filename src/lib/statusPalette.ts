import { StudentClassification } from '@/lib/advancedAnalytics';
import { IncidentSeverity } from '@/types';

export const UNIFIED_STATUS_TONES = {
  blue: '#2563EB',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#DC2626',
} as const;

export const CLASSIFICATION_COLOR_HEX: Record<StudentClassification, string> = {
  excelencia: UNIFIED_STATUS_TONES.blue,
  aprovado: UNIFIED_STATUS_TONES.green,
  atencao: UNIFIED_STATUS_TONES.yellow,
  critico: UNIFIED_STATUS_TONES.red,
};

export const INCIDENT_SEVERITY_COLOR_HEX: Record<IncidentSeverity, string> = {
  leve: UNIFIED_STATUS_TONES.blue,
  intermediaria: UNIFIED_STATUS_TONES.green,
  grave: UNIFIED_STATUS_TONES.yellow,
  gravissima: UNIFIED_STATUS_TONES.red,
};

export const INCIDENT_SEVERITY_DOT_CLASS: Record<IncidentSeverity, string> = {
  leve: 'bg-[#2563EB]',
  intermediaria: 'bg-[#10B981]',
  grave: 'bg-[#F59E0B]',
  gravissima: 'bg-[#DC2626]',
};

export const INCIDENT_SEVERITY_BADGE_CLASS: Record<IncidentSeverity, string> = {
  leve:
    'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/35 dark:bg-[#2563EB]/20 dark:text-[#2563EB] dark:border-[#2563EB]/45',
  intermediaria:
    'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/35 dark:bg-[#10B981]/20 dark:text-[#10B981] dark:border-[#10B981]/45',
  grave:
    'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35 dark:bg-[#F59E0B]/20 dark:text-[#F59E0B] dark:border-[#F59E0B]/45',
  gravissima:
    'bg-[#DC2626]/15 text-[#DC2626] border-[#DC2626]/35 dark:bg-[#DC2626]/20 dark:text-[#DC2626] dark:border-[#DC2626]/45',
};
