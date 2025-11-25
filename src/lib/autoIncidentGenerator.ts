import { Grade, Student, Class, Incident } from '@/types';
import { calculateStudentStatus } from './approvalCalculator';
import { getAcademicYear } from './classYearCalculator';

/**
 * Verifica e gera ocorrências automaticamente para alunos com 3+ disciplinas abaixo da média
 * @param grades Todas as notas
 * @param students Todos os alunos
 * @param classes Todas as turmas
 * @param existingIncidents Ocorrências existentes (para evitar duplicatas)
 * @param createdBy ID do usuário que está criando a ocorrência
 * @returns Array de ocorrências geradas
 */
export function checkAndGenerateIncidents(
  grades: Grade[],
  students: Student[],
  classes: Class[],
  existingIncidents: Incident[],
  createdBy: string
): Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>[] {
  const newIncidents: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  // Agrupar alunos por turma
  const studentsByClass = students.reduce((acc, student) => {
    if (!acc[student.classId]) {
      acc[student.classId] = [];
    }
    acc[student.classId].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Para cada turma
  Object.entries(studentsByClass).forEach(([classId, classStudents]) => {
    const classData = classes.find((c) => c.id === classId);
    if (!classData || !classData.startYearDate || !classData.currentYear) {
      return; // Pular turmas sem dados de ano
    }

    const academicYear = getAcademicYear(classData.startYearDate, classData.currentYear);

    // Para cada aluno da turma
    classStudents.forEach((student) => {
      // Calcular status acadêmico
      const academicStatus = calculateStudentStatus(
        grades,
        student.id,
        classId,
        academicYear
      );

      // Verificar se tem 3+ disciplinas abaixo da média
      if (academicStatus.subjectsBelowAverage.length >= 3) {
        // Verificar se já existe ocorrência do tipo "Chamada de Pais" para este aluno neste ano letivo
        const existingIncident = existingIncidents.find(
          (incident) =>
            incident.studentIds.includes(student.id) &&
            incident.classId === classId &&
            incident.description?.toLowerCase().includes('rendimento acadêmico') &&
            incident.createdAt.startsWith(academicYear) // Verificar se foi criada neste ano letivo
        );

        if (!existingIncident) {
          // Determinar severidade baseado em quantas disciplinas estão abaixo da média
          const severity =
            academicStatus.subjectsBelowAverage.length >= 5
              ? 'grave'
              : academicStatus.subjectsBelowAverage.length >= 3
              ? 'intermediaria'
              : 'intermediaria';

          // Criar descrição detalhada
          const subjectsList = academicStatus.subjectsBelowAverage.join(', ');
          const description = `Aluno com média abaixo de 6,0 em ${academicStatus.subjectsBelowAverage.length} disciplina(s): ${subjectsList}.`;

          // Criar ocorrência
          const newIncident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'> = {
            classId,
            studentIds: [student.id],
            date: new Date().toISOString().split('T')[0],
            episodes: [], // Episódios vazios - será preenchido pelo sistema de ocorrências
            calculatedSeverity: severity,
            finalSeverity: severity,
            description,
            suggestedAction: 'Chamar responsáveis para reunião para discutir o rendimento acadêmico do aluno.',
            status: 'aberta',
            createdBy,
            followUps: [],
            comments: [],
          };

          newIncidents.push(newIncident);
        }
      }
    });
  });

  return newIncidents;
}

