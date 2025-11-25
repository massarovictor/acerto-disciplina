import { Grade, StudentAcademicStatus } from '@/types';
import { QUARTERS } from '@/lib/subjects';

/**
 * Calcula a média final de um aluno em uma disciplina específica
 * Média = (B1 + B2 + B3 + B4) / 4
 * @param grades Todas as notas do aluno
 * @param studentId ID do aluno
 * @param subject Disciplina
 * @returns Média final ou null se não houver notas suficientes
 */
export function calculateFinalGrade(
  grades: Grade[],
  studentId: string,
  subject: string
): number | null {
  const studentGrades = grades.filter(
    (g) => g.studentId === studentId && g.subject === subject
  );

  if (studentGrades.length === 0) {
    return null;
  }

  // Buscar notas dos 4 bimestres
  const quarterGrades: Record<string, number> = {};
  studentGrades.forEach((grade) => {
    quarterGrades[grade.quarter] = grade.grade;
  });

  // Verificar se tem pelo menos uma nota
  const quarterValues = QUARTERS.map((quarter) => quarterGrades[quarter] ?? null).filter(
    (v) => v !== null
  ) as number[];

  if (quarterValues.length === 0) {
    return null;
  }

  // Calcular média: se faltar algum bimestre, usar 0 para aquele bimestre
  const sum = QUARTERS.reduce((acc, quarter) => {
    return acc + (quarterGrades[quarter] ?? 0);
  }, 0);

  return sum / 4;
}

/**
 * Calcula o status acadêmico de um aluno ao final dos 4 bimestres
 * Regras:
 * - Média >= 6,0 em todas as disciplinas: Aprovado
 * - Média < 6,0 em até 2 disciplinas: Recuperação
 * - Média < 6,0 em 3+ disciplinas: Recuperação (conforme especificado pelo usuário)
 * @param grades Todas as notas
 * @param studentId ID do aluno
 * @param classId ID da turma
 * @param academicYear Ano letivo (ex: "2024")
 * @returns Status acadêmico do aluno
 */
export function calculateStudentStatus(
  grades: Grade[],
  studentId: string,
  classId: string,
  academicYear: string
): StudentAcademicStatus {
  // Filtrar apenas notas deste aluno e desta turma
  const studentGrades = grades.filter(
    (g) => g.studentId === studentId && g.classId === classId
  );

  // Obter todas as disciplinas únicas deste aluno
  const subjects = [...new Set(studentGrades.map((g) => g.subject))];

  const finalGrades: Record<string, number> = {};
  const subjectsBelowAverage: string[] = [];

  // Calcular média final de cada disciplina
  subjects.forEach((subject) => {
    const finalGrade = calculateFinalGrade(grades, studentId, subject);
    if (finalGrade !== null) {
      finalGrades[subject] = finalGrade;
      if (finalGrade < 6) {
        subjectsBelowAverage.push(subject);
      }
    }
  });

  // Determinar status
  let status: 'approved' | 'recovery' | 'failed' = 'approved';

  if (subjectsBelowAverage.length === 0) {
    status = 'approved';
  } else if (subjectsBelowAverage.length <= 2) {
    status = 'recovery'; // Até 2 disciplinas: recuperação
  } else {
    status = 'recovery'; // 3+ disciplinas: também recuperação (conforme especificado)
  }

  return {
    studentId,
    classId,
    year: academicYear,
    status,
    finalGrades,
    subjectsBelowAverage,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calcula o status acadêmico de todos os alunos de uma turma
 * @param grades Todas as notas
 * @param studentIds IDs dos alunos da turma
 * @param classId ID da turma
 * @param academicYear Ano letivo
 * @returns Array com status acadêmico de cada aluno
 */
export function calculateClassAcademicStatus(
  grades: Grade[],
  studentIds: string[],
  classId: string,
  academicYear: string
): StudentAcademicStatus[] {
  return studentIds.map((studentId) =>
    calculateStudentStatus(grades, studentId, classId, academicYear)
  );
}

