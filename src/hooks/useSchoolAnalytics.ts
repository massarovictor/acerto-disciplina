/**
 * Hook para Analytics da Escola
 * 
 * Fornece cálculos agregados, rankings e insights para toda a escola
 * com suporte a filtros por série, turma e período.
 */

import { useMemo } from 'react';
import { Student, Class, Grade, Incident, AttendanceRecord } from '@/types';
import { classifyStudent, StudentClassification, ClassificationResult } from '@/lib/advancedAnalytics';
import { getSubjectArea, SUBJECT_AREAS } from '@/lib/subjects';
import { QUARTERS } from '@/lib/subjects';

// ============================================
// TIPOS
// ============================================

export interface AnalyticsFilters {
  series: string[];           // ['1º', '2º', '3º']
  classIds: string[];         // IDs das turmas selecionadas
  quarter: string;            // 'all' | '1º Bimestre' | etc
  comparisonClassIds: string[]; // Turmas para comparação lado a lado
}

export interface StudentAnalytics {
  student: Student;
  classification: ClassificationResult;
  className: string;
  incidentCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ClassAnalytics {
  classData: Class;
  studentCount: number;
  average: number;
  frequency: number;
  classifications: {
    critico: number;
    atencao: number;
    aprovado: number;
    excelencia: number;
  };
  incidentCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SubjectAnalytics {
  subject: string;
  area: string;
  average: number;
  studentsBelow6: number;
  studentsBelow6Percent: number;
  totalStudents: number;
}

export interface AreaAnalytics {
  area: string;
  average: number;
  subjects: SubjectAnalytics[];
}

export interface SchoolOverview {
  totalStudents: number;
  totalClasses: number;
  overallAverage: number;
  overallFrequency: number;
  totalIncidents: number;
  classifications: {
    critico: number;
    atencao: number;
    aprovado: number;
    excelencia: number;
  };
}

export interface Insight {
  id: string;
  type: 'warning' | 'alert' | 'success' | 'info';
  category: 'academic' | 'behavioral' | 'risk';  // Nova categoria
  title: string;
  description: string;
  actionLabel?: string;
  actionData?: any;
}

// Novo: Analytics comportamentais
export interface IncidentBySeverity {
  severity: 'leve' | 'intermediaria' | 'grave' | 'gravissima';
  count: number;
  percent: number;
}

export interface ClassIncidentRanking {
  classData: Class;
  incidentCount: number;
  studentCount: number;
  incidentsPerStudent: number;
  openIncidents: number;
}

export interface StudentIncidentRanking {
  student: Student;
  className: string;
  incidentCount: number;
  lastIncidentDate: string | null;
  severities: { leve: number; intermediaria: number; grave: number; gravissima: number };
}

export interface MonthlyIncidentTrend {
  month: string;  // 'Jan', 'Fev', etc.
  year: number;
  count: number;
}

export interface BehavioralAnalytics {
  incidentsBySeverity: IncidentBySeverity[];
  classIncidentRanking: ClassIncidentRanking[];
  topStudentsByIncidents: StudentIncidentRanking[];
  monthlyTrend: MonthlyIncidentTrend[];
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  averageIncidentsPerStudent: number;
}

export interface CategorizedInsights {
  academic: Insight[];
  behavioral: Insight[];
  risk: Insight[];
}

export interface SchoolAnalyticsResult {
  // Overview
  overview: SchoolOverview;

  // Rankings
  classRanking: ClassAnalytics[];
  topStudents: StudentAnalytics[];
  criticalStudents: StudentAnalytics[];

  // Subject Analysis
  subjectAnalytics: SubjectAnalytics[];
  areaAnalytics: AreaAnalytics[];
  bestSubjects: SubjectAnalytics[];
  worstSubjects: SubjectAnalytics[];

  // Behavioral Analytics (NOVO)
  behavioralAnalytics: BehavioralAnalytics;

  // Insights categorizados (MODIFICADO)
  insights: Insight[];  // Todos os insights
  categorizedInsights: CategorizedInsights;  // Insights por categoria

  // Comparison data
  comparisonData: ClassAnalytics[];
}

// ============================================
// CORES E LABELS
// ============================================

export const CLASSIFICATION_COLORS: Record<StudentClassification, string> = {
  critico: '#DC2626',
  atencao: '#F59E0B',
  aprovado: '#10B981',
  excelencia: '#2563EB',
};

export const CLASSIFICATION_LABELS: Record<StudentClassification, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  aprovado: 'Aprovado',
  excelencia: 'Excelência',
};

export const CLASSIFICATION_BG_COLORS: Record<StudentClassification, string> = {
  critico: 'bg-red-100 text-red-800 border-red-200',
  atencao: 'bg-amber-100 text-amber-800 border-amber-200',
  aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  excelencia: 'bg-blue-100 text-blue-800 border-blue-200',
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useSchoolAnalytics(
  students: Student[],
  classes: Class[],
  grades: Grade[],
  attendance: AttendanceRecord[],
  incidents: Incident[],
  filters: AnalyticsFilters
): SchoolAnalyticsResult {

  return useMemo(() => {
    // Filtrar turmas ativas (não arquivadas)
    const activeClasses = classes.filter(c => !c.archived);

    // Aplicar filtros
    let filteredClasses = activeClasses;

    if (filters.series.length > 0) {
      filteredClasses = filteredClasses.filter(c =>
        filters.series.some(s => c.series.includes(s))
      );
    }

    if (filters.classIds.length > 0) {
      filteredClasses = filteredClasses.filter(c =>
        filters.classIds.includes(c.id)
      );
    }

    const filteredClassIds = new Set(filteredClasses.map(c => c.id));

    // Filtrar alunos das turmas selecionadas
    const filteredStudents = students.filter(s =>
      filteredClassIds.has(s.classId) && s.status === 'active'
    );

    // Filtrar notas por período
    let filteredGrades = grades.filter(g => filteredClassIds.has(g.classId));
    if (filters.quarter !== 'all') {
      filteredGrades = filteredGrades.filter(g => g.quarter === filters.quarter);
    }

    // Filtrar frequência
    const filteredAttendance = attendance.filter(a => filteredClassIds.has(a.classId));

    // Filtrar ocorrências
    const filteredIncidents = incidents.filter(i => filteredClassIds.has(i.classId));

    // ============================================
    // CALCULAR ANALYTICS POR ALUNO
    // ============================================

    const studentAnalyticsList: StudentAnalytics[] = filteredStudents.map(student => {
      const studentGrades = filteredGrades.filter(g => g.studentId === student.id);
      const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);
      const studentIncidents = filteredIncidents.filter(i => i.studentIds.includes(student.id));

      const classification = classifyStudent(studentGrades, studentAttendance);
      const studentClass = filteredClasses.find(c => c.id === student.classId);

      // Calcular tendência
      const quarterAverages = QUARTERS.map(q => {
        const qGrades = grades.filter(g => g.studentId === student.id && g.quarter === q);
        return qGrades.length > 0 ? qGrades.reduce((s, g) => s + g.grade, 0) / qGrades.length : 0;
      }).filter(v => v > 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (quarterAverages.length >= 2) {
        const diff = quarterAverages[quarterAverages.length - 1] - quarterAverages[quarterAverages.length - 2];
        if (diff > 0.3) trend = 'up';
        else if (diff < -0.3) trend = 'down';
      }

      return {
        student,
        classification,
        className: studentClass?.name || 'Sem turma',
        incidentCount: studentIncidents.length,
        trend,
      };
    });

    // ============================================
    // CALCULAR ANALYTICS POR TURMA
    // ============================================

    // ============================================
    // CALCULAR ANALYTICS POR TURMA
    // ============================================

    const classAnalyticsList: ClassAnalytics[] = filteredClasses.map(cls => {
      const classStudents = studentAnalyticsList.filter(s => s.student.classId === cls.id);
      const classGrades = filteredGrades.filter(g => g.classId === cls.id);
      const classAttendance = filteredAttendance.filter(a => a.classId === cls.id);
      const classIncidents = filteredIncidents.filter(i => i.classId === cls.id);

      // Calcular média da turma: Média das médias dos alunos
      let totalStudentAverages = 0;
      let studentCountWithGrades = 0;

      classStudents.forEach(studentAnalytics => {
        const student = studentAnalytics.student;
        const studentGrades = classGrades.filter(g => g.studentId === student.id);

        if (studentGrades.length > 0) {
          // Média do aluno = Soma das notas / Quantidade de notas
          // Nota: Assumindo que todas as notas têm o mesmo peso
          const studentAvg = studentGrades.reduce((s, g) => s + g.grade, 0) / studentGrades.length;
          totalStudentAverages += studentAvg;
          studentCountWithGrades++;
        }
      });

      const average = studentCountWithGrades > 0 ? totalStudentAverages / studentCountWithGrades : 0;

      const present = classAttendance.filter(a => a.status === 'presente').length;
      const frequency = classAttendance.length > 0 ? (present / classAttendance.length) * 100 : 100;

      const classifications = {
        critico: classStudents.filter(s => s.classification.classification === 'critico').length,
        atencao: classStudents.filter(s => s.classification.classification === 'atencao').length,
        aprovado: classStudents.filter(s => s.classification.classification === 'aprovado').length,
        excelencia: classStudents.filter(s => s.classification.classification === 'excelencia').length,
      };

      // Calcular tendência da turma (média mensal)
      const quarterAverages = QUARTERS.map(q => {
        const qGrades = grades.filter(g => g.classId === cls.id && g.quarter === q);
        return qGrades.length > 0 ? qGrades.reduce((s, g) => s + g.grade, 0) / qGrades.length : 0;
      }).filter(v => v > 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (quarterAverages.length >= 2) {
        const diff = quarterAverages[quarterAverages.length - 1] - quarterAverages[quarterAverages.length - 2];
        if (diff > 0.2) trend = 'up';
        else if (diff < -0.2) trend = 'down';
      }

      return {
        classData: cls,
        studentCount: classStudents.length,
        average,
        frequency,
        classifications,
        incidentCount: classIncidents.length,
        trend,
      };
    });

    // Ordenar ranking de turmas por média
    const classRanking = [...classAnalyticsList].sort((a, b) => b.average - a.average);

    // ============================================
    // CALCULAR ANALYTICS POR DISCIPLINA
    // ============================================

    // Agrupar por disciplina e aluno para calcular médias individuais primeiro
    const subjectStudentMap: Record<string, Record<string, number[]>> = {};

    filteredGrades.forEach(g => {
      if (!subjectStudentMap[g.subject]) {
        subjectStudentMap[g.subject] = {};
      }
      if (!subjectStudentMap[g.subject][g.studentId]) {
        subjectStudentMap[g.subject][g.studentId] = [];
      }
      subjectStudentMap[g.subject][g.studentId].push(g.grade);
    });

    const subjectAnalytics: SubjectAnalytics[] = Object.entries(subjectStudentMap).map(([subject, studentsData]) => {
      // Calcular média de cada aluno na disciplina
      const studentFinalGrades: number[] = [];

      Object.values(studentsData).forEach(grades => {
        if (grades.length > 0) {
          const studentAvg = grades.reduce((a, b) => a + b, 0) / grades.length;
          studentFinalGrades.push(studentAvg);
        }
      });

      // Média da disciplina = Média das médias dos alunos
      const average = studentFinalGrades.length > 0
        ? studentFinalGrades.reduce((a, b) => a + b, 0) / studentFinalGrades.length
        : 0;

      const below6 = studentFinalGrades.filter(g => g < 6).length;
      const area = getSubjectArea(subject);

      return {
        subject,
        area: area?.name || 'Outros',
        average,
        studentsBelow6: below6,
        studentsBelow6Percent: studentFinalGrades.length > 0 ? (below6 / studentFinalGrades.length) * 100 : 0,
        totalStudents: studentFinalGrades.length,
      };
    });

    // Ordenar disciplinas
    const bestSubjects = [...subjectAnalytics].sort((a, b) => b.average - a.average).slice(0, 5);
    const worstSubjects = [...subjectAnalytics].sort((a, b) => a.average - b.average).slice(0, 5);

    // Analytics por área
    const areaMap: Record<string, SubjectAnalytics[]> = {};
    subjectAnalytics.forEach(s => {
      if (!areaMap[s.area]) areaMap[s.area] = [];
      areaMap[s.area].push(s);
    });

    const areaAnalytics: AreaAnalytics[] = Object.entries(areaMap).map(([area, subjects]) => {
      // Média da área = Média das médias das disciplinas
      // Poderíamos ponderar pelo número de alunos, mas média simples das disciplinas é aceitável para analytics geral
      const average = subjects.length > 0
        ? subjects.reduce((acc, s) => acc + s.average, 0) / subjects.length
        : 0;

      return { area, average, subjects };
    });

    // ============================================
    // RANKINGS DE ALUNOS
    // ============================================

    const topStudents = [...studentAnalyticsList]
      .sort((a, b) => b.classification.average - a.classification.average)
      .slice(0, 10);

    const criticalStudents = studentAnalyticsList
      .filter(s => s.classification.classification === 'critico' || s.classification.classification === 'atencao')
      .sort((a, b) => {
        // Primeiro ordenar por classificação (crítico antes de atenção)
        if (a.classification.classification !== b.classification.classification) {
          return a.classification.classification === 'critico' ? -1 : 1;
        }
        // Depois por média (menor primeiro)
        return a.classification.average - b.classification.average;
      })
      .slice(0, 15);

    // ============================================
    // OVERVIEW
    // ============================================

    const totalClassifications = {
      critico: studentAnalyticsList.filter(s => s.classification.classification === 'critico').length,
      atencao: studentAnalyticsList.filter(s => s.classification.classification === 'atencao').length,
      aprovado: studentAnalyticsList.filter(s => s.classification.classification === 'aprovado').length,
      excelencia: studentAnalyticsList.filter(s => s.classification.classification === 'excelencia').length,
    };

    const overallAverage = filteredGrades.length > 0
      ? filteredGrades.reduce((s, g) => s + g.grade, 0) / filteredGrades.length
      : 0;

    const totalPresent = filteredAttendance.filter(a => a.status === 'presente').length;
    const overallFrequency = filteredAttendance.length > 0
      ? (totalPresent / filteredAttendance.length) * 100
      : 100;

    const overview: SchoolOverview = {
      totalStudents: filteredStudents.length,
      totalClasses: filteredClasses.length,
      overallAverage,
      overallFrequency,
      totalIncidents: filteredIncidents.length,
      classifications: totalClassifications,
    };

    // ============================================
    // BEHAVIORAL ANALYTICS (NOVO)
    // ============================================

    // Ocorrências por severidade
    const severityCounts = {
      leve: filteredIncidents.filter(i => i.finalSeverity === 'leve').length,
      intermediaria: filteredIncidents.filter(i => i.finalSeverity === 'intermediaria').length,
      grave: filteredIncidents.filter(i => i.finalSeverity === 'grave').length,
      gravissima: filteredIncidents.filter(i => i.finalSeverity === 'gravissima').length,
    };

    const totalIncidentsCount = filteredIncidents.length;
    const incidentsBySeverity: IncidentBySeverity[] = [
      { severity: 'leve', count: severityCounts.leve, percent: totalIncidentsCount > 0 ? (severityCounts.leve / totalIncidentsCount) * 100 : 0 },
      { severity: 'intermediaria', count: severityCounts.intermediaria, percent: totalIncidentsCount > 0 ? (severityCounts.intermediaria / totalIncidentsCount) * 100 : 0 },
      { severity: 'grave', count: severityCounts.grave, percent: totalIncidentsCount > 0 ? (severityCounts.grave / totalIncidentsCount) * 100 : 0 },
      { severity: 'gravissima', count: severityCounts.gravissima, percent: totalIncidentsCount > 0 ? (severityCounts.gravissima / totalIncidentsCount) * 100 : 0 },
    ];

    // Ranking de turmas por ocorrências
    const classIncidentRanking: ClassIncidentRanking[] = filteredClasses.map(cls => {
      const classIncidents = filteredIncidents.filter(i => i.classId === cls.id);
      const classStudentCount = filteredStudents.filter(s => s.classId === cls.id).length;
      return {
        classData: cls,
        incidentCount: classIncidents.length,
        studentCount: classStudentCount,
        incidentsPerStudent: classStudentCount > 0 ? classIncidents.length / classStudentCount : 0,
        openIncidents: classIncidents.filter(i => i.status !== 'resolvida').length,
      };
    }).sort((a, b) => b.incidentCount - a.incidentCount);

    // Top alunos por ocorrências
    const studentIncidentMap = new Map<string, { count: number; lastDate: string | null; severities: { leve: number; intermediaria: number; grave: number; gravissima: number } }>();

    filteredIncidents.forEach(incident => {
      incident.studentIds.forEach(studentId => {
        const current = studentIncidentMap.get(studentId) || {
          count: 0,
          lastDate: null,
          severities: { leve: 0, intermediaria: 0, grave: 0, gravissima: 0 }
        };
        current.count++;
        current.severities[incident.finalSeverity as keyof typeof current.severities]++;
        if (!current.lastDate || incident.date > current.lastDate) {
          current.lastDate = incident.date;
        }
        studentIncidentMap.set(studentId, current);
      });
    });

    const topStudentsByIncidents: StudentIncidentRanking[] = Array.from(studentIncidentMap.entries())
      .map(([studentId, data]) => {
        const student = filteredStudents.find(s => s.id === studentId);
        const studentClass = filteredClasses.find(c => c.id === student?.classId);
        return student ? {
          student,
          className: studentClass?.name || 'Sem turma',
          incidentCount: data.count,
          lastIncidentDate: data.lastDate,
          severities: data.severities,
        } : null;
      })
      .filter((s): s is StudentIncidentRanking => s !== null)
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, 10);

    // Tendência mensal (últimos 6 meses)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const monthlyTrend: MonthlyIncidentTrend[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      const count = filteredIncidents.filter(incident => {
        const incidentDate = new Date(incident.date);
        return incidentDate.getMonth() === month && incidentDate.getFullYear() === year;
      }).length;

      monthlyTrend.push({
        month: monthNames[month],
        year,
        count,
      });
    }

    const openIncidentsCount = filteredIncidents.filter(i => i.status !== 'resolvida').length;
    const resolvedIncidentsCount = filteredIncidents.filter(i => i.status === 'resolvida').length;
    const averageIncidentsPerStudent = filteredStudents.length > 0
      ? filteredIncidents.length / filteredStudents.length
      : 0;

    const behavioralAnalytics: BehavioralAnalytics = {
      incidentsBySeverity,
      classIncidentRanking,
      topStudentsByIncidents,
      monthlyTrend,
      openIncidentsCount,
      resolvedIncidentsCount,
      averageIncidentsPerStudent,
    };

    // ============================================
    // INSIGHTS AUTOMÁTICOS (com categorias)
    // ============================================

    const insights: Insight[] = [];

    // === INSIGHTS ACADÊMICOS ===

    // Insight: Alunos críticos
    if (totalClassifications.critico > 0) {
      const percent = ((totalClassifications.critico / filteredStudents.length) * 100).toFixed(0);
      insights.push({
        id: 'critical-students',
        type: 'alert',
        category: 'risk',
        title: `${totalClassifications.critico} alunos em situação crítica`,
        description: `${percent}% dos alunos estão reprovados em 3 ou mais disciplinas e precisam de intervenção imediata.`,
        actionLabel: 'Ver alunos',
        actionData: { filter: 'critico' },
      });
    }

    // Insight: Turma com maior taxa de críticos
    const classWithMostCritical = classRanking.find(c =>
      c.studentCount > 0 && (c.classifications.critico / c.studentCount) > 0.3
    );
    if (classWithMostCritical) {
      const percent = ((classWithMostCritical.classifications.critico / classWithMostCritical.studentCount) * 100).toFixed(0);
      insights.push({
        id: 'class-critical',
        type: 'warning',
        category: 'risk',
        title: `${classWithMostCritical.classData.name} precisa de atenção`,
        description: `${percent}% dos alunos desta turma estão em situação crítica.`,
        actionLabel: 'Ver turma',
        actionData: { classId: classWithMostCritical.classData.id },
      });
    }

    // Insight: Disciplina com maior reprovação
    const worstSubject = worstSubjects[0];
    if (worstSubject && worstSubject.studentsBelow6Percent > 30) {
      insights.push({
        id: 'worst-subject',
        type: 'warning',
        category: 'academic',
        title: `${worstSubject.subject} é a disciplina mais crítica`,
        description: `${worstSubject.studentsBelow6Percent.toFixed(0)}% das notas estão abaixo de 6.0 (média: ${worstSubject.average.toFixed(1)}).`,
      });
    }

    // Insight: Alunos de excelência
    if (totalClassifications.excelencia > 0) {
      const percent = ((totalClassifications.excelencia / filteredStudents.length) * 100).toFixed(0);
      insights.push({
        id: 'excellence-students',
        type: 'success',
        category: 'academic',
        title: `${totalClassifications.excelencia} alunos de excelência`,
        description: `${percent}% dos alunos têm média geral acima de 8.0 em todas as disciplinas.`,
        actionLabel: 'Ver alunos',
        actionData: { filter: 'excelencia' },
      });
    }

    // Insight: Frequência baixa
    if (overallFrequency < 80) {
      insights.push({
        id: 'low-frequency',
        type: 'alert',
        category: 'academic',
        title: 'Frequência abaixo do esperado',
        description: `A frequência média é de ${overallFrequency.toFixed(0)}%, abaixo dos 80% recomendados.`,
      });
    }

    // Insight: Melhor turma
    const bestClass = classRanking[0];
    if (bestClass && bestClass.average >= 7) {
      insights.push({
        id: 'best-class',
        type: 'success',
        category: 'academic',
        title: `${bestClass.classData.name} lidera o ranking`,
        description: `Média de ${bestClass.average.toFixed(1)} e ${bestClass.classifications.excelencia} alunos de excelência.`,
      });
    }

    // === INSIGHTS COMPORTAMENTAIS ===

    // Insight: Ocorrências altas
    if (averageIncidentsPerStudent > 0.5) {
      insights.push({
        id: 'high-incidents',
        type: 'warning',
        category: 'behavioral',
        title: 'Alto índice de ocorrências',
        description: `Média de ${averageIncidentsPerStudent.toFixed(1)} ocorrências por aluno. Considere ações preventivas.`,
      });
    }

    // Insight: Ocorrências graves/gravíssimas
    const severeIncidents = severityCounts.grave + severityCounts.gravissima;
    if (severeIncidents > 0) {
      insights.push({
        id: 'severe-incidents',
        type: 'alert',
        category: 'behavioral',
        title: `${severeIncidents} ocorrências graves`,
        description: `Há ${severityCounts.grave} ocorrências graves e ${severityCounts.gravissima} gravíssimas que requerem atenção especial.`,
      });
    }

    // Insight: Ocorrências pendentes
    if (openIncidentsCount > 5) {
      insights.push({
        id: 'pending-incidents',
        type: 'warning',
        category: 'behavioral',
        title: `${openIncidentsCount} ocorrências pendentes`,
        description: `Existem ocorrências aguardando resolução. Considere revisar e dar encaminhamento.`,
      });
    }

    // Insight: Turma com mais ocorrências
    const classWithMostIncidents = classIncidentRanking[0];
    if (classWithMostIncidents && classWithMostIncidents.incidentCount >= 5) {
      insights.push({
        id: 'class-most-incidents',
        type: 'warning',
        category: 'behavioral',
        title: `${classWithMostIncidents.classData.name} lidera em ocorrências`,
        description: `${classWithMostIncidents.incidentCount} ocorrências registradas (${classWithMostIncidents.incidentsPerStudent.toFixed(1)} por aluno).`,
      });
    }

    // Insight: Melhoria no comportamento
    if (monthlyTrend.length >= 2) {
      const lastMonth = monthlyTrend[monthlyTrend.length - 1].count;
      const prevMonth = monthlyTrend[monthlyTrend.length - 2].count;
      if (prevMonth > 0 && lastMonth < prevMonth * 0.7) {
        insights.push({
          id: 'behavior-improvement',
          type: 'success',
          category: 'behavioral',
          title: 'Melhoria no comportamento',
          description: `Ocorrências reduziram ${(((prevMonth - lastMonth) / prevMonth) * 100).toFixed(0)}% em relação ao mês anterior.`,
        });
      }
    }

    // === CATEGORIZAR INSIGHTS ===
    const categorizedInsights: CategorizedInsights = {
      academic: insights.filter(i => i.category === 'academic'),
      behavioral: insights.filter(i => i.category === 'behavioral'),
      risk: insights.filter(i => i.category === 'risk'),
    };

    // ============================================
    // DADOS DE COMPARAÇÃO
    // ============================================

    const comparisonData = filters.comparisonClassIds.length > 0
      ? classAnalyticsList.filter(c => filters.comparisonClassIds.includes(c.classData.id))
      : [];

    return {
      overview,
      classRanking,
      topStudents,
      criticalStudents,
      subjectAnalytics,
      areaAnalytics,
      bestSubjects,
      worstSubjects,
      behavioralAnalytics,
      insights,
      categorizedInsights,
      comparisonData,
    };
  }, [students, classes, grades, attendance, incidents, filters]);
}

// Helper para formatar números
export function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals);
}

// Helper para obter cor do trend
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return 'text-emerald-600';
    case 'down': return 'text-red-600';
    default: return 'text-gray-500';
  }
}

// Helper para obter ícone do trend
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '→';
  }
}
