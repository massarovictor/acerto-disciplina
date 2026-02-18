import { Grade, Student, Class, Incident } from '@/types';
import { checkQuarterGrades, QuarterCheckResult } from './approvalCalculator';
import { isPerformanceConvocationIncident } from './incidentClassification';
import { getBrasiliaISODate, getBrasiliaYear } from './brasiliaDate';

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Verifica alunos com baixo rendimento em um bimestre específico
 * Critério: 3+ disciplinas com nota < 6 no bimestre
 * @param grades Todas as notas
 * @param students Alunos da turma
 * @param classId ID da turma
 * @param quarter Bimestre (B1, B2, B3, B4)
 * @returns Array com resultados de alunos com baixo rendimento
 */
export function checkLowPerformanceStudents(
  grades: Grade[],
  students: Student[],
  classId: string,
  quarter: string,
  schoolYear?: number
): (QuarterCheckResult & { studentName: string })[] {
  const results: (QuarterCheckResult & { studentName: string })[] = [];

  students.forEach((student) => {
    const quarterCheck = checkQuarterGrades(grades, student.id, classId, quarter, schoolYear);

    if (quarterCheck.hasLowPerformance) {
      results.push({
        ...quarterCheck,
        studentName: student.name,
      });
    }
  });

  return results;
}

/**
 * Gera ocorrências de convocação de pais para alunos com baixo rendimento em um bimestre
 * @param grades Todas as notas
 * @param students Alunos da turma
 * @param classData Dados da turma
 * @param quarter Bimestre
 * @param existingIncidents Ocorrências existentes (para evitar duplicatas)
 * @param createdBy ID do usuário criando
 * @returns Array de novas ocorrências
 */
export function generateQuarterIncidents(
  grades: Grade[],
  students: Student[],
  classData: Class,
  quarter: string,
  existingIncidents: Incident[],
  createdBy: string,
  schoolYear?: number
): Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>[] {
  const newIncidents: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  const lowPerformanceStudents = checkLowPerformanceStudents(
    grades,
    students,
    classData.id,
    quarter,
    schoolYear
  );

  const quarterNames: Record<string, string> = {
    B1: '1º Bimestre',
    B2: '2º Bimestre',
    B3: '3º Bimestre',
    B4: '4º Bimestre',
    '1o Bimestre': '1º Bimestre',
    '2o Bimestre': '2º Bimestre',
    '3o Bimestre': '3º Bimestre',
    '4o Bimestre': '4º Bimestre',
    '1º Bimestre': '1º Bimestre',
    '2º Bimestre': '2º Bimestre',
    '3º Bimestre': '3º Bimestre',
    '4º Bimestre': '4º Bimestre',
  };

  const quarterDefaultDates: Record<string, string> = {
    '1º Bimestre': '03-31',
    '2º Bimestre': '05-31',
    '3º Bimestre': '08-31',
    '4º Bimestre': '10-31',
  };

  const targetCalendarYear = (() => {
    if (classData.startCalendarYear) {
      return classData.startCalendarYear + ((schoolYear ?? 1) - 1);
    }
    if (classData.startYearDate) {
      const yearFromDate = /^(\d{4})-\d{2}-\d{2}$/.exec(classData.startYearDate)?.[1];
      if (yearFromDate) {
        return Number(yearFromDate) + ((schoolYear ?? 1) - 1);
      }
    }
    return undefined;
  })();

  lowPerformanceStudents.forEach((result) => {
    // Verificar se já existe ocorrência para este aluno neste bimestre
    const existingIncident = existingIncidents.find(
      (incident) => {
        if (!incident.studentIds.includes(result.studentId)) return false;
        if (incident.classId !== classData.id) return false;
        if (!isPerformanceConvocationIncident(incident)) return false;

        const incidentYear = getBrasiliaYear(incident.date);
        if (targetCalendarYear && incidentYear !== targetCalendarYear) return false;

        const quarterLabel = quarterNames[quarter] || quarter;
        const normalizedDescription = normalizeText(incident.description);
        const normalizedSuggestedAction = normalizeText(incident.suggestedAction);
        const normalizedQuarterLabel = normalizeText(quarterLabel);
        const normalizedQuarter = normalizeText(quarter);
        const hasQuarterReference =
          normalizedDescription.includes(normalizedQuarterLabel) ||
          normalizedDescription.includes(normalizedQuarter) ||
          normalizedSuggestedAction.includes(normalizedQuarterLabel) ||
          normalizedSuggestedAction.includes(normalizedQuarter);

        return hasQuarterReference;
      }
    );

    if (!existingIncident) {
      // Determinar severidade baseada na quantidade
      const severity =
        result.subjectsBelowAverage.length >= 5
          ? 'grave'
          : 'intermediaria';

      // Criar lista de disciplinas com notas
      const subjectsDetail = result.subjectsBelowAverage
        .map((subject) => `${subject} (${result.subjectGrades[subject]?.toFixed(1) || 'N/A'})`)
        .join(', ');

      const quarterLabel = quarterNames[quarter] || quarter;
      const incidentDate =
        targetCalendarYear && quarterDefaultDates[quarterLabel]
          ? `${targetCalendarYear}-${quarterDefaultDates[quarterLabel]}`
          : getBrasiliaISODate();
      const description = `CONVOCAÇÃO DE PAIS - ${quarterLabel}: Convocação por baixo rendimento no ${quarterLabel}. Critério institucional: estudante com 3 ou mais disciplinas abaixo da média no bimestre. Situação identificada: ${result.subjectsBelowAverage.length} disciplina(s) abaixo da média (${subjectsDetail}).`;

      const newIncident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'> = {
        classId: classData.id,
        studentIds: [result.studentId],
        date: incidentDate,
        episodes: [],
        calculatedSeverity: severity,
        finalSeverity: severity,
        description,
        suggestedAction: `Convocar responsáveis para reunião pedagógica devido ao registro de 3 ou mais disciplinas abaixo da média no ${quarterLabel}.`,
        // Convocação gerada na página de aprovações já entra em acompanhamento.
        status: 'acompanhamento',
        createdBy,
        followUps: [],
        comments: [],
      };

      newIncidents.push(newIncident);
    }
  });

  return newIncidents;
}

/**
 * Função legada mantida para compatibilidade
 * @deprecated Use generateQuarterIncidents para verificação por bimestre
 */
export function checkAndGenerateIncidents(
  grades: Grade[],
  students: Student[],
  classes: Class[],
  existingIncidents: Incident[],
  createdBy: string
): Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Mantida para compatibilidade, mas agora retorna array vazio
  // Use generateQuarterIncidents para a nova lógica
  console.warn('checkAndGenerateIncidents está deprecada. Use generateQuarterIncidents.');
  return [];
}
