// Performance Prediction and Risk Analysis System

import { Grade } from '@/types';
import { calculateMean, calculateTrend } from './advancedCalculations';
import { QUARTERS } from './subjects';

/**
 * Prediz a nota final baseada em regressão linear dos bimestres anteriores
 */
export function predictFinalGrade(quarterGrades: number[]): {
  predicted: number;
  confidence: number;
  method: string;
} {
  if (quarterGrades.length === 0) {
    return { predicted: 0, confidence: 0, method: 'insufficient_data' };
  }

  if (quarterGrades.length === 1) {
    // Com apenas 1 bimestre, usar a nota como predição
    return { predicted: quarterGrades[0], confidence: 30, method: 'single_grade' };
  }

  // Preparar dados para regressão
  const data = quarterGrades.map((grade, index) => ({ x: index + 1, y: grade }));
  
  // Calcular tendência
  const trend = calculateTrend(data);

  // Prever nota do 4º bimestre (x = 4)
  const predicted = Math.max(0, Math.min(10, trend.slope * 4 + trend.intercept));
  
  // Confiança baseada no R²
  const confidence = Math.round(trend.rSquared * 100);

  return { predicted, confidence, method: 'linear_regression' };
}

/**
 * Calcula a probabilidade de reprovação (0-100%)
 */
export function calculateFailureRisk(
  studentGrades: Grade[],
  currentQuarter: string
): number {
  if (studentGrades.length === 0) return 0;

  // Agrupar notas por disciplina
  const gradesBySubject = new Map<string, number[]>();
  studentGrades.forEach(grade => {
    const grades = gradesBySubject.get(grade.subject) || [];
    grades.push(grade.grade);
    gradesBySubject.set(grade.subject, grades);
  });

  // Calcular métricas de risco
  let totalSubjects = gradesBySubject.size;
  let subjectsBelowAverage = 0;
  let subjectsInDanger = 0;
  let averageGrade = calculateMean(studentGrades.map(g => g.grade));

  gradesBySubject.forEach(grades => {
    const mean = calculateMean(grades);
    if (mean < 6) {
      subjectsBelowAverage++;
      if (mean < 5) {
        subjectsInDanger++;
      }
    }
  });

  // Calcular risco base
  let risk = 0;

  // Fator 1: Média geral (40% do risco)
  if (averageGrade < 6) {
    risk += ((6 - averageGrade) / 6) * 40;
  }

  // Fator 2: Número de disciplinas abaixo da média (40% do risco)
  const failureRate = subjectsBelowAverage / totalSubjects;
  risk += failureRate * 40;

  // Fator 3: Disciplinas em perigo crítico (20% do risco)
  if (subjectsInDanger > 0) {
    risk += (subjectsInDanger / totalSubjects) * 20;
  }

  // Ajuste baseado no bimestre atual
  const quarterIndex = QUARTERS.indexOf(currentQuarter);
  if (quarterIndex >= 0) {
    // Quanto mais tarde no ano, maior a certeza do risco
    const certaintyMultiplier = 1 + (quarterIndex * 0.15);
    risk *= certaintyMultiplier;
  }

  return Math.min(100, Math.max(0, risk));
}

/**
 * Identifica a tendência de desempenho do aluno
 */
export function identifyTrend(quarterGrades: { quarter: string; average: number }[]): {
  trend: 'Melhoria Constante' | 'Declínio' | 'Estável' | 'Irregular';
  description: string;
  strength: number; // 0-100
} {
  if (quarterGrades.length < 2) {
    return {
      trend: 'Estável',
      description: 'Dados insuficientes para análise de tendência',
      strength: 0,
    };
  }

  // Preparar dados
  const data = quarterGrades.map((q, index) => ({ x: index + 1, y: q.average }));
  const trendData = calculateTrend(data);

  // Calcular variações entre bimestres consecutivos
  const variations = [];
  for (let i = 1; i < quarterGrades.length; i++) {
    variations.push(quarterGrades[i].average - quarterGrades[i - 1].average);
  }

  const consistentPositive = variations.every(v => v >= 0);
  const consistentNegative = variations.every(v => v <= 0);
  const largeVariations = variations.some(v => Math.abs(v) > 1.5);

  let trend: 'Melhoria Constante' | 'Declínio' | 'Estável' | 'Irregular';
  let description: string;

  if (consistentPositive && trendData.slope > 0.2) {
    trend = 'Melhoria Constante';
    description = 'Aluno apresenta evolução consistente ao longo dos bimestres';
  } else if (consistentNegative && trendData.slope < -0.2) {
    trend = 'Declínio';
    description = 'Aluno apresenta queda progressiva de desempenho';
  } else if (Math.abs(trendData.slope) < 0.15 && !largeVariations) {
    trend = 'Estável';
    description = 'Desempenho mantém-se relativamente constante';
  } else {
    trend = 'Irregular';
    description = 'Desempenho apresenta variações significativas entre bimestres';
  }

  // Força da tendência baseada no R²
  const strength = Math.round(trendData.rSquared * 100);

  return { trend, description, strength };
}

/**
 * Sugere prioridade de intervenção pedagógica
 */
export function suggestInterventionPriority(
  failureRisk: number,
  trend: string,
  averageGrade: number
): {
  priority: 'Alta' | 'Média' | 'Baixa';
  actions: string[];
} {
  let priority: 'Alta' | 'Média' | 'Baixa';
  const actions: string[] = [];

  // Determinar prioridade
  if (failureRisk > 70 || (failureRisk > 50 && trend === 'Declínio')) {
    priority = 'Alta';
    actions.push('Reunião urgente com responsáveis');
    actions.push('Plano de recuperação imediato');
    actions.push('Acompanhamento psicopedagógico');
    actions.push('Reforço escolar intensivo');
  } else if (failureRisk > 40 || (failureRisk > 30 && trend === 'Declínio')) {
    priority = 'Média';
    actions.push('Monitoramento quinzenal');
    actions.push('Atividades de reforço');
    actions.push('Contato com responsáveis');
    actions.push('Revisão de metodologia');
  } else {
    priority = 'Baixa';
    if (trend === 'Irregular') {
      actions.push('Acompanhamento regular');
      actions.push('Identificar causas de variação');
    } else if (trend === 'Estável' && averageGrade < 7) {
      actions.push('Estimular melhoria contínua');
      actions.push('Atividades de enriquecimento');
    } else {
      actions.push('Manter acompanhamento padrão');
      actions.push('Reconhecer bom desempenho');
    }
  }

  return { priority, actions };
}

/**
 * Calcula o potencial de recuperação do aluno
 */
export function calculateRecoveryPotential(
  quarterGrades: number[],
  currentAverage: number
): {
  potential: 'Alto' | 'Médio' | 'Baixo';
  minimumGradeNeeded: number;
  explanation: string;
} {
  if (quarterGrades.length === 0) {
    return {
      potential: 'Médio',
      minimumGradeNeeded: 6.0,
      explanation: 'Sem dados suficientes para análise',
    };
  }

  // Calcular nota necessária para atingir média 6
  const totalQuarters = 4;
  const quartersLeft = totalQuarters - quarterGrades.length;
  
  if (quartersLeft === 0) {
    // Já no 4º bimestre
    return {
      potential: currentAverage >= 6 ? 'Alto' : 'Baixo',
      minimumGradeNeeded: 0,
      explanation: currentAverage >= 6 
        ? 'Aluno já atingiu a média necessária'
        : 'Sem bimestres restantes para recuperação',
    };
  }

  const currentSum = quarterGrades.reduce((sum, grade) => sum + grade, 0);
  const neededSum = 6.0 * totalQuarters;
  const minimumGradeNeeded = (neededSum - currentSum) / quartersLeft;

  let potential: 'Alto' | 'Médio' | 'Baixo';
  let explanation: string;

  if (currentAverage >= 6) {
    potential = 'Alto';
    explanation = 'Aluno já está acima da média necessária';
  } else if (minimumGradeNeeded <= 6) {
    potential = 'Alto';
    explanation = `Com nota ${minimumGradeNeeded.toFixed(1)} nos próximos ${quartersLeft} bimestre(s), atingirá a média`;
  } else if (minimumGradeNeeded <= 8) {
    potential = 'Médio';
    explanation = `Necessita nota ${minimumGradeNeeded.toFixed(1)} nos próximos ${quartersLeft} bimestre(s) - esforço significativo necessário`;
  } else {
    potential = 'Baixo';
    explanation = `Necessita nota ${minimumGradeNeeded.toFixed(1)} nos próximos ${quartersLeft} bimestre(s) - muito difícil de alcançar`;
  }

  return { potential, minimumGradeNeeded: Math.min(10, Math.max(0, minimumGradeNeeded)), explanation };
}

/**
 * Análise completa de desempenho e risco para um aluno
 */
export function analyzeStudentPerformance(
  studentGrades: Grade[],
  currentQuarter: string
): {
  risk: number;
  trend: ReturnType<typeof identifyTrend>;
  intervention: ReturnType<typeof suggestInterventionPriority>;
  recovery: ReturnType<typeof calculateRecoveryPotential>;
  prediction: ReturnType<typeof predictFinalGrade>;
} {
  // Calcular risco
  const risk = calculateFailureRisk(studentGrades, currentQuarter);

  // Agrupar por bimestre para análise de tendência
  const gradesByQuarter = new Map<string, number[]>();
  studentGrades.forEach(grade => {
    const grades = gradesByQuarter.get(grade.quarter) || [];
    grades.push(grade.grade);
    gradesByQuarter.set(grade.quarter, grades);
  });

  const quarterAverages = QUARTERS.map(q => {
    const grades = gradesByQuarter.get(q) || [];
    return { quarter: q, average: grades.length > 0 ? calculateMean(grades) : 0 };
  }).filter(q => q.average > 0);

  // Análise de tendência
  const trend = identifyTrend(quarterAverages);

  // Média atual
  const currentAverage = calculateMean(studentGrades.map(g => g.grade));

  // Prioridade de intervenção
  const intervention = suggestInterventionPriority(risk, trend.trend, currentAverage);

  // Potencial de recuperação
  const quarterGrades = quarterAverages.map(q => q.average);
  const recovery = calculateRecoveryPotential(quarterGrades, currentAverage);

  // Predição de nota final
  const prediction = predictFinalGrade(quarterGrades);

  return { risk, trend, intervention, recovery, prediction };
}







