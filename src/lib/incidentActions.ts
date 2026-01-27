import { Incident, IncidentSeverity, Student } from '@/types';

// Calculate suggested action based on severity and student's incident history
export function calculateSuggestedAction(
  studentIds: string[],
  finalSeverity: IncidentSeverity,
  allIncidents: Incident[],
  students: Student[]
): string {
  // Get incident history for each student
  const studentIncidentCounts = studentIds.map(studentId => {
    const studentIncidents = allIncidents.filter(
      incident => incident.studentIds.includes(studentId) && incident.status !== 'aberta'
    );

    return {
      studentId,
      leve: studentIncidents.filter(i => i.finalSeverity === 'leve').length,
      intermediaria: studentIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
      grave: studentIncidents.filter(i => i.finalSeverity === 'grave').length,
      gravissima: studentIncidents.filter(i => i.finalSeverity === 'gravissima').length,
    };
  });

  // Find the worst case scenario among all students
  const maxLeve = Math.max(...studentIncidentCounts.map(s => s.leve));
  const maxIntermediaria = Math.max(...studentIncidentCounts.map(s => s.intermediaria));
  const maxGrave = Math.max(...studentIncidentCounts.map(s => s.grave));

  // Apply rules based on current severity and history
  if (finalSeverity === 'gravissima') {
    return 'Conversa individual com o(s) estudante(s), registro da ocorrência e SUSPENSÃO DAS ATIVIDADES ESCOLARES POR TRÊS dias e retorno à escola somente com o responsável.';
  }

  if (finalSeverity === 'grave' || maxIntermediaria >= 2 || maxLeve >= 3) {
    return 'Conversa individual com o(s) estudante(s), registro da ocorrência e SUSPENSÃO DAS ATIVIDADES ESCOLARES POR UM dia e retorno à escola somente com o responsável.';
  }

  if (finalSeverity === 'intermediaria' || maxLeve >= 2) {
    return 'Conversa individual com o(s) estudante(s), registro da ocorrência e ENCAMINHAMENTO DE COMUNICADO AOS PAIS E/OU RESPONSÁVEIS sobre o ocorrido.';
  }

  // Default for first leve incident
  return 'Conversa e registro.';
}

// Get follow-up type suggestion based on action taken
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
