// Utilities for calculating class years and archiving dates

/**
 * Mês de início do ano letivo (0 = Janeiro, 1 = Fevereiro, etc.)
 * Configurável para escolas com calendários diferentes.
 * Padrão: 1 (Fevereiro)
 */
export const ACADEMIC_YEAR_START_MONTH = 1; // Fevereiro

/**
 * Calcula o ano atual da turma baseado na data de início e ano de início
 * @param startYearDate Data de início do primeiro ano (formato ISO string)
 * @param startYear Ano de início (1, 2 ou 3)
 * @param academicStartMonth Mês de início do ano letivo (opcional, usa ACADEMIC_YEAR_START_MONTH por padrão)
 * @returns Ano atual (1, 2 ou 3)
 */
export function calculateCurrentYear(
  startYearDate: string,
  startYear: number,
  academicStartMonth: number = ACADEMIC_YEAR_START_MONTH
): number {
  const startDate = new Date(startYearDate);
  const now = new Date();

  // Se a data de início é no futuro, a turma ainda não começou
  // Retornar o ano de início como ano atual
  if (startDate > now) {
    return startYear as 1 | 2 | 3;
  }

  // Calcular quantos anos se passaram desde o início
  const yearsDiff = now.getFullYear() - startDate.getFullYear();
  const monthsDiff = now.getMonth() - startDate.getMonth();

  // Se ainda estamos no mesmo ano calendário mas passou o mês de início do ano letivo
  // considerar que já avançou um ano letivo
  let academicYearsPassed = yearsDiff;
  if (yearsDiff === 0 && monthsDiff >= academicStartMonth) {
    academicYearsPassed = 1;
  } else if (yearsDiff > 0 && monthsDiff >= academicStartMonth) {
    academicYearsPassed = yearsDiff + 1;
  }

  const currentYear = startYear + academicYearsPassed;

  // Limitar entre 1 e 3
  if (currentYear < 1) return 1;
  if (currentYear > 3) return 3;

  return currentYear as 1 | 2 | 3;
}

/**
 * Calcula o ano atual da turma baseado apenas no ano calendário de início.
 * Fórmula simples: anoAtual - anoInício + 1
 * 
 * @param startCalendarYear Ano calendário de início (ex: 2024)
 * @returns Ano atual (1, 2 ou 3)
 */
export function calculateCurrentYearFromCalendar(startCalendarYear: number): 1 | 2 | 3 {
  const currentCalendarYear = new Date().getFullYear();
  const calculatedYear = currentCalendarYear - startCalendarYear + 1;

  // Limitar entre 1 e 3
  if (calculatedYear < 1) return 1;
  if (calculatedYear > 3) return 3;

  return calculatedYear as 1 | 2 | 3;
}

/**
 * Calcula as datas de início de cada ano letivo
 * @param startYearDate Data de início do primeiro ano
 * @param startYear Ano de início (1, 2 ou 3)
 * @returns Objeto com as datas de início de cada ano
 */
export function calculateYearDates(startYearDate: string, startYear: number): {
  year1: Date;
  year2: Date;
  year3: Date;
} {
  const startDate = new Date(startYearDate);

  // Ano letivo geralmente começa em fevereiro
  const year1 = new Date(startDate);

  const year2 = new Date(startDate);
  year2.setFullYear(year2.getFullYear() + 1);

  const year3 = new Date(startDate);
  year3.setFullYear(year3.getFullYear() + 2);

  return { year1, year2, year3 };
}

/**
 * Verifica se a turma deve ser arquivada (completou 3 anos letivos)
 * @param startYearDate Data de início do primeiro ano
 * @param startYear Ano de início (1, 2 ou 3)
 * @returns true se a turma deve ser arquivada
 */
export function shouldArchiveClass(startYearDate: string, startYear: number): boolean {
  const startDate = new Date(startYearDate);
  const now = new Date();

  // Se a data de início é no futuro, a turma ainda não começou, não arquivar
  if (startDate > now) {
    return false;
  }

  // Calcular quantos anos se passaram
  const yearsDiff = now.getFullYear() - startDate.getFullYear();
  const monthsDiff = now.getMonth() - startDate.getMonth();

  // Considerar que após 3 anos completos (considerando o ano de início), a turma deve ser arquivada
  // Se começou no 1º ano, após 3 anos letivos (fevereiro do 4º ano)
  // Se começou no 2º ano, após 2 anos letivos
  // Se começou no 3º ano, após 1 ano letivo

  const yearsToComplete = 4 - startYear; // Anos letivos necessários para completar

  if (yearsDiff > yearsToComplete) {
    return true;
  }

  if (yearsDiff === yearsToComplete && monthsDiff >= 2) {
    return true;
  }

  return false;
}

/**
 * Obtém a data do próximo ano letivo
 * @param currentYear Ano atual (1, 2 ou 3)
 * @param startYearDate Data de início do primeiro ano
 * @returns Data do próximo ano ou null se já está no último ano
 */
export function getNextYearDate(currentYear: number, startYearDate: string): Date | null {
  if (currentYear >= 3) {
    return null; // Já está no último ano
  }

  const startDate = new Date(startYearDate);
  const nextYear = currentYear + 1;

  // Calcular quantos anos adicionar
  const yearsToAdd = nextYear - 1; // Se currentYear é 1, nextYear é 2, então adicionar 1 ano

  const nextYearDate = new Date(startDate);
  nextYearDate.setFullYear(nextYearDate.getFullYear() + yearsToAdd);

  return nextYearDate;
}

/**
 * Obtém o ano letivo atual como string (ex: "2024")
 * @param startYearDate Data de início do primeiro ano
 * @param currentYear Ano atual (1, 2 ou 3)
 * @returns Ano letivo como string
 */
export function getAcademicYear(startYearDate: string, currentYear: number): string {
  const startDate = new Date(startYearDate);
  const yearsToAdd = currentYear - 1;
  const academicYear = startDate.getFullYear() + yearsToAdd;
  return academicYear.toString();
}

