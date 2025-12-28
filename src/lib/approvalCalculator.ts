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
 * Verifica se uma disciplina tem todas as 4 notas
 * @param grades Todas as notas
 * @param studentId ID do aluno
 * @param subject Disciplina
 * @returns Objeto com boolean completo e array de bimestres faltantes
 */
export function checkQuartersComplete(
  grades: Grade[],
  studentId: string,
  subject: string
): { complete: boolean; missingQuarters: string[] } {
  const studentGrades = grades.filter(
    (g) => g.studentId === studentId && g.subject === subject
  );

  const presentQuarters = studentGrades.map((g) => g.quarter);
  const missingQuarters = QUARTERS.filter((q) => !presentQuarters.includes(q));

  return {
    complete: missingQuarters.length === 0,
    missingQuarters,
  };
}

/**
 * Calcula o status acadêmico de um aluno ao final dos 4 bimestres
 * Regras:
 * - Se faltam notas em qualquer disciplina: Pendente (pending)
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
): StudentAcademicStatus & { isPending?: boolean; pendingSubjects?: Record<string, string[]> } {
  // Filtrar apenas notas deste aluno e desta turma
  const studentGrades = grades.filter(
    (g) => g.studentId === studentId && g.classId === classId
  );

  // Obter todas as disciplinas únicas deste aluno
  const subjects = [...new Set(studentGrades.map((g) => g.subject))];

  const finalGrades: Record<string, number> = {};
  const subjectsBelowAverage: string[] = [];
  const pendingSubjects: Record<string, string[]> = {}; // disciplina -> bimestres faltantes
  let hasIncompleteSubject = false;

  // Calcular média final de cada disciplina
  subjects.forEach((subject) => {
    // Verificar se tem todas as 4 notas
    const quarterCheck = checkQuartersComplete(grades, studentId, subject);

    if (!quarterCheck.complete) {
      hasIncompleteSubject = true;
      pendingSubjects[subject] = quarterCheck.missingQuarters;
    }

    const finalGrade = calculateFinalGrade(grades, studentId, subject);
    if (finalGrade !== null) {
      finalGrades[subject] = finalGrade;
      if (finalGrade < 6) {
        subjectsBelowAverage.push(subject);
      }
    }
  });

  // Se não tem nenhuma disciplina, também é pendente
  if (subjects.length === 0) {
    hasIncompleteSubject = true;
  }

  // Determinar status
  let status: 'approved' | 'recovery' | 'failed' = 'approved';

  // Se tem disciplina incompleta, consideramos pending (retornamos approved mas com flag)
  if (hasIncompleteSubject) {
    // Ainda calculamos o status parcial, mas indicamos que está pendente
    status = 'approved'; // Será sobrescrito pelo isPending na UI
  } else if (subjectsBelowAverage.length === 0) {
    status = 'approved';
  } else if (subjectsBelowAverage.length <= 2) {
    status = 'recovery';
  } else {
    status = 'recovery';
  }

  return {
    studentId,
    classId,
    year: academicYear,
    status: hasIncompleteSubject ? 'approved' : status, // Se pendente, não é definitivo
    finalGrades,
    subjectsBelowAverage,
    calculatedAt: new Date().toISOString(),
    isPending: hasIncompleteSubject,
    pendingSubjects: Object.keys(pendingSubjects).length > 0 ? pendingSubjects : undefined,
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

/**
 * Interface para resultado da verificação de bimestre
 */
export interface QuarterCheckResult {
  studentId: string;
  quarter: string;
  subjectGrades: Record<string, number>; // disciplina -> nota
  subjectsBelowAverage: string[]; // disciplinas com nota < 6
  hasLowPerformance: boolean; // true se 3+ disciplinas abaixo
  totalSubjects: number;
}

/**
 * Verifica as notas de um aluno em um bimestre específico
 * @param grades Todas as notas
 * @param studentId ID do aluno
 * @param classId ID da turma
 * @param quarter Bimestre (B1, B2, B3, B4)
 * @returns Resultado da verificação com notas e disciplinas abaixo da média
 */
export function checkQuarterGrades(
  grades: Grade[],
  studentId: string,
  classId: string,
  quarter: string
): QuarterCheckResult {
  // Filtrar notas do aluno para o bimestre específico
  const quarterGrades = grades.filter(
    (g) => g.studentId === studentId && g.classId === classId && g.quarter === quarter
  );

  const subjectGrades: Record<string, number> = {};
  const subjectsBelowAverage: string[] = [];

  quarterGrades.forEach((grade) => {
    subjectGrades[grade.subject] = grade.grade;
    if (grade.grade < 6) {
      subjectsBelowAverage.push(grade.subject);
    }
  });

  return {
    studentId,
    quarter,
    subjectGrades,
    subjectsBelowAverage,
    hasLowPerformance: subjectsBelowAverage.length >= 3,
    totalSubjects: Object.keys(subjectGrades).length,
  };
}

/**
 * Verifica as notas de todos os alunos de uma turma em um bimestre específico
 * @param grades Todas as notas
 * @param studentIds IDs dos alunos
 * @param classId ID da turma
 * @param quarter Bimestre
 * @returns Array com resultados de verificação por aluno
 */
export function checkClassQuarterGrades(
  grades: Grade[],
  studentIds: string[],
  classId: string,
  quarter: string
): QuarterCheckResult[] {
  return studentIds.map((studentId) =>
    checkQuarterGrades(grades, studentId, classId, quarter)
  );
}
