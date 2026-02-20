/**
 * Sistema de Analytics Avançado
 * 
 * Análises profundas de correlação entre:
 * - Disciplinas
 * - Áreas do conhecimento
 * - Comportamento e desempenho
 * - Padrões temporais
 */

import { Student, Grade, Incident, AttendanceRecord } from '@/types';
import { SUBJECT_AREAS, getSubjectArea } from './subjects';
import {
  pearsonCorrelation,
  correlationMatrix,
  linearRegression,
  multivariateRegression,
  kMeansClustering,
  findOptimalClusters,
  detectAnomalies,
  analyzeTrend,
  CorrelationResult,
  TrendAnalysisResult,
  ClusterResult,
} from './mlAnalytics';

// ============================================
// TIPOS
// ============================================

export interface SubjectCorrelation {
  subject1: string;
  subject2: string;
  correlation: CorrelationResult;
  insight: string;
  affectedStudents: number;
}

export interface AreaInfluence {
  sourceArea: string;
  targetArea: string;
  influence: number;
  direction: 'positiva' | 'negativa';
  insight: string;
}

export interface GatewaySubject {
  subject: string;
  influenceScore: number;
  dependentSubjects: string[];
  insight: string;
  recommendation: string;
}

export interface BehaviorImpact {
  incidentType: string;
  averageGradeDrop: number;
  recoveryTime: number; // bimestres
  affectedStudents: string[];
  insight: string;
}

// ============================================
// CLASSIFICAÇÃO DE ALUNOS - SISTEMA PADRONIZADO
// ============================================

export type StudentClassification = 'critico' | 'atencao' | 'aprovado' | 'excelencia';

export interface SubjectGradeInfo {
  subject: string;
  average: number;
}

export interface ClassificationResult {
  classification: StudentClassification;
  subjectsBelow6: SubjectGradeInfo[];
  subjectsBelow6Count: number;
  subjectAverages: Record<string, number>;
  average: number;
  frequency: number;
}

/**
 * Classifica um aluno de acordo com os critérios padronizados:
 * - Crítico (Vermelho): 3+ disciplinas com nota < 6.0
 * - Atenção (Amarelo): 1-2 disciplinas com nota < 6.0
 * - Aprovado (Verde): Todas disciplinas >= 6.0, média geral < 8.0
 * - Excelência (Azul): Todas disciplinas >= 6.0 E média geral >= 8.0
 */
export function classifyStudent(
  grades: Grade[],
  attendance: AttendanceRecord[]
): ClassificationResult {
  // Calcular média por disciplina
  const subjectGradesRaw: Record<string, number[]> = {};
  grades.forEach(g => {
    if (!subjectGradesRaw[g.subject]) subjectGradesRaw[g.subject] = [];
    subjectGradesRaw[g.subject].push(g.grade);
  });
  
  // Calcular médias por disciplina
  const subjectAverages: Record<string, number> = {};
  Object.entries(subjectGradesRaw).forEach(([subject, gradeList]) => {
    subjectAverages[subject] = gradeList.reduce((a, b) => a + b, 0) / gradeList.length;
  });
  
  // Identificar disciplinas abaixo de 6 (com suas médias)
  const subjectsBelow6: SubjectGradeInfo[] = [];
  Object.entries(subjectAverages).forEach(([subject, avg]) => {
    if (avg < 6) {
      subjectsBelow6.push({ subject, average: avg });
    }
  });
  
  // Ordenar por média (menor primeiro)
  subjectsBelow6.sort((a, b) => a.average - b.average);
  
  // Calcular média geral
  const allGrades = grades.map(g => g.grade);
  const average = allGrades.length > 0 
    ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length 
    : 0;
  
  // Calcular frequência
  const present = attendance.filter(a => a.status === 'presente').length;
  const frequency = attendance.length > 0 ? (present / attendance.length) * 100 : 100;
  
  // Aplicar critérios de classificação
  let classification: StudentClassification;
  
  if (subjectsBelow6.length >= 3) {
    classification = 'critico';
  } else if (subjectsBelow6.length >= 1) {
    classification = 'atencao';
  } else if (average >= 8) {
    classification = 'excelencia';
  } else {
    classification = 'aprovado';
  }
  
  return {
    classification,
    subjectsBelow6,
    subjectsBelow6Count: subjectsBelow6.length,
    subjectAverages,
    average,
    frequency,
  };
}

export const CLASSIFICATION_LABELS: Record<StudentClassification, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  aprovado: 'Aprovado',
  excelencia: 'Excelência',
};

export const CLASSIFICATION_COLORS: Record<StudentClassification, string> = {
  critico: '#DC2626',    // Vermelho
  atencao: '#F59E0B',    // Amarelo
  aprovado: '#10B981',   // Verde
  excelencia: '#2563EB', // Azul
};

export interface StudentProfile {
  studentId: string;
  studentName: string;
  classification: StudentClassification;
  cluster: string;
  riskScore: number;
  average: number;
  frequency: number;
  subjectsBelow6: SubjectGradeInfo[];
  subjectAverages: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  trend: TrendAnalysisResult;
  anomalies: { subject: string; type: string }[];
  recommendation: string;
  urgency: 'baixa' | 'media' | 'alta' | 'critica';
}

export interface TemporalPattern {
  quarter: string;
  classAverage: number;
  trend: 'melhora' | 'piora' | 'estavel';
  criticalSubjects: string[];
  insight: string;
}

export interface AdvancedAnalyticsResult {
  // Correlações entre disciplinas
  subjectCorrelations: SubjectCorrelation[];
  correlationMatrix: { matrix: number[][]; labels: string[] };
  gatewaySubjects: GatewaySubject[];
  
  // Influência entre áreas
  areaInfluences: AreaInfluence[];
  strongestArea: string;
  weakestArea: string;
  
  // Impacto comportamental
  behaviorImpact: BehaviorImpact[];
  behaviorPatterns: string[];
  
  // Perfis de alunos
  studentProfiles: StudentProfile[];
  clusters: { name: string; students: string[]; characteristics: string[] }[];
  
  // Padrões temporais
  temporalPatterns: TemporalPattern[];
  classTrajectory: TrendAnalysisResult;
  
  // Alertas e recomendações
  criticalAlerts: string[];
  opportunities: string[];
  recommendations: { category: string; action: string; priority: 'alta' | 'media' | 'baixa'; target: string }[];
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function getStudentGradesBySubject(
  studentId: string,
  grades: Grade[]
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  grades
    .filter(g => g.studentId === studentId)
    .forEach(g => {
      if (!result[g.subject]) result[g.subject] = [];
      result[g.subject].push(g.grade);
    });
  return result;
}

function getSubjectAverages(grades: Grade[]): Record<string, number> {
  const bySubject: Record<string, number[]> = {};
  grades.forEach(g => {
    if (!bySubject[g.subject]) bySubject[g.subject] = [];
    bySubject[g.subject].push(g.grade);
  });
  
  const result: Record<string, number> = {};
  Object.entries(bySubject).forEach(([subject, gradeList]) => {
    result[subject] = mean(gradeList);
  });
  return result;
}

function getQuarterAverages(
  grades: Grade[],
  quarters: string[]
): { quarter: string; average: number }[] {
  return quarters.map(quarter => {
    const quarterGrades = grades.filter(g => g.quarter === quarter);
    return {
      quarter,
      average: quarterGrades.length > 0 ? mean(quarterGrades.map(g => g.grade)) : 0,
    };
  });
}

// ============================================
// ANÁLISE DE CORRELAÇÃO ENTRE DISCIPLINAS
// ============================================

export function analyzeSubjectCorrelations(
  students: Student[],
  grades: Grade[]
): { correlations: SubjectCorrelation[]; matrix: { matrix: number[][]; labels: string[] }; gateways: GatewaySubject[] } {
  // Obter todas as disciplinas
  const subjects = [...new Set(grades.map(g => g.subject))].sort();
  
  if (subjects.length < 2) {
    return {
      correlations: [],
      matrix: { matrix: [], labels: [] },
      gateways: [],
    };
  }
  
  // Construir matriz de notas por aluno e disciplina
  const studentSubjectAverages: Record<string, Record<string, number>> = {};
  
  students.forEach(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const bySubject: Record<string, number[]> = {};
    
    studentGrades.forEach(g => {
      if (!bySubject[g.subject]) bySubject[g.subject] = [];
      bySubject[g.subject].push(g.grade);
    });
    
    studentSubjectAverages[student.id] = {};
    Object.entries(bySubject).forEach(([subject, gradeList]) => {
      studentSubjectAverages[student.id][subject] = mean(gradeList);
    });
  });
  
  // Construir arrays de notas por disciplina
  const subjectData: number[][] = subjects.map(subject => 
    students.map(s => studentSubjectAverages[s.id]?.[subject] ?? NaN).filter(v => !isNaN(v))
  );
  
  // Calcular matriz de correlação
  const { matrix, significant } = correlationMatrix(subjectData, subjects);
  
  // Converter correlações significativas em insights
  const correlations: SubjectCorrelation[] = significant.map(([subj1, subj2, coef]) => {
    const affectedCount = students.filter(s => 
      studentSubjectAverages[s.id]?.[subj1] !== undefined && 
      studentSubjectAverages[s.id]?.[subj2] !== undefined
    ).length;
    
    let insight: string;
    if (coef > 0.7) {
      insight = `Forte correlação positiva: alunos com bom desempenho em ${subj1} tendem a ir bem em ${subj2}. Considere trabalho interdisciplinar.`;
    } else if (coef > 0.5) {
      insight = `Correlação moderada: ${subj1} e ${subj2} compartilham padrões de desempenho. Atenção conjunta pode ser efetiva.`;
    } else if (coef < -0.5) {
      insight = `Correlação negativa: alunos focados em ${subj1} podem estar negligenciando ${subj2}. Avaliar distribuição de esforço.`;
    } else {
      insight = `Correlação fraca entre ${subj1} e ${subj2}.`;
    }
    
    return {
      subject1: subj1,
      subject2: subj2,
      correlation: pearsonCorrelation(
        students.map(s => studentSubjectAverages[s.id]?.[subj1] ?? 0),
        students.map(s => studentSubjectAverages[s.id]?.[subj2] ?? 0)
      ),
      insight,
      affectedStudents: affectedCount,
    };
  });
  
  // Identificar disciplinas gateway
  const influenceScores: Record<string, { score: number; dependents: string[] }> = {};
  subjects.forEach(subj => {
    influenceScores[subj] = { score: 0, dependents: [] };
  });
  
  correlations.forEach(corr => {
    if (corr.correlation.coefficient > 0.5) {
      // A disciplina com média mais alta é possivelmente gateway
      const avg1 = mean(students.map(s => studentSubjectAverages[s.id]?.[corr.subject1] ?? 0));
      const avg2 = mean(students.map(s => studentSubjectAverages[s.id]?.[corr.subject2] ?? 0));
      
      if (avg1 < avg2) {
        // subject1 pode ser prerequisito de subject2
        influenceScores[corr.subject1].score += corr.correlation.coefficient;
        influenceScores[corr.subject1].dependents.push(corr.subject2);
      } else {
        influenceScores[corr.subject2].score += corr.correlation.coefficient;
        influenceScores[corr.subject2].dependents.push(corr.subject1);
      }
    }
  });
  
  const gateways: GatewaySubject[] = Object.entries(influenceScores)
    .filter(([_, data]) => data.score > 0.5 && data.dependents.length > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([subject, data]) => {
      const avgGrade = mean(students.map(s => studentSubjectAverages[s.id]?.[subject] ?? 0));
      
      return {
        subject,
        influenceScore: data.score,
        dependentSubjects: data.dependents,
        insight: `${subject} é uma disciplina base que influencia ${data.dependents.join(', ')}. Média atual: ${avgGrade.toFixed(1)}.`,
        recommendation: avgGrade < 6 
          ? `PRIORITÁRIO: Reforço em ${subject} pode melhorar desempenho em ${data.dependents.length} outra(s) disciplina(s).`
          : `Manter atenção em ${subject} para sustentar desempenho nas disciplinas dependentes.`,
      };
    });
  
  return {
    correlations,
    matrix: { matrix, labels: subjects },
    gateways,
  };
}

// ============================================
// ANÁLISE DE INFLUÊNCIA ENTRE ÁREAS
// ============================================

export function analyzeAreaInfluences(
  students: Student[],
  grades: Grade[],
  professionalSubjects: string[] = []
): { influences: AreaInfluence[]; strongest: string; weakest: string } {
  // Calcular média por área para cada aluno
  const allAreas = [...SUBJECT_AREAS];
  if (professionalSubjects.length > 0) {
    allAreas.push({
      name: 'Formação Técnica e Profissional',
      subjects: professionalSubjects,
      color: '',
    });
  }
  
  const studentAreaAverages: Record<string, Record<string, number>> = {};
  
  students.forEach(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    studentAreaAverages[student.id] = {};
    
    allAreas.forEach(area => {
      const areaGrades = studentGrades.filter(g => area.subjects.includes(g.subject));
      if (areaGrades.length > 0) {
        studentAreaAverages[student.id][area.name] = mean(areaGrades.map(g => g.grade));
      }
    });
  });
  
  // Calcular correlações entre áreas
  const areaNames = allAreas.map(a => a.name);
  const influences: AreaInfluence[] = [];
  
  for (let i = 0; i < areaNames.length; i++) {
    for (let j = i + 1; j < areaNames.length; j++) {
      const area1 = areaNames[i];
      const area2 = areaNames[j];
      
      const data1 = students.map(s => studentAreaAverages[s.id]?.[area1]).filter(v => v !== undefined) as number[];
      const data2 = students.map(s => studentAreaAverages[s.id]?.[area2]).filter(v => v !== undefined) as number[];
      
      if (data1.length >= 5 && data2.length >= 5) {
        const corr = pearsonCorrelation(data1, data2);
        
        if (corr.strength !== 'insignificante') {
          const avg1 = mean(data1);
          const avg2 = mean(data2);
          
          let insight: string;
          if (corr.coefficient > 0.5) {
            insight = `Forte sinergia entre ${area1} e ${area2}. Melhorias em uma área tendem a refletir na outra.`;
          } else if (corr.coefficient > 0.3) {
            insight = `Correlação moderada entre ${area1} e ${area2}. Abordagens interdisciplinares podem ser efetivas.`;
          } else if (corr.coefficient < -0.3) {
            insight = `Possível competição por tempo/esforço entre ${area1} e ${area2}. Avaliar equilíbrio de estudo.`;
          } else {
            insight = `Relação fraca entre as áreas.`;
          }
          
          influences.push({
            sourceArea: avg1 < avg2 ? area1 : area2,
            targetArea: avg1 < avg2 ? area2 : area1,
            influence: Math.abs(corr.coefficient),
            direction: corr.direction === 'positiva' ? 'positiva' : 'negativa',
            insight,
          });
        }
      }
    }
  }
  
  // Identificar área mais forte e mais fraca
  const areaAverages: Record<string, number> = {};
  areaNames.forEach(area => {
    const data = students.map(s => studentAreaAverages[s.id]?.[area]).filter(v => v !== undefined) as number[];
    areaAverages[area] = data.length > 0 ? mean(data) : 0;
  });
  
  const sortedAreas = Object.entries(areaAverages).sort((a, b) => b[1] - a[1]);
  
  return {
    influences: influences.sort((a, b) => b.influence - a.influence),
    strongest: sortedAreas[0]?.[0] || '',
    weakest: sortedAreas[sortedAreas.length - 1]?.[0] || '',
  };
}

// ============================================
// ANÁLISE DE IMPACTO COMPORTAMENTAL
// ============================================

export function analyzeBehaviorImpact(
  students: Student[],
  grades: Grade[],
  incidents: Incident[],
  quarters: string[]
): { impacts: BehaviorImpact[]; patterns: string[] } {
  const impacts: BehaviorImpact[] = [];
  const patterns: string[] = [];
  
  // Agrupar incidentes por gravidade
  const severityGroups: Record<string, Incident[]> = {
    leve: [],
    intermediaria: [],
    grave: [],
    gravissima: [],
  };
  
  incidents.forEach(incident => {
    if (severityGroups[incident.finalSeverity]) {
      severityGroups[incident.finalSeverity].push(incident);
    }
  });
  
  // Analisar impacto por gravidade
  Object.entries(severityGroups).forEach(([severity, incidentList]) => {
    if (incidentList.length === 0) return;
    
    const affectedStudentIds = new Set<string>();
    incidentList.forEach(i => i.studentIds.forEach(id => affectedStudentIds.add(id)));
    
    const affectedStudents = students.filter(s => affectedStudentIds.has(s.id));
    const unaffectedStudents = students.filter(s => !affectedStudentIds.has(s.id));
    
    if (affectedStudents.length === 0 || unaffectedStudents.length === 0) return;
    
    // Calcular média de notas antes e depois dos incidentes
    const affectedAvg = mean(
      grades
        .filter(g => affectedStudentIds.has(g.studentId))
        .map(g => g.grade)
    );
    
    const unaffectedAvg = mean(
      grades
        .filter(g => !affectedStudentIds.has(g.studentId))
        .map(g => g.grade)
    );
    
    const gradeDrop = unaffectedAvg - affectedAvg;
    
    if (gradeDrop > 0.2) {
      const severityLabel = {
        leve: 'Leve',
        intermediaria: 'Intermediária',
        grave: 'Grave',
        gravissima: 'Gravíssima',
      }[severity];
      
      impacts.push({
        incidentType: `Ocorrência ${severityLabel}`,
        averageGradeDrop: gradeDrop,
        recoveryTime: severity === 'leve' ? 1 : severity === 'intermediaria' ? 2 : 3,
        affectedStudents: affectedStudents.map(s => s.name),
        insight: `Acompanhamentos ${severityLabel.toLowerCase()}s associados a queda média de ${gradeDrop.toFixed(1)} ponto(s) nas notas.`,
      });
    }
  });
  
  // Identificar padrões comportamentais
  const studentsWithMultipleIncidents = students.filter(s => {
    const count = incidents.filter(i => i.studentIds.includes(s.id)).length;
    return count >= 2;
  });
  
  if (studentsWithMultipleIncidents.length > 0) {
    patterns.push(
      `${studentsWithMultipleIncidents.length} aluno(s) com acompanhamentos recorrentes. ` +
      `Intervenção comportamental sistemática recomendada.`
    );
  }
  
  // Analisar se queda de notas precede ou sucede acompanhamentos
  let dropPrecedesIncident = 0;
  let incidentPrecedesDrop = 0;
  
  incidents.forEach(incident => {
    const incidentQuarter = quarters.find(q => {
      const incidentDate = new Date(incident.date);
      // Simplificação: assumir que bimestres são trimestrais
      return true; // Implementar lógica de mapeamento de data para bimestre
    });
    
    incident.studentIds.forEach(studentId => {
      const studentGrades = grades.filter(g => g.studentId === studentId);
      const beforeGrades = studentGrades.filter(g => {
        const idx = quarters.indexOf(g.quarter);
        const incidentIdx = quarters.indexOf(incidentQuarter || '');
        return idx < incidentIdx;
      });
      const afterGrades = studentGrades.filter(g => {
        const idx = quarters.indexOf(g.quarter);
        const incidentIdx = quarters.indexOf(incidentQuarter || '');
        return idx >= incidentIdx;
      });
      
      const beforeAvg = beforeGrades.length > 0 ? mean(beforeGrades.map(g => g.grade)) : 0;
      const afterAvg = afterGrades.length > 0 ? mean(afterGrades.map(g => g.grade)) : 0;
      
      if (beforeAvg > 0 && afterAvg > 0) {
        if (beforeAvg < afterAvg - 0.5) dropPrecedesIncident++;
        if (afterAvg < beforeAvg - 0.5) incidentPrecedesDrop++;
      }
    });
  });
  
  if (dropPrecedesIncident + incidentPrecedesDrop > 0) {
    if (dropPrecedesIncident > incidentPrecedesDrop) {
      patterns.push(
        'Padrão identificado: queda de desempenho tende a PRECEDER acompanhamentos disciplinares. ' +
        'Monitorar notas como indicador de risco comportamental.'
      );
    } else {
      patterns.push(
        'Padrão identificado: acompanhamentos tendem a PRECEDER queda de desempenho. ' +
        'Acompanhamento acadêmico pós-ocorrência é crítico.'
      );
    }
  }
  
  return { impacts, patterns };
}

// ============================================
// PERFIS DE ALUNOS E CLUSTERING
// ============================================

export function analyzeStudentProfiles(
  students: Student[],
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  quarters: string[]
): { profiles: StudentProfile[]; clusters: { name: string; students: string[]; characteristics: string[] }[] } {
  const profiles: StudentProfile[] = [];
  
  // Preparar dados para clustering
  const clusterData: number[][] = [];
  const studentMapping: Student[] = [];
  
  students.forEach(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const studentAttendance = attendance.filter(a => a.studentId === student.id);
    const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id));
    
    if (studentGrades.length > 0) {
      const avgGrade = mean(studentGrades.map(g => g.grade));
      const frequency = studentAttendance.length > 0
        ? (studentAttendance.filter(a => a.status === 'presente').length / studentAttendance.length) * 100
        : 100;
      const incidentCount = studentIncidents.length;
      const subjectsBelow6 = new Set(
        studentGrades.filter(g => g.grade < 6).map(g => g.subject)
      ).size;
      
      // Normalizar dados para clustering (0-1)
      clusterData.push([
        avgGrade / 10,
        frequency / 100,
        Math.min(incidentCount / 5, 1), // Normalizar incidentes
        Math.min(subjectsBelow6 / 10, 1), // Normalizar disciplinas abaixo
      ]);
      studentMapping.push(student);
    }
  });
  
  let clusterResults: ClusterResult[] = [];
  const clusterNames: Record<number, string> = {};
  const clusterChars: Record<number, string[]> = {};
  const studentClusterMap = new Map<string, number>();

  if (clusterData.length > 0) {
    const optimalK = findOptimalClusters(clusterData, 4);
    clusterResults = kMeansClustering(clusterData, optimalK);
    
    // Nomear clusters baseado nas características
    clusterResults.forEach(cluster => {
      const centroid = cluster.centroid;
      const avgGrade = centroid[0] * 10;
      const avgFreq = centroid[1] * 100;
      const avgIncidents = centroid[2] * 5;
      const avgBelow = centroid[3] * 10;
      
      let name: string;
      let chars: string[] = [];
      
      if (avgGrade >= 7.5 && avgFreq >= 90 && avgIncidents < 0.5) {
        name = 'Excelência';
        chars = ['Alto desempenho', 'Boa frequência', 'Sem acompanhamentos'];
      } else if (avgGrade >= 6 && avgBelow <= 2) {
        name = 'Regular';
        chars = ['Desempenho satisfatório', 'Poucas dificuldades'];
      } else if (avgGrade < 6 || avgBelow >= 3) {
        name = 'Atenção Necessária';
        chars = ['Desempenho abaixo do esperado', 'Múltiplas disciplinas em risco'];
      } else {
        name = 'Acompanhamento';
        chars = ['Desempenho intermediário', 'Potencial de melhoria'];
      }
      
      clusterNames[cluster.clusterId] = name;
      clusterChars[cluster.clusterId] = chars;
    });

    clusterResults.forEach(cluster => {
      cluster.members.forEach((idx) => {
        const student = studentMapping[idx];
        if (student) {
          studentClusterMap.set(student.id, cluster.clusterId);
        }
      });
    });
  }
  
  // Criar perfis individuais
  students.forEach((student) => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const studentAttendance = attendance.filter(a => a.studentId === student.id);
    const studentIncidents = incidents.filter(i => i.studentIds.includes(student.id));
    const hasGrades = studentGrades.length > 0;
    
    // Usar função centralizada de classificação
    const classificationResult = classifyStudent(studentGrades, studentAttendance);
    
    // Identificar cluster do aluno
    const studentCluster = studentClusterMap.get(student.id);
    
    // Calcular tendência
    const quarterAverages = quarters.map(quarter => {
      const qGrades = studentGrades.filter(g => g.quarter === quarter);
      return qGrades.length > 0 ? mean(qGrades.map(g => g.grade)) : 0;
    }).filter(v => v > 0);
    
    const trend = analyzeTrend(quarterAverages);
    
    // Identificar pontos fortes e fracos
    const subjectAverages: Record<string, number> = {};
    studentGrades.forEach(g => {
      if (!subjectAverages[g.subject]) {
        const sGrades = studentGrades.filter(sg => sg.subject === g.subject);
        subjectAverages[g.subject] = mean(sGrades.map(sg => sg.grade));
      }
    });
    
    const sortedSubjects = Object.entries(subjectAverages).sort((a, b) => b[1] - a[1]);
    const strengths = sortedSubjects.filter(([_, avg]) => avg >= 7).slice(0, 5).map(([s]) => s);
    const weaknesses = sortedSubjects.filter(([_, avg]) => avg < 6).map(([s]) => s);
    
    // Detectar anomalias
    const gradeValues = studentGrades.map(g => g.grade);
    const anomalies = detectAnomalies(gradeValues, 1.5);
    const anomalySubjects = anomalies.map(a => {
      const grade = studentGrades[a.index];
      return {
        subject: grade?.subject || '',
        type: a.value < mean(gradeValues) ? 'queda_brusca' : 'pico',
      };
    });
    
    // Calcular score de risco baseado na classificação
    const incidentCount = studentIncidents.length;
    
    let riskScore = 0;
    if (classificationResult.classification === 'critico') riskScore += 50;
    else if (classificationResult.classification === 'atencao') riskScore += 25;
    
    if (classificationResult.frequency < 75) riskScore += 30;
    else if (classificationResult.frequency < 85) riskScore += 15;
    
    if (incidentCount >= 3) riskScore += 15;
    else if (incidentCount >= 1) riskScore += 5;
    
    if (trend.direction === 'decrescente') riskScore += 15;
    
    // Determinar urgência baseada na classificação
    let urgency: StudentProfile['urgency'];
    if (classificationResult.classification === 'critico') {
      urgency = 'critica';
    } else if (classificationResult.classification === 'atencao') {
      urgency = 'alta';
    } else if (riskScore >= 30) {
      urgency = 'media';
    } else {
      urgency = 'baixa';
    }
    
    // Gerar recomendação clara e objetiva baseada na classificação
    let recommendation: string;
    if (!hasGrades) {
      recommendation = 'Dados insuficientes: aguardar lançamento de notas para análise completa.';
    } else if (classificationResult.classification === 'critico') {
      recommendation = `Requer intervenção imediata: convocar responsáveis e elaborar plano de recuperação individualizado.`;
    } else if (classificationResult.classification === 'atencao') {
      recommendation = `Requer acompanhamento pedagógico: intensificar apoio nas disciplinas em dificuldade.`;
    } else if (classificationResult.classification === 'excelencia') {
      recommendation = `Manter estímulo: indicar para monitoria, projetos especiais ou olimpíadas.`;
    } else {
      recommendation = `Manter acompanhamento regular para consolidar desempenho.`;
    }
    
    profiles.push({
      studentId: student.id,
      studentName: student.name,
      classification: classificationResult.classification,
      cluster: hasGrades ? (clusterNames[studentCluster ?? -1] || 'Não classificado') : 'Sem dados',
      riskScore,
      average: classificationResult.average,
      frequency: classificationResult.frequency,
      subjectsBelow6: classificationResult.subjectsBelow6,
      subjectAverages: classificationResult.subjectAverages,
      strengths,
      weaknesses,
      trend,
      anomalies: anomalySubjects,
      recommendation,
      urgency,
    });
  });
  
  // Ordenar por urgência e risco
  profiles.sort((a, b) => {
    const urgencyOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return b.riskScore - a.riskScore;
  });
  
  // Formatar clusters para saída
  const clusters = clusterResults.map(cluster => ({
    name: clusterNames[cluster.clusterId] || 'Grupo',
    students: cluster.members.map(idx => studentMapping[idx]?.name || ''),
    characteristics: clusterChars[cluster.clusterId] || [],
  }));
  
  return { profiles, clusters };
}

// ============================================
// ANÁLISE TEMPORAL
// ============================================

export function analyzeTemporalPatterns(
  grades: Grade[],
  quarters: string[]
): { patterns: TemporalPattern[]; trajectory: TrendAnalysisResult } {
  const patterns: TemporalPattern[] = [];
  const quarterAverages: number[] = [];
  
  quarters.forEach(quarter => {
    const quarterGrades = grades.filter(g => g.quarter === quarter);
    if (quarterGrades.length === 0) return;
    
    const avg = mean(quarterGrades.map(g => g.grade));
    quarterAverages.push(avg);
    
    // Identificar disciplinas críticas no bimestre
    const subjectAverages: Record<string, number[]> = {};
    quarterGrades.forEach(g => {
      if (!subjectAverages[g.subject]) subjectAverages[g.subject] = [];
      subjectAverages[g.subject].push(g.grade);
    });
    
    const criticalSubjects = Object.entries(subjectAverages)
      .filter(([_, grades]) => mean(grades) < 6)
      .map(([subject]) => subject);
    
    // Determinar tendência em relação ao bimestre anterior
    let trend: TemporalPattern['trend'] = 'estavel';
    if (quarterAverages.length >= 2) {
      const prev = quarterAverages[quarterAverages.length - 2];
      const curr = quarterAverages[quarterAverages.length - 1];
      if (curr > prev + 0.3) trend = 'melhora';
      else if (curr < prev - 0.3) trend = 'piora';
    }
    
    let insight: string;
    if (trend === 'melhora') {
      insight = `Melhoria de desempenho em relação ao período anterior. ${criticalSubjects.length > 0 ? `Atenção ainda necessária em ${criticalSubjects.slice(0, 2).join(', ')}.` : 'Manter estratégias atuais.'}`;
    } else if (trend === 'piora') {
      insight = `Queda de desempenho detectada. ${criticalSubjects.length > 0 ? `Disciplinas críticas: ${criticalSubjects.slice(0, 3).join(', ')}.` : ''} Avaliar causas e implementar intervenções.`;
    } else {
      insight = `Desempenho estável. ${criticalSubjects.length > 0 ? `Foco em ${criticalSubjects.slice(0, 2).join(', ')}.` : 'Continuar acompanhamento regular.'}`;
    }
    
    patterns.push({
      quarter,
      classAverage: avg,
      trend,
      criticalSubjects,
      insight,
    });
  });
  
  // Calcular trajetória geral da turma
  const trajectory = analyzeTrend(quarterAverages);
  
  return { patterns, trajectory };
}

// ============================================
// FUNÇÃO PRINCIPAL DE ANÁLISE
// ============================================

export function generateAdvancedAnalytics(
  students: Student[],
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  professionalSubjects: string[] = [],
  quarters: string[] = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']
): AdvancedAnalyticsResult {
  // Análise de correlações entre disciplinas
  const { correlations, matrix, gateways } = analyzeSubjectCorrelations(students, grades);
  
  // Análise de influência entre áreas
  const { influences, strongest, weakest } = analyzeAreaInfluences(students, grades, professionalSubjects);
  
  // Análise de impacto comportamental
  const { impacts, patterns: behaviorPatterns } = analyzeBehaviorImpact(students, grades, incidents, quarters);
  
  // Perfis de alunos e clustering
  const { profiles, clusters } = analyzeStudentProfiles(students, grades, incidents, attendance, quarters);
  
  // Padrões temporais
  const { patterns: temporalPatterns, trajectory } = analyzeTemporalPatterns(grades, quarters);
  
  // Gerar alertas críticos
  const criticalAlerts: string[] = [];
  
  const criticalStudents = profiles.filter(p => p.urgency === 'critica');
  if (criticalStudents.length > 0) {
    criticalAlerts.push(
      `${criticalStudents.length} aluno(s) em situação CRÍTICA: ${criticalStudents.slice(0, 3).map(s => s.studentName).join(', ')}${criticalStudents.length > 3 ? ` (+${criticalStudents.length - 3})` : ''}`
    );
  }
  
  if (gateways.length > 0 && gateways[0].influenceScore > 1) {
    const gateway = gateways[0];
    const avgGrade = grades.filter(g => g.subject === gateway.subject).map(g => g.grade);
    if (mean(avgGrade) < 6) {
      criticalAlerts.push(
        `Disciplina gateway "${gateway.subject}" com média crítica. Impacto em ${gateway.dependentSubjects.length} outras disciplinas.`
      );
    }
  }
  
  if (trajectory.direction === 'decrescente' && trajectory.confidence > 50) {
    criticalAlerts.push(
      `Tendência de QUEDA no desempenho da turma (confiança: ${trajectory.confidence.toFixed(0)}%). Intervenção pedagógica necessária.`
    );
  }
  
  // Gerar oportunidades
  const opportunities: string[] = [];
  
  const excellentStudents = profiles.filter(p => p.urgency === 'baixa' && p.riskScore < 10);
  if (excellentStudents.length >= 3) {
    opportunities.push(
      `${excellentStudents.length} aluno(s) com potencial para tutoria entre pares ou atividades de enriquecimento.`
    );
  }
  
  if (strongest && influences.length > 0) {
    opportunities.push(
      `Área "${strongest}" com melhor desempenho. Metodologias dessa área podem ser adaptadas para outras.`
    );
  }
  
  if (trajectory.direction === 'crescente') {
    opportunities.push(
      `Tendência de MELHORA no desempenho geral. Manter e fortalecer estratégias atuais.`
    );
  }
  
  // Gerar recomendações acionáveis
  const recommendations: { category: string; action: string; priority: 'alta' | 'media' | 'baixa'; target: string }[] = [];
  
  // Recomendações por aluno crítico
  criticalStudents.slice(0, 5).forEach(student => {
    recommendations.push({
      category: 'Aluno',
      action: student.recommendation,
      priority: 'alta',
      target: student.studentName,
    });
  });
  
  // Recomendações por disciplina gateway
  gateways.slice(0, 2).forEach(gateway => {
    recommendations.push({
      category: 'Disciplina',
      action: gateway.recommendation,
      priority: gateway.influenceScore > 1 ? 'alta' : 'media',
      target: gateway.subject,
    });
  });
  
  // Recomendações comportamentais
  if (impacts.length > 0) {
    const mostImpactful = impacts.sort((a, b) => b.averageGradeDrop - a.averageGradeDrop)[0];
    recommendations.push({
      category: 'Comportamento',
      action: `Programa de acompanhamento pós-ocorrência. Tempo médio de recuperação: ${mostImpactful.recoveryTime} bimestre(s).`,
      priority: mostImpactful.averageGradeDrop > 1 ? 'alta' : 'media',
      target: 'Turma',
    });
  }
  
  // Recomendação de área
  if (weakest) {
    recommendations.push({
      category: 'Área',
      action: `Reforço coletivo na área "${weakest}". Avaliar metodologias e recursos disponíveis.`,
      priority: 'media',
      target: weakest,
    });
  }
  
  return {
    subjectCorrelations: correlations,
    correlationMatrix: matrix,
    gatewaySubjects: gateways,
    areaInfluences: influences,
    strongestArea: strongest,
    weakestArea: weakest,
    behaviorImpact: impacts,
    behaviorPatterns,
    studentProfiles: profiles,
    clusters,
    temporalPatterns,
    classTrajectory: trajectory,
    criticalAlerts,
    opportunities,
    recommendations,
  };
}
