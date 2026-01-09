/**
 * Motor de Geração de Insights e Recomendações
 * 
 * Transforma análises quantitativas em insights acionáveis
 * com linguagem clara e recomendações específicas
 */

import { 
  AdvancedAnalyticsResult, 
  StudentProfile, 
  StudentClassification,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS 
} from './advancedAnalytics';
import { TrendAnalysisResult } from './mlAnalytics';

// ============================================
// TIPOS
// ============================================

export interface ClassificationCounts {
  critico: number;
  atencao: number;
  aprovado: number;
  excelencia: number;
}

export interface ExecutiveSummary {
  totalStudents: number;
  classAverage: number;
  classFrequency: number;
  classificationCounts: ClassificationCounts;
  criticalCount: number;
  excellentCount: number;
  topAlerts: string[];
  topOpportunities: string[];
  overallStatus: 'excelente' | 'bom' | 'atencao' | 'critico';
  statusDescription: string;
}

export interface CorrelationInsight {
  title: string;
  description: string;
  subjects: string[];
  strength: 'forte' | 'moderada' | 'fraca';
  actionable: string;
  visualData?: { label: string; value: number }[];
}

export interface StudentInsight {
  studentName: string;
  status: 'excelencia' | 'aprovado' | 'atencao' | 'critico';
  mainInsight: string;
  metrics: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[];
  strengths: string[];
  risks: string[];
  recommendation: string;
  urgencyLevel: number; // 1-10
}

export interface ActionableRecommendation {
  id: string;
  category: 'aluno' | 'disciplina' | 'area' | 'comportamento' | 'turma';
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  title: string;
  description: string;
  target: string;
  expectedImpact: string;
  steps: string[];
  timeline: string;
  metrics: string[];
}

export interface InsightsReport {
  generatedAt: Date;
  period: string;
  executiveSummary: ExecutiveSummary;
  correlationInsights: CorrelationInsight[];
  studentInsights: StudentInsight[];
  recommendations: ActionableRecommendation[];
  rawData: {
    criticalAlerts: string[];
    opportunities: string[];
    behaviorPatterns: string[];
  };
}

// ============================================
// GERAÇÃO DE SUMÁRIO EXECUTIVO
// ============================================

export function generateExecutiveSummary(
  analytics: AdvancedAnalyticsResult,
  totalStudents: number,
  classAverage: number,
  classFrequency: number
): ExecutiveSummary {
  // Contar alunos por classificação padronizada
  const classificationCounts: ClassificationCounts = {
    critico: analytics.studentProfiles.filter(p => p.classification === 'critico').length,
    atencao: analytics.studentProfiles.filter(p => p.classification === 'atencao').length,
    aprovado: analytics.studentProfiles.filter(p => p.classification === 'aprovado').length,
    excelencia: analytics.studentProfiles.filter(p => p.classification === 'excelencia').length,
  };
  
  const criticalCount = classificationCounts.critico;
  const attentionCount = classificationCounts.atencao;
  const excellentCount = classificationCounts.excelencia;
  
  // Determinar status geral
  let overallStatus: ExecutiveSummary['overallStatus'];
  let statusDescription: string;
  
  const criticalRatio = (criticalCount + attentionCount) / totalStudents;
  const excellentRatio = excellentCount / totalStudents;
  
  if (criticalRatio > 0.3 || classAverage < 5) {
    overallStatus = 'critico';
    statusDescription = `Situação crítica: ${((criticalRatio) * 100).toFixed(0)}% dos alunos necessitam intervenção urgente. ` +
      `Média da turma (${classAverage.toFixed(1)}) abaixo do esperado.`;
  } else if (criticalRatio > 0.15 || classAverage < 6) {
    overallStatus = 'atencao';
    statusDescription = `Atenção necessária: ${criticalCount + highRiskCount} aluno(s) em risco. ` +
      `Média da turma: ${classAverage.toFixed(1)}. Ação preventiva recomendada.`;
  } else if (excellentRatio > 0.3 && classAverage >= 7) {
    overallStatus = 'excelente';
    statusDescription = `Desempenho excelente: ${(excellentRatio * 100).toFixed(0)}% dos alunos em nível de excelência. ` +
      `Média da turma: ${classAverage.toFixed(1)}.`;
  } else {
    overallStatus = 'bom';
    statusDescription = `Desempenho satisfatório: Média da turma ${classAverage.toFixed(1)}. ` +
      `${criticalCount > 0 ? `Atenção para ${criticalCount} aluno(s) em situação crítica.` : 'Sem alertas críticos.'}`;
  }
  
  return {
    totalStudents,
    classAverage,
    classFrequency,
    classificationCounts,
    criticalCount,
    excellentCount,
    topAlerts: analytics.criticalAlerts.slice(0, 3),
    topOpportunities: analytics.opportunities.slice(0, 3),
    overallStatus,
    statusDescription,
  };
}

// ============================================
// GERAÇÃO DE INSIGHTS DE CORRELAÇÃO
// ============================================

export function generateCorrelationInsights(analytics: AdvancedAnalyticsResult): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];
  
  // Insights de disciplinas gateway
  analytics.gatewaySubjects.slice(0, 3).forEach(gateway => {
    insights.push({
      title: `${gateway.subject}: Disciplina Base`,
      description: gateway.insight,
      subjects: [gateway.subject, ...gateway.dependentSubjects],
      strength: gateway.influenceScore > 1.5 ? 'forte' : gateway.influenceScore > 0.8 ? 'moderada' : 'fraca',
      actionable: gateway.recommendation,
      visualData: gateway.dependentSubjects.map(dep => ({
        label: dep,
        value: gateway.influenceScore / gateway.dependentSubjects.length,
      })),
    });
  });
  
  // Insights de correlações fortes
  analytics.subjectCorrelations
    .filter(c => c.correlation.strength === 'forte')
    .slice(0, 3)
    .forEach(corr => {
      insights.push({
        title: `Correlação: ${corr.subject1} ↔ ${corr.subject2}`,
        description: corr.insight,
        subjects: [corr.subject1, corr.subject2],
        strength: corr.correlation.strength,
        actionable: corr.correlation.direction === 'positiva'
          ? `Trabalho interdisciplinar entre ${corr.subject1} e ${corr.subject2} pode potencializar resultados.`
          : `Avaliar equilíbrio de dedicação entre ${corr.subject1} e ${corr.subject2}.`,
      });
    });
  
  // Insights de áreas
  if (analytics.strongestArea && analytics.weakestArea) {
    const areaInfluence = analytics.areaInfluences.find(
      i => i.sourceArea === analytics.weakestArea || i.targetArea === analytics.weakestArea
    );
    
    insights.push({
      title: `Áreas: Força vs Fragilidade`,
      description: `"${analytics.strongestArea}" é a área mais forte, enquanto "${analytics.weakestArea}" requer mais atenção. ` +
        (areaInfluence ? areaInfluence.insight : ''),
      subjects: [analytics.strongestArea, analytics.weakestArea],
      strength: 'forte',
      actionable: `Avaliar transferência de metodologias bem-sucedidas de "${analytics.strongestArea}" para "${analytics.weakestArea}".`,
    });
  }
  
  return insights;
}

// ============================================
// GERAÇÃO DE INSIGHTS DE ALUNOS
// ============================================

export function generateStudentInsights(
  profiles: StudentProfile[],
  classAverage: number
): StudentInsight[] {
  return profiles.map(profile => {
    // Usar classificação padronizada do perfil
    const status: StudentInsight['status'] = profile.classification;
    
    // Formatar disciplinas abaixo com notas
    const subjectsWithGrades = profile.subjectsBelow6
      .map(s => `${s.subject} (${s.average.toFixed(1)})`)
      .join(', ');
    
    // Gerar insight principal baseado na classificação
    let mainInsight: string;
    if (status === 'critico') {
      mainInsight = `Situação crítica: ${profile.subjectsBelow6.length} reprovação(ões) - ${subjectsWithGrades}. ` +
        `Média geral ${profile.average.toFixed(1)} e frequência ${profile.frequency.toFixed(0)}%.`;
    } else if (status === 'atencao') {
      mainInsight = `Requer acompanhamento: ${profile.subjectsBelow6.length} reprovação(ões) - ${subjectsWithGrades}. ` +
        `${profile.trend.direction === 'decrescente' ? 'Tendência de queda detectada.' : ''}`;
    } else if (status === 'excelencia') {
      mainInsight = `Desempenho exemplar com média ${profile.average.toFixed(1)}. ` +
        `${profile.strengths.length > 0 ? `Destaque em ${profile.strengths.slice(0, 3).join(', ')}.` : ''}` +
        `${profile.trend.direction === 'crescente' ? ' Tendência de melhora contínua.' : ''}`;
    } else {
      mainInsight = `Aprovado em todas as disciplinas com média ${profile.average.toFixed(1)}. ` +
        `${profile.strengths.length > 0 ? `Potencial em ${profile.strengths.slice(0, 2).join(', ')}.` : 'Manter acompanhamento regular.'}`;
    }
    
    // Métricas usando dados reais do perfil
    const metrics = [
      {
        label: 'Média Geral',
        value: profile.average.toFixed(1),
        trend: profile.trend.direction === 'crescente' ? 'up' as const :
               profile.trend.direction === 'decrescente' ? 'down' as const : 'stable' as const,
      },
      {
        label: 'Frequência',
        value: `${profile.frequency.toFixed(0)}%`,
        trend: profile.frequency < 75 ? 'down' as const : 'stable' as const,
      },
      {
        label: 'Reprovações',
        value: profile.subjectsBelow6.length.toString(),
      },
    ];
    
    // Riscos identificados
    const risks: string[] = [];
    if (profile.trend.direction === 'decrescente') {
      risks.push('Tendência de queda no desempenho');
    }
    if (profile.subjectsBelow6.length >= 3) {
      risks.push(`${profile.subjectsBelow6.length} disciplinas abaixo da média`);
    } else if (profile.subjectsBelow6.length > 0) {
      const disciplinas = profile.subjectsBelow6.map(s => s.subject).join(', ');
      risks.push(`Atenção em ${disciplinas}`);
    }
    if (profile.frequency < 75) {
      risks.push(`Frequência baixa (${profile.frequency.toFixed(0)}%)`);
    }
    if (profile.anomalies.length > 0) {
      const drops = profile.anomalies.filter(a => a.type === 'queda_brusca');
      if (drops.length > 0) {
        risks.push(`Queda brusca em ${drops.map(d => d.subject).join(', ')}`);
      }
    }
    
    // Urgência baseada na classificação
    const urgencyLevel = status === 'critico' ? 10 :
                         status === 'atencao' ? 7 :
                         status === 'aprovado' ? 3 : 1;
    
    return {
      studentName: profile.studentName,
      status,
      mainInsight,
      metrics,
      strengths: profile.strengths,
      risks,
      recommendation: profile.recommendation,
      urgencyLevel,
    };
  });
}

// ============================================
// GERAÇÃO DE RECOMENDAÇÕES ACIONÁVEIS
// ============================================

export function generateActionableRecommendations(
  analytics: AdvancedAnalyticsResult
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  let idCounter = 1;
  
  // Recomendações para alunos críticos
  const criticalStudents = analytics.studentProfiles.filter(p => p.urgency === 'critica');
  if (criticalStudents.length > 0) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      category: 'aluno',
      priority: 'critica',
      title: `Intervenção Urgente: ${criticalStudents.length} Aluno(s)`,
      description: `${criticalStudents.map(s => s.studentName).join(', ')} necessitam de intervenção imediata.`,
      target: criticalStudents.map(s => s.studentName).join(', '),
      expectedImpact: 'Redução do risco de reprovação e abandono escolar',
      steps: [
        'Convocar reunião com equipe pedagógica nas próximas 48h',
        'Agendar conversa individual com cada aluno',
        'Contatar responsáveis para reunião presencial',
        'Elaborar plano de recuperação personalizado',
        'Designar professor-tutor para acompanhamento',
      ],
      timeline: 'Imediato - 1 semana',
      metrics: ['Frequência às aulas de reforço', 'Notas em avaliações parciais', 'Participação em sala'],
    });
  }
  
  // Recomendações para disciplinas gateway
  analytics.gatewaySubjects.slice(0, 2).forEach(gateway => {
    recommendations.push({
      id: `rec-${idCounter++}`,
      category: 'disciplina',
      priority: gateway.influenceScore > 1.5 ? 'alta' : 'media',
      title: `Reforço em ${gateway.subject}`,
      description: `${gateway.subject} influencia diretamente ${gateway.dependentSubjects.length} outras disciplinas. ` +
        `Melhorias aqui terão efeito cascata.`,
      target: gateway.subject,
      expectedImpact: `Melhoria em ${gateway.dependentSubjects.join(', ')}`,
      steps: [
        `Identificar principais dificuldades em ${gateway.subject}`,
        'Organizar grupos de estudo ou monitoria',
        'Implementar exercícios práticos adicionais',
        'Avaliar necessidade de aulas de reforço',
        'Monitorar evolução quinzenalmente',
      ],
      timeline: '2-4 semanas',
      metrics: ['Média em avaliações', 'Taxa de participação', 'Evolução nas disciplinas dependentes'],
    });
  });
  
  // Recomendação para área mais fraca
  if (analytics.weakestArea) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      category: 'area',
      priority: 'media',
      title: `Fortalecer ${analytics.weakestArea}`,
      description: `Área com menor desempenho da turma. Estratégia coletiva necessária.`,
      target: analytics.weakestArea,
      expectedImpact: 'Elevação da média da área em 0.5-1.0 ponto',
      steps: [
        'Reunir professores da área para alinhamento',
        'Identificar tópicos com maior dificuldade',
        'Desenvolver material de apoio complementar',
        'Implementar atividades interdisciplinares',
        'Realizar avaliação diagnóstica mensal',
      ],
      timeline: '1-2 meses',
      metrics: ['Média da área', 'Número de alunos abaixo da média', 'Engajamento nas atividades'],
    });
  }
  
  // Recomendação comportamental se houver impacto
  if (analytics.behaviorImpact.length > 0) {
    const mostImpactful = analytics.behaviorImpact.sort((a, b) => b.averageGradeDrop - a.averageGradeDrop)[0];
    
    recommendations.push({
      id: `rec-${idCounter++}`,
      category: 'comportamento',
      priority: mostImpactful.averageGradeDrop > 1 ? 'alta' : 'media',
      title: 'Programa de Acompanhamento Comportamental',
      description: `Ocorrências associadas a queda de ${mostImpactful.averageGradeDrop.toFixed(1)} ponto(s) na média. ` +
        `${mostImpactful.affectedStudents.length} aluno(s) afetado(s).`,
      target: 'Turma',
      expectedImpact: 'Redução de ocorrências e melhoria no desempenho acadêmico',
      steps: [
        'Mapear padrões de ocorrências (horário, disciplina, contexto)',
        'Implementar programa de mediação de conflitos',
        'Criar canal de comunicação com famílias',
        'Estabelecer sistema de reconhecimento positivo',
        'Acompanhar desempenho pós-ocorrência',
      ],
      timeline: 'Contínuo',
      metrics: ['Número de ocorrências/mês', 'Média dos alunos com ocorrências', 'Tempo de recuperação'],
    });
  }
  
  // Oportunidade de tutoria entre pares
  const excellentStudents = analytics.studentProfiles.filter(p => p.riskScore < 10);
  if (excellentStudents.length >= 2 && criticalStudents.length > 0) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      category: 'turma',
      priority: 'media',
      title: 'Programa de Tutoria entre Pares',
      description: `${excellentStudents.length} aluno(s) com potencial para tutoria podem ajudar ` +
        `${criticalStudents.length} colega(s) em dificuldade.`,
      target: 'Turma',
      expectedImpact: 'Fortalecimento do aprendizado colaborativo e melhoria coletiva',
      steps: [
        'Identificar voluntários entre alunos de alto desempenho',
        'Capacitar tutores com técnicas básicas de ensino',
        'Formar duplas/grupos baseados em disciplinas de dificuldade',
        'Estabelecer horários fixos para sessões de tutoria',
        'Monitorar e celebrar progressos',
      ],
      timeline: '2-3 semanas para implementação',
      metrics: ['Participação nas sessões', 'Evolução dos tutorandos', 'Satisfação dos participantes'],
    });
  }
  
  // Ordenar por prioridade
  const priorityOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export function generateInsightsReport(
  analytics: AdvancedAnalyticsResult,
  totalStudents: number,
  classAverage: number,
  classFrequency: number,
  period: string
): InsightsReport {
  const executiveSummary = generateExecutiveSummary(analytics, totalStudents, classAverage, classFrequency);
  const correlationInsights = generateCorrelationInsights(analytics);
  const studentInsights = generateStudentInsights(analytics.studentProfiles, classAverage);
  const recommendations = generateActionableRecommendations(analytics);
  
  return {
    generatedAt: new Date(),
    period,
    executiveSummary,
    correlationInsights,
    studentInsights,
    recommendations,
    rawData: {
      criticalAlerts: analytics.criticalAlerts,
      opportunities: analytics.opportunities,
      behaviorPatterns: analytics.behaviorPatterns,
    },
  };
}
