/**
 * Módulo de Análise de Dados da Turma
 * 
 * Algoritmos para gerar insights qualitativos sobre:
 * - Tendências entre bimestres
 * - Comparações entre áreas do conhecimento
 * - Predições de risco de reprovação
 * - Agrupamentos de alunos por perfil
 * - Correlação comportamento x desempenho
 */

import { Student, Grade, Incident, AttendanceRecord } from '@/types';
import { SUBJECT_AREAS, getSubjectArea } from './subjects';

// ============================================
// TIPOS E INTERFACES
// ============================================

export type TrendDirection = 'melhora_consistente' | 'piora_consistente' | 'irregular' | 'estavel';
export type RiskLevel = 'baixo' | 'moderado' | 'alto';
export type ClusterType = 'excelencia' | 'regular' | 'atencao' | 'critico';
export type TemporalPattern = 'ocorrencia_precede_queda' | 'queda_precede_ocorrencia' | 'sem_padrao';

export interface TrendAnalysis {
  entityId: string; // studentId ou areaName
  entityName: string;
  type: 'student' | 'area';
  direction: TrendDirection;
  percentChange: number;
  quarterGrades: { quarter: string; average: number }[];
  insight: string;
}

export interface AreaComparison {
  areaName: string;
  average: number;
  classAverage: number;
  difference: number;
  studentsBelow: number;
  studentsAbove: number;
  isStrongest: boolean;
  isWeakest: boolean;
  insight: string;
}

export interface RiskPrediction {
  studentId: string;
  studentName: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  factors: {
    gradeScore: number;
    frequencyScore: number;
    incidentScore: number;
    trendScore: number;
  };
  recommendations: string[];
}

export interface StudentCluster {
  type: ClusterType;
  label: string;
  students: { id: string; name: string }[];
  count: number;
  percentage: number;
  characteristics: string[];
}

export interface SeverityImpact {
  severity: string;
  avgGradeDrop: number;
  count: number;
  studentNames: string[];
}

export interface BehaviorPerformanceCorrelation {
  correlationCoefficient: number;
  withIncidents: {
    count: number;
    avgGrade: number;
    avgFrequency: number;
    studentNames: string[];
  };
  withoutIncidents: {
    count: number;
    avgGrade: number;
    avgFrequency: number;
  };
  impactBySeverity: SeverityImpact[];
  temporalPattern: TemporalPattern;
  studentsInNegativeCycle: { name: string; details: string }[];
  insights: string[];
}

export interface AreaAnalysis {
  areaName: string;
  subjects: string[];
  average: number;
  studentsEvaluated: number;
  criticalSubjects: { subject: string; belowCount: number; belowStudents: string[] }[];
  highlights: { studentName: string; average: number }[];
}

export interface ClassAnalytics {
  period: string;
  totalStudents: number;
  overallAverage: number;
  overallFrequency: number;
  trends: TrendAnalysis[];
  comparisons: AreaComparison[];
  predictions: RiskPrediction[];
  clusters: StudentCluster[];
  behaviorCorrelation: BehaviorPerformanceCorrelation;
  areaAnalyses: AreaAnalysis[];
  summaryInsights: string[];
  recommendations: string[];
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function calculateAverage(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  return grades.reduce((sum, g) => sum + g.grade, 0) / grades.length;
}

function calculateFrequency(attendance: AttendanceRecord[]): number {
  if (attendance.length === 0) return 100;
  const present = attendance.filter(a => a.status === 'presente').length;
  return (present / attendance.length) * 100;
}

function getStudentIncidentCount(studentId: string, incidents: Incident[]): number {
  return incidents.filter(i => i.studentIds.includes(studentId)).length;
}

function getStudentMaxSeverity(studentId: string, incidents: Incident[]): string | null {
  const studentIncidents = incidents.filter(i => i.studentIds.includes(studentId));
  if (studentIncidents.length === 0) return null;
  
  const severityOrder = ['gravissima', 'grave', 'intermediaria', 'leve'];
  for (const severity of severityOrder) {
    if (studentIncidents.some(i => i.finalSeverity === severity)) {
      return severity;
    }
  }
  return null;
}

// ============================================
// ANÁLISE DE TENDÊNCIAS
// ============================================

export function analyzeTrends(
  students: Student[],
  grades: Grade[],
  selectedQuarter?: string
): TrendAnalysis[] {
  const trends: TrendAnalysis[] = [];
  const quarters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
  
  // Tendências por aluno
  students.forEach(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const quarterAverages: { quarter: string; average: number }[] = [];
    
    quarters.forEach(quarter => {
      const qGrades = studentGrades.filter(g => g.quarter === quarter);
      if (qGrades.length > 0) {
        quarterAverages.push({ quarter, average: calculateAverage(qGrades) });
      }
    });
    
    if (quarterAverages.length >= 2) {
      const direction = determineTrendDirection(quarterAverages.map(q => q.average));
      const percentChange = calculatePercentChange(quarterAverages);
      
      trends.push({
        entityId: student.id,
        entityName: student.name,
        type: 'student',
        direction,
        percentChange,
        quarterGrades: quarterAverages,
        insight: generateTrendInsight(student.name, direction, percentChange)
      });
    }
  });
  
  // Tendências por área do conhecimento
  SUBJECT_AREAS.forEach(area => {
    const areaGrades = grades.filter(g => area.subjects.includes(g.subject));
    const quarterAverages: { quarter: string; average: number }[] = [];
    
    quarters.forEach(quarter => {
      const qGrades = areaGrades.filter(g => g.quarter === quarter);
      if (qGrades.length > 0) {
        quarterAverages.push({ quarter, average: calculateAverage(qGrades) });
      }
    });
    
    if (quarterAverages.length >= 2) {
      const direction = determineTrendDirection(quarterAverages.map(q => q.average));
      const percentChange = calculatePercentChange(quarterAverages);
      
      trends.push({
        entityId: area.name,
        entityName: area.name,
        type: 'area',
        direction,
        percentChange,
        quarterGrades: quarterAverages,
        insight: generateTrendInsight(area.name, direction, percentChange)
      });
    }
  });
  
  return trends;
}

function determineTrendDirection(values: number[]): TrendDirection {
  if (values.length < 2) return 'estavel';
  
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1] + 0.3) increasing++;
    else if (values[i] < values[i - 1] - 0.3) decreasing++;
  }
  
  const total = values.length - 1;
  if (increasing >= total * 0.6) return 'melhora_consistente';
  if (decreasing >= total * 0.6) return 'piora_consistente';
  if (increasing > 0 && decreasing > 0) return 'irregular';
  return 'estavel';
}

function calculatePercentChange(quarterAverages: { quarter: string; average: number }[]): number {
  if (quarterAverages.length < 2) return 0;
  const first = quarterAverages[0].average;
  const last = quarterAverages[quarterAverages.length - 1].average;
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}

function generateTrendInsight(name: string, direction: TrendDirection, percentChange: number): string {
  const change = Math.abs(percentChange).toFixed(1);
  switch (direction) {
    case 'melhora_consistente':
      return `${name} apresentou melhora consistente de ${change}%`;
    case 'piora_consistente':
      return `${name} apresentou queda de ${change}% - requer atenção`;
    case 'irregular':
      return `${name} apresentou desempenho irregular entre os bimestres`;
    default:
      return `${name} manteve desempenho estável`;
  }
}

// ============================================
// COMPARAÇÕES ENTRE ÁREAS
// ============================================

export function compareAreas(
  students: Student[],
  grades: Grade[],
  professionalSubjects: string[] = []
): AreaComparison[] {
  const comparisons: AreaComparison[] = [];
  const classAverage = calculateAverage(grades);
  
  // Adicionar área de formação profissional se houver disciplinas
  const allAreas = [...SUBJECT_AREAS];
  if (professionalSubjects.length > 0) {
    allAreas.push({
      name: 'Formação Técnica e Profissional',
      subjects: professionalSubjects,
      color: ''
    });
  }
  
  let maxAvg = -1;
  let minAvg = 11;
  let strongestArea = '';
  let weakestArea = '';
  
  // Primeiro pass: calcular médias
  const areaStats = allAreas.map(area => {
    const areaGrades = grades.filter(g => area.subjects.includes(g.subject));
    const average = calculateAverage(areaGrades);
    
    if (average > maxAvg && areaGrades.length > 0) {
      maxAvg = average;
      strongestArea = area.name;
    }
    if (average < minAvg && areaGrades.length > 0) {
      minAvg = average;
      weakestArea = area.name;
    }
    
    return { area, areaGrades, average };
  });
  
  // Segundo pass: criar comparações
  areaStats.forEach(({ area, areaGrades, average }) => {
    if (areaGrades.length === 0) return;
    
    const difference = average - classAverage;
    
    // Contar alunos acima/abaixo da média na área
    const studentAverages = new Map<string, number>();
    students.forEach(student => {
      const studentAreaGrades = areaGrades.filter(g => g.studentId === student.id);
      if (studentAreaGrades.length > 0) {
        studentAverages.set(student.id, calculateAverage(studentAreaGrades));
      }
    });
    
    const studentsBelow = Array.from(studentAverages.values()).filter(avg => avg < 6).length;
    const studentsAbove = Array.from(studentAverages.values()).filter(avg => avg >= 8).length;
    
    const isStrongest = area.name === strongestArea;
    const isWeakest = area.name === weakestArea;
    
    let insight = '';
    if (isStrongest) {
      insight = `${area.name} é a área mais forte da turma (média ${average.toFixed(1)})`;
    } else if (isWeakest) {
      insight = `${area.name} é a área que requer mais atenção (média ${average.toFixed(1)})`;
    } else if (difference > 0.5) {
      insight = `${area.name} está ${difference.toFixed(1)} pontos acima da média geral`;
    } else if (difference < -0.5) {
      insight = `${area.name} está ${Math.abs(difference).toFixed(1)} pontos abaixo da média geral`;
    } else {
      insight = `${area.name} está alinhada com a média geral da turma`;
    }
    
    comparisons.push({
      areaName: area.name,
      average,
      classAverage,
      difference,
      studentsBelow,
      studentsAbove,
      isStrongest,
      isWeakest,
      insight
    });
  });
  
  return comparisons.sort((a, b) => b.average - a.average);
}

// ============================================
// PREDIÇÕES DE RISCO
// ============================================

export function predictRisks(
  students: Student[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[]
): RiskPrediction[] {
  const predictions: RiskPrediction[] = [];
  
  students.forEach(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const studentAttendance = attendance.filter(a => a.studentId === student.id);
    const incidentCount = getStudentIncidentCount(student.id, incidents);
    
    const avg = calculateAverage(studentGrades);
    const freq = calculateFrequency(studentAttendance);
    
    // Calcular scores individuais (0-100, maior = pior)
    const gradeScore = Math.max(0, (6 - avg) * 16.67); // 0 se média >= 6, até 100 se média = 0
    const frequencyScore = Math.max(0, (75 - freq) * 4); // 0 se freq >= 75%, até 100 se freq = 0
    const incidentScore = Math.min(100, incidentCount * 25); // 25 por ocorrência, máx 100
    
    // Analisar tendência
    const quarters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    const quarterAverages = quarters.map(q => {
      const qGrades = studentGrades.filter(g => g.quarter === q);
      return qGrades.length > 0 ? calculateAverage(qGrades) : null;
    }).filter(v => v !== null) as number[];
    
    let trendScore = 0;
    if (quarterAverages.length >= 2) {
      const trend = determineTrendDirection(quarterAverages);
      if (trend === 'piora_consistente') trendScore = 50;
      else if (trend === 'irregular') trendScore = 25;
    }
    
    // Score final ponderado
    const riskScore = (gradeScore * 0.4) + (frequencyScore * 0.3) + (incidentScore * 0.2) + (trendScore * 0.1);
    
    // Determinar nível de risco
    let riskLevel: RiskLevel = 'baixo';
    if (riskScore >= 60) riskLevel = 'alto';
    else if (riskScore >= 30) riskLevel = 'moderado';
    
    // Gerar recomendações
    const recommendations: string[] = [];
    if (avg < 6) recommendations.push('Reforço escolar nas disciplinas com dificuldade');
    if (freq < 75) recommendations.push('Acompanhamento de frequência e contato com família');
    if (incidentCount >= 2) recommendations.push('Intervenção comportamental e acompanhamento psicopedagógico');
    if (trendScore > 0) recommendations.push('Monitoramento da evolução acadêmica');
    
    if (riskLevel !== 'baixo' || recommendations.length > 0) {
      predictions.push({
        studentId: student.id,
        studentName: student.name,
        riskLevel,
        riskScore,
        factors: {
          gradeScore,
          frequencyScore,
          incidentScore,
          trendScore
        },
        recommendations
      });
    }
  });
  
  return predictions.sort((a, b) => b.riskScore - a.riskScore);
}

// ============================================
// AGRUPAMENTOS (CLUSTERS)
// ============================================

export function clusterStudents(
  students: Student[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[]
): StudentCluster[] {
  const clusters: StudentCluster[] = [
    { type: 'excelencia', label: 'Excelência', students: [], count: 0, percentage: 0, characteristics: ['Média >= 8', 'Frequência >= 90%', 'Sem acompanhamentos graves'] },
    { type: 'regular', label: 'Regular', students: [], count: 0, percentage: 0, characteristics: ['Média entre 6 e 8', 'Frequência >= 75%'] },
    { type: 'atencao', label: 'Atenção', students: [], count: 0, percentage: 0, characteristics: ['Média entre 5 e 6', 'OU frequência entre 60-75%'] },
    { type: 'critico', label: 'Crítico', students: [], count: 0, percentage: 0, characteristics: ['Média < 5', 'OU frequência < 60%', 'OU múltiplos acompanhamentos graves'] }
  ];
  
  students.forEach(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const studentAttendance = attendance.filter(a => a.studentId === student.id);
    
    const avg = calculateAverage(studentGrades);
    const freq = calculateFrequency(studentAttendance);
    const incidentCount = getStudentIncidentCount(student.id, incidents);
    const maxSeverity = getStudentMaxSeverity(student.id, incidents);
    
    const hasGraveIncidents = maxSeverity === 'grave' || maxSeverity === 'gravissima';
    const hasMultipleGraveIncidents = incidents.filter(i => 
      i.studentIds.includes(student.id) && 
      (i.finalSeverity === 'grave' || i.finalSeverity === 'gravissima')
    ).length >= 2;
    
    let clusterType: ClusterType;
    
    if (avg < 5 || freq < 60 || hasMultipleGraveIncidents) {
      clusterType = 'critico';
    } else if (avg < 6 || freq < 75 || hasGraveIncidents) {
      clusterType = 'atencao';
    } else if (avg >= 8 && freq >= 90 && !hasGraveIncidents) {
      clusterType = 'excelencia';
    } else {
      clusterType = 'regular';
    }
    
    const cluster = clusters.find(c => c.type === clusterType);
    if (cluster) {
      cluster.students.push({ id: student.id, name: student.name });
      cluster.count++;
    }
  });
  
  // Calcular percentuais
  const total = students.length;
  clusters.forEach(cluster => {
    cluster.percentage = total > 0 ? (cluster.count / total) * 100 : 0;
  });
  
  return clusters;
}

// ============================================
// CORRELAÇÃO COMPORTAMENTO x DESEMPENHO
// ============================================

export function analyzeBehaviorCorrelation(
  students: Student[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[]
): BehaviorPerformanceCorrelation {
  // Separar alunos com e sem acompanhamentos
  const studentsWithIncidents: Student[] = [];
  const studentsWithoutIncidents: Student[] = [];
  
  students.forEach(student => {
    if (getStudentIncidentCount(student.id, incidents) > 0) {
      studentsWithIncidents.push(student);
    } else {
      studentsWithoutIncidents.push(student);
    }
  });
  
  // Calcular médias de cada grupo
  const withIncidentsGrades = grades.filter(g => 
    studentsWithIncidents.some(s => s.id === g.studentId)
  );
  const withoutIncidentsGrades = grades.filter(g => 
    studentsWithoutIncidents.some(s => s.id === g.studentId)
  );
  
  const withIncidentsAttendance = attendance.filter(a => 
    studentsWithIncidents.some(s => s.id === a.studentId)
  );
  const withoutIncidentsAttendance = attendance.filter(a => 
    studentsWithoutIncidents.some(s => s.id === a.studentId)
  );
  
  const avgWithIncidents = calculateAverage(withIncidentsGrades);
  const avgWithoutIncidents = calculateAverage(withoutIncidentsGrades);
  const freqWithIncidents = calculateFrequency(withIncidentsAttendance);
  const freqWithoutIncidents = calculateFrequency(withoutIncidentsAttendance);
  
  // Impacto por gravidade
  const impactBySeverity: SeverityImpact[] = [];
  const severities = ['leve', 'intermediaria', 'grave', 'gravissima'];
  
  severities.forEach(severity => {
    const studentsWithSeverity = students.filter(student => {
      const studentIncidents = incidents.filter(i => 
        i.studentIds.includes(student.id) && i.finalSeverity === severity
      );
      return studentIncidents.length > 0;
    });
    
    if (studentsWithSeverity.length > 0) {
      const severityGrades = grades.filter(g => 
        studentsWithSeverity.some(s => s.id === g.studentId)
      );
      const severityAvg = calculateAverage(severityGrades);
      const drop = avgWithoutIncidents - severityAvg;
      
      impactBySeverity.push({
        severity,
        avgGradeDrop: drop > 0 ? drop : 0,
        count: studentsWithSeverity.length,
        studentNames: studentsWithSeverity.map(s => s.name)
      });
    }
  });
  
  // Analisar padrão temporal
  const temporalPattern = analyzeTemporalPattern(students, grades, incidents);
  
  // Identificar alunos em ciclo negativo
  const studentsInNegativeCycle = identifyNegativeCycles(students, grades, incidents);
  
  // Calcular coeficiente de correlação simplificado
  const correlationCoefficient = calculateSimpleCorrelation(students, grades, incidents);
  
  // Gerar insights
  const insights: string[] = [];
  
  const gradeDiff = avgWithoutIncidents - avgWithIncidents;
  if (gradeDiff > 0.5) {
    insights.push(`Alunos com acompanhamentos têm média ${gradeDiff.toFixed(1)} pontos menor que alunos sem acompanhamentos`);
  }
  
  const graveImpact = impactBySeverity.find(i => i.severity === 'grave');
  if (graveImpact && graveImpact.avgGradeDrop > 1) {
    insights.push(`Acompanhamentos graves estão associados a queda de ${graveImpact.avgGradeDrop.toFixed(1)} pontos na média`);
  }
  
  if (temporalPattern === 'queda_precede_ocorrencia') {
    insights.push('Padrão identificado: quedas de rendimento precedem acompanhamentos - sugere intervenção acadêmica precoce');
  } else if (temporalPattern === 'ocorrencia_precede_queda') {
    insights.push('Padrão identificado: acompanhamentos precedem queda de rendimento - sugere acompanhamento pós-incidente');
  }
  
  if (studentsInNegativeCycle.length > 0) {
    insights.push(`${studentsInNegativeCycle.length} aluno(s) em ciclo negativo (baixa nota → ocorrência → queda adicional)`);
  }
  
  if (freqWithIncidents < freqWithoutIncidents - 5) {
    insights.push(`Alunos com acompanhamentos têm frequência ${(freqWithoutIncidents - freqWithIncidents).toFixed(0)}% menor`);
  }
  
  return {
    correlationCoefficient,
    withIncidents: {
      count: studentsWithIncidents.length,
      avgGrade: avgWithIncidents,
      avgFrequency: freqWithIncidents,
      studentNames: studentsWithIncidents.map(s => s.name)
    },
    withoutIncidents: {
      count: studentsWithoutIncidents.length,
      avgGrade: avgWithoutIncidents,
      avgFrequency: freqWithoutIncidents
    },
    impactBySeverity,
    temporalPattern,
    studentsInNegativeCycle,
    insights
  };
}

function analyzeTemporalPattern(
  students: Student[],
  grades: Grade[],
  incidents: Incident[]
): TemporalPattern {
  let ocorrenciaPrecedeQueda = 0;
  let quedaPrecedeOcorrencia = 0;
  
  const quarters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
  const quarterToMonth: Record<string, number> = {
    '1º Bimestre': 2,
    '2º Bimestre': 5,
    '3º Bimestre': 8,
    '4º Bimestre': 11
  };
  
  students.forEach(student => {
    const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id));
    const studentGrades = grades.filter(g => g.studentId === student.id);
    
    if (studentIncidents.length === 0 || studentGrades.length === 0) return;
    
    // Calcular média por bimestre
    const quarterAverages: { quarter: string; average: number }[] = [];
    quarters.forEach(quarter => {
      const qGrades = studentGrades.filter(g => g.quarter === quarter);
      if (qGrades.length > 0) {
        quarterAverages.push({ quarter, average: calculateAverage(qGrades) });
      }
    });
    
    // Para cada ocorrência, verificar se houve queda antes ou depois
    studentIncidents.forEach(incident => {
      const incidentMonth = new Date(incident.date).getMonth();
      
      // Encontrar bimestre da ocorrência e o anterior
      let currentQuarter = '';
      let previousQuarter = '';
      let nextQuarter = '';
      
      for (let i = 0; i < quarters.length; i++) {
        if (quarterToMonth[quarters[i]] >= incidentMonth) {
          currentQuarter = quarters[i];
          previousQuarter = i > 0 ? quarters[i - 1] : '';
          nextQuarter = i < quarters.length - 1 ? quarters[i + 1] : '';
          break;
        }
      }
      
      const currentAvg = quarterAverages.find(q => q.quarter === currentQuarter)?.average;
      const previousAvg = quarterAverages.find(q => q.quarter === previousQuarter)?.average;
      const nextAvg = quarterAverages.find(q => q.quarter === nextQuarter)?.average;
      
      if (previousAvg !== undefined && currentAvg !== undefined && currentAvg < previousAvg - 0.5) {
        quedaPrecedeOcorrencia++;
      }
      
      if (currentAvg !== undefined && nextAvg !== undefined && nextAvg < currentAvg - 0.5) {
        ocorrenciaPrecedeQueda++;
      }
    });
  });
  
  const total = ocorrenciaPrecedeQueda + quedaPrecedeOcorrencia;
  if (total === 0) return 'sem_padrao';
  
  const pctQuedaPrecede = (quedaPrecedeOcorrencia / total) * 100;
  const pctOcorrenciaPrecede = (ocorrenciaPrecedeQueda / total) * 100;
  
  if (pctQuedaPrecede >= 60) return 'queda_precede_ocorrencia';
  if (pctOcorrenciaPrecede >= 60) return 'ocorrencia_precede_queda';
  return 'sem_padrao';
}

function identifyNegativeCycles(
  students: Student[],
  grades: Grade[],
  incidents: Incident[]
): { name: string; details: string }[] {
  const result: { name: string; details: string }[] = [];
  
  students.forEach(student => {
    const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id));
    
    if (studentIncidents.length < 2) return;
    
    // Verificar se houve quedas consecutivas após acompanhamentos
    const quarters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    const studentGrades = grades.filter(g => g.studentId === student.id);
    
    const quarterAverages = quarters.map(quarter => {
      const qGrades = studentGrades.filter(g => g.quarter === quarter);
      return qGrades.length > 0 ? calculateAverage(qGrades) : null;
    });
    
    let consecutiveDrops = 0;
    for (let i = 1; i < quarterAverages.length; i++) {
      if (quarterAverages[i] !== null && quarterAverages[i - 1] !== null) {
        if (quarterAverages[i]! < quarterAverages[i - 1]! - 0.5) {
          consecutiveDrops++;
        }
      }
    }
    
    if (consecutiveDrops >= 2 && studentIncidents.length >= 2) {
      result.push({
        name: student.name,
        details: `${studentIncidents.length} acompanhamentos e ${consecutiveDrops} quedas consecutivas de notas`
      });
    }
  });
  
  return result;
}

function calculateSimpleCorrelation(
  students: Student[],
  grades: Grade[],
  incidents: Incident[]
): number {
  // Correlação simplificada: -1 (mais acompanhamentos = menos notas) a 1
  const data = students.map(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const incidentCount = getStudentIncidentCount(student.id, incidents);
    return {
      incidents: incidentCount,
      average: calculateAverage(studentGrades)
    };
  }).filter(d => d.average > 0);
  
  if (data.length < 3) return 0;
  
  const n = data.length;
  const sumX = data.reduce((s, d) => s + d.incidents, 0);
  const sumY = data.reduce((s, d) => s + d.average, 0);
  const sumXY = data.reduce((s, d) => s + d.incidents * d.average, 0);
  const sumX2 = data.reduce((s, d) => s + d.incidents * d.incidents, 0);
  const sumY2 = data.reduce((s, d) => s + d.average * d.average, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ============================================
// ANÁLISE POR ÁREA DO CONHECIMENTO
// ============================================

export function analyzeAreas(
  students: Student[],
  grades: Grade[],
  professionalSubjects: string[] = [],
  selectedQuarter?: string
): AreaAnalysis[] {
  const analyses: AreaAnalysis[] = [];
  
  // Adicionar área de formação profissional
  const allAreas = [...SUBJECT_AREAS];
  if (professionalSubjects.length > 0) {
    allAreas.push({
      name: 'Formação Técnica e Profissional',
      subjects: professionalSubjects,
      color: ''
    });
  }
  
  // Filtrar por bimestre se especificado
  let filteredGrades = grades;
  if (selectedQuarter && selectedQuarter !== 'anual') {
    filteredGrades = grades.filter(g => g.quarter === selectedQuarter);
  }
  
  allAreas.forEach(area => {
    const areaGrades = filteredGrades.filter(g => area.subjects.includes(g.subject));
    if (areaGrades.length === 0) return;
    
    // Encontrar disciplinas existentes nos dados
    const existingSubjects = [...new Set(areaGrades.map(g => g.subject))];
    
    const average = calculateAverage(areaGrades);
    
    // Contar alunos avaliados
    const studentsEvaluated = new Set(areaGrades.map(g => g.studentId)).size;
    
    // Disciplinas críticas (> 30% abaixo da média)
    const criticalSubjects: { subject: string; belowCount: number; belowStudents: string[] }[] = [];
    
    existingSubjects.forEach(subject => {
      const subjectGrades = areaGrades.filter(g => g.subject === subject);
      const studentAverages = new Map<string, number>();
      
      students.forEach(student => {
        const sGrades = subjectGrades.filter(g => g.studentId === student.id);
        if (sGrades.length > 0) {
          studentAverages.set(student.id, calculateAverage(sGrades));
        }
      });
      
      const belowStudents = students.filter(s => {
        const avg = studentAverages.get(s.id);
        return avg !== undefined && avg < 6;
      });
      
      const belowPercentage = studentAverages.size > 0 ? (belowStudents.length / studentAverages.size) * 100 : 0;
      
      if (belowPercentage >= 30) {
        criticalSubjects.push({
          subject,
          belowCount: belowStudents.length,
          belowStudents: belowStudents.map(s => s.name)
        });
      }
    });
    
    // Destaques (média >= 8)
    const highlights: { studentName: string; average: number }[] = [];
    
    students.forEach(student => {
      const studentAreaGrades = areaGrades.filter(g => g.studentId === student.id);
      if (studentAreaGrades.length > 0) {
        const studentAvg = calculateAverage(studentAreaGrades);
        if (studentAvg >= 8) {
          highlights.push({ studentName: student.name, average: studentAvg });
        }
      }
    });
    
    highlights.sort((a, b) => b.average - a.average);
    
    analyses.push({
      areaName: area.name,
      subjects: existingSubjects,
      average,
      studentsEvaluated,
      criticalSubjects: criticalSubjects.sort((a, b) => b.belowCount - a.belowCount),
      highlights: highlights.slice(0, 5) // Top 5
    });
  });
  
  return analyses;
}

// ============================================
// ANÁLISE COMPLETA DA TURMA
// ============================================

export function generateClassAnalytics(
  students: Student[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[],
  professionalSubjects: string[] = [],
  selectedQuarter?: string
): ClassAnalytics {
  const period = selectedQuarter === 'anual' || !selectedQuarter ? 'Ano Completo' : selectedQuarter;
  
  // Filtrar dados por período
  let filteredGrades = grades;
  if (selectedQuarter && selectedQuarter !== 'anual') {
    filteredGrades = grades.filter(g => g.quarter === selectedQuarter);
  }
  
  const overallAverage = calculateAverage(filteredGrades);
  const overallFrequency = calculateFrequency(attendance);
  
  const trends = analyzeTrends(students, grades, selectedQuarter);
  const comparisons = compareAreas(students, filteredGrades, professionalSubjects);
  const predictions = predictRisks(students, filteredGrades, attendance, incidents);
  const clusters = clusterStudents(students, filteredGrades, attendance, incidents);
  const behaviorCorrelation = analyzeBehaviorCorrelation(students, filteredGrades, attendance, incidents);
  const areaAnalyses = analyzeAreas(students, grades, professionalSubjects, selectedQuarter);
  
  // Gerar insights resumidos
  const summaryInsights: string[] = [];
  
  // Insight sobre área mais forte/fraca
  const strongestArea = comparisons.find(c => c.isStrongest);
  const weakestArea = comparisons.find(c => c.isWeakest);
  
  if (strongestArea && weakestArea && strongestArea.areaName !== weakestArea.areaName) {
    const diff = strongestArea.average - weakestArea.average;
    if (diff > 1) {
      summaryInsights.push(`Diferença de ${diff.toFixed(1)} pontos entre a área mais forte (${strongestArea.areaName}) e mais fraca (${weakestArea.areaName})`);
    }
  }
  
  // Insight sobre clusters
  const criticoCluster = clusters.find(c => c.type === 'critico');
  const excelenciaCluster = clusters.find(c => c.type === 'excelencia');
  
  if (criticoCluster && criticoCluster.count > 0) {
    summaryInsights.push(`${criticoCluster.count} aluno(s) (${criticoCluster.percentage.toFixed(0)}%) em situação crítica requer intervenção imediata`);
  }
  
  if (excelenciaCluster && excelenciaCluster.percentage >= 20) {
    summaryInsights.push(`${excelenciaCluster.percentage.toFixed(0)}% da turma está no grupo de excelência - potencial para tutoria entre pares`);
  }
  
  // Insight sobre comportamento
  if (behaviorCorrelation.insights.length > 0) {
    summaryInsights.push(...behaviorCorrelation.insights.slice(0, 2));
  }
  
  // Gerar recomendações
  const recommendations: string[] = [];
  
  if (weakestArea && weakestArea.studentsBelow > students.length * 0.3) {
    recommendations.push(`Reforço em ${weakestArea.areaName} para ${Math.round((weakestArea.studentsBelow / students.length) * 100)}% da turma`);
  }
  
  const highRiskStudents = predictions.filter(p => p.riskLevel === 'alto');
  if (highRiskStudents.length > 0) {
    recommendations.push(`Acompanhamento individualizado para ${highRiskStudents.length} aluno(s) em alto risco`);
  }
  
  if (behaviorCorrelation.studentsInNegativeCycle.length > 0) {
    recommendations.push('Intervenção psicopedagógica para alunos em ciclo negativo comportamento-desempenho');
  }
  
  if (overallFrequency < 80) {
    recommendations.push('Campanha de conscientização sobre frequência e contato com famílias');
  }
  
  return {
    period,
    totalStudents: students.length,
    overallAverage,
    overallFrequency,
    trends,
    comparisons,
    predictions,
    clusters,
    behaviorCorrelation,
    areaAnalyses,
    summaryInsights,
    recommendations
  };
}
