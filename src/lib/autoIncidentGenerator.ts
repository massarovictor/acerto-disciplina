import { Grade, Student, Class, Incident } from '@/types';
import { checkQuarterGrades, QuarterCheckResult } from './approvalCalculator';

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
  };

  lowPerformanceStudents.forEach((result) => {
    // Verificar se já existe ocorrência para este aluno neste bimestre
    const existingIncident = existingIncidents.find(
      (incident) =>
        incident.studentIds.includes(result.studentId) &&
        incident.classId === classData.id &&
        incident.description?.toLowerCase().includes(quarter.toLowerCase()) &&
        incident.description?.toLowerCase().includes('convocação')
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

      const description = `CONVOCAÇÃO DE PAIS - ${quarterNames[quarter] || quarter}: Aluno com ${result.subjectsBelowAverage.length} disciplina(s) abaixo da média: ${subjectsDetail}.`;

      const newIncident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'> = {
        classId: classData.id,
        studentIds: [result.studentId],
        date: new Date().toISOString().split('T')[0],
        episodes: [],
        calculatedSeverity: severity,
        finalSeverity: severity,
        description,
        suggestedAction: `Convocar responsáveis para reunião pedagógica sobre o rendimento no ${quarterNames[quarter] || quarter}.`,
        status: 'aberta',
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
