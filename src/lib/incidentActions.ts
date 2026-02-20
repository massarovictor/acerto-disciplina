import { Incident, IncidentSeverity, Student } from '@/types';
import { isPerformanceConvocationIncident } from './incidentClassification';
import { isDisciplinaryIncident } from './incidentType';
import { getCurrentBrasiliaYear, getBrasiliaYear } from './brasiliaDate';

/**
 * Action levels based on accumulation rules:
 * - conversa_registro: 1 leve (first offense)
 * - comunicado_pais: 2 leves OR 1 intermediária
 * - suspensao_1_dia: 3 leves OR 2 intermediárias OR 1 grave
 * - suspensao_3_dias: 1 gravíssima
 */
export type ActionLevel = 'conversa_registro' | 'comunicado_pais' | 'suspensao_1_dia' | 'suspensao_3_dias';

const actionLevelPriority: Record<ActionLevel, number> = {
  conversa_registro: 0,
  comunicado_pais: 1,
  suspensao_1_dia: 2,
  suspensao_3_dias: 3,
};

const getActionLevelFromCounts = (counts: {
  leve: number;
  intermediaria: number;
  grave: number;
  gravissima: number;
}): ActionLevel => {
  if (counts.gravissima >= 1) {
    return 'suspensao_3_dias';
  }

  if (counts.grave >= 1 || counts.intermediaria >= 2 || counts.leve >= 3) {
    return 'suspensao_1_dia';
  }

  if (counts.intermediaria >= 1 || counts.leve >= 2) {
    return 'comunicado_pais';
  }

  return 'conversa_registro';
};

/**
 * Get incident counts for a student, filtered by current school year
 * considering all disciplinary occurrences regardless of workflow status.
 */
export function getStudentIncidentCounts(
  studentId: string,
  allIncidents: Incident[],
  currentSchoolYear?: number
): { leve: number; intermediaria: number; grave: number; gravissima: number } {
  const schoolYear = currentSchoolYear ?? getCurrentBrasiliaYear();

  // Filter incidents: disciplinary incidents belonging to student within school year.
  const studentIncidents = allIncidents.filter(incident => {
    if (!incident.studentIds.includes(studentId)) return false;
    if (!isDisciplinaryIncident(incident)) return false;
    if (isPerformanceConvocationIncident(incident)) return false;

    // Filter by school year (incidents from current academic year)
    const incidentYear = getBrasiliaYear(incident.date);
    return incidentYear === schoolYear;
  });

  return {
    leve: studentIncidents.filter(i => i.finalSeverity === 'leve').length,
    intermediaria: studentIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
    grave: studentIncidents.filter(i => i.finalSeverity === 'grave').length,
    gravissima: studentIncidents.filter(i => i.finalSeverity === 'gravissima').length,
  };
}

/**
 * Determine the REQUIRED action level based on:
 * 1. Current incident severity
 * 2. Student's accumulated history (current school year)
 * 
 * Rules:
 * - 1 leve: conversa_registro
 * - 2 leves OR 1 intermediária: comunicado_pais
 * - 3 leves OR 2 intermediárias OR 1 grave (atual ou histórico): suspensao_1_dia
 * - 1 gravíssima (atual ou histórico): suspensao_3_dias
 */
export function getRequiredActionLevel(
  studentIds: string[],
  currentSeverity: IncidentSeverity,
  allIncidents: Incident[],
  currentSchoolYear?: number
): ActionLevel {
  const idsToEvaluate = studentIds.length > 0 ? studentIds : ['__virtual__'];

  // Simulate the new incident in each student's history and enforce the highest required action.
  return idsToEvaluate.reduce<ActionLevel>((highestLevel, studentId) => {
    const baseCounts = studentId === '__virtual__'
      ? { leve: 0, intermediaria: 0, grave: 0, gravissima: 0 }
      : getStudentIncidentCounts(studentId, allIncidents, currentSchoolYear);

    const simulatedCounts = { ...baseCounts };
    simulatedCounts[currentSeverity] += 1;

    const requiredForStudent = getActionLevelFromCounts(simulatedCounts);
    return actionLevelPriority[requiredForStudent] > actionLevelPriority[highestLevel]
      ? requiredForStudent
      : highestLevel;
  }, 'conversa_registro');
}

/**
 * Get human-readable action text for the required level
 */
export function getActionText(level: ActionLevel): string {
  switch (level) {
    case 'suspensao_3_dias':
      return 'Conversa individual com o(s) estudante(s), registro da ocorrência e SUSPENSÃO DAS ATIVIDADES ESCOLARES POR TRÊS dias e retorno à escola somente com o responsável.';
    case 'suspensao_1_dia':
      return 'Conversa individual com o(s) estudante(s), registro da ocorrência e SUSPENSÃO DAS ATIVIDADES ESCOLARES POR UM dia e retorno à escola somente com o responsável.';
    case 'comunicado_pais':
      return 'Conversa individual com o(s) estudante(s), registro da ocorrência e ENCAMINHAMENTO DE COMUNICADO AOS PAIS E/OU RESPONSÁVEIS sobre o ocorrido.';
    default:
      return 'Conversa e registro.';
  }
}

/**
 * Calculate suggested action based on severity and student's incident history
 * @deprecated Use getRequiredActionLevel + getActionText for new code
 */
export function calculateSuggestedAction(
  studentIds: string[],
  finalSeverity: IncidentSeverity,
  allIncidents: Incident[],
  students: Student[]
): string {
  const level = getRequiredActionLevel(studentIds, finalSeverity, allIncidents);
  return getActionText(level);
}

/**
 * Get follow-up type suggestion based on required action level
 */
export function getRequiredFollowUpType(
  level: ActionLevel
): 'conversa_individual' | 'conversa_pais' | 'situacoes_diversas' {
  // Any level above conversa_registro requires parent contact
  if (level === 'comunicado_pais' || level === 'suspensao_1_dia' || level === 'suspensao_3_dias') {
    return 'conversa_pais';
  }
  return 'conversa_individual';
}

/**
 * Get follow-up type suggestion based on action taken
 */
export function suggestFollowUpType(
  action: string,
  severity?: IncidentSeverity
): 'conversa_individual' | 'conversa_pais' | 'situacoes_diversas' {
  // Se a gravidade já indica necessidade de contato com responsáveis
  if (severity === 'intermediaria' || severity === 'grave' || severity === 'gravissima') {
    return 'conversa_pais';
  }

  const actionLower = action.toLowerCase();

  if (
    actionLower.includes('suspensão') ||
    actionLower.includes('suspensao') ||
    actionLower.includes('suspenso')
  ) {
    return 'conversa_pais';
  }

  if (
    actionLower.includes('comunicado aos pais') ||
    actionLower.includes('responsáveis') ||
    actionLower.includes('responsaveis')
  ) {
    return 'conversa_pais';
  }

  return 'conversa_individual';
}

/**
 * Check if a student has crossed an escalation threshold
 * Returns info about the escalation if applicable
 */
export function checkEscalationStatus(
  studentId: string,
  allIncidents: Incident[],
  currentSchoolYear?: number
): { isEscalated: boolean; reason: string; level: ActionLevel } {
  const counts = getStudentIncidentCounts(studentId, allIncidents, currentSchoolYear);

  // Check thresholds in order of severity
  if (counts.gravissima >= 1) {
    return {
      isEscalated: true,
      reason: 'Aluno possui ocorrência gravíssima no histórico',
      level: 'suspensao_3_dias'
    };
  }

  if (counts.grave >= 1 || counts.intermediaria >= 2 || counts.leve >= 3) {
    return {
      isEscalated: true,
      reason: counts.grave >= 1
        ? 'Aluno possui ocorrência grave no histórico'
        : counts.intermediaria >= 2
          ? `Aluno possui ${counts.intermediaria} acompanhamentos intermediários`
          : `Aluno possui ${counts.leve} acompanhamentos leves`,
      level: 'suspensao_1_dia'
    };
  }

  if (counts.intermediaria >= 1 || counts.leve >= 2) {
    return {
      isEscalated: true,
      reason: counts.intermediaria >= 1
        ? 'Aluno possui ocorrência intermediária no histórico'
        : `Aluno possui ${counts.leve} acompanhamentos leves`,
      level: 'comunicado_pais'
    };
  }

  return {
    isEscalated: false,
    reason: '',
    level: 'conversa_registro'
  };
}
