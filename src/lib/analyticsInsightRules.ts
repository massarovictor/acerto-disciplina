import { getBrasiliaISODate } from '@/lib/brasiliaDate';

export type InsightType = 'warning' | 'alert' | 'success' | 'info';
export type InsightCategory = 'academic' | 'behavioral' | 'risk' | 'family';
export type InsightEvidenceLevel = 'low' | 'medium' | 'high';

export interface InsightItem {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  actionLabel?: string;
  actionData?: unknown;
  priority?: number;
  semanticKey?: string;
  evidenceLevel?: InsightEvidenceLevel;
}

interface RankingItem {
  classId: string;
  className: string;
  incidentCount: number;
  incidentsPerStudent: number;
  openIncidents: number;
  studentCount: number;
}

interface TrendItem {
  monthLabel: string;
  count: number;
}

interface IncidentLite {
  date: string;
  status: 'aberta' | 'acompanhamento' | 'resolvida';
}

interface GrowthItem {
  classId: string;
  className: string;
  growth: number;
  trendPoints: number;
  studentCount: number;
  gradeSampleCount: number;
}

export interface BehaviorInsightContext {
  openIncidentsCount: number;
  totalIncidents: number;
  severeIncidentsCount: number;
  severityBreakdown: { grave: number; gravissima: number };
  classRanking: RankingItem[];
  monthlyTrend: TrendItem[];
  pendingIncidents: IncidentLite[];
}

export interface FamilyInsightContext {
  openIncidentsCount: number;
  totalIncidents: number;
  severeIncidentsCount: number;
  classRanking: RankingItem[];
  monthlyTrend: TrendItem[];
  pendingIncidents: IncidentLite[];
}

export interface DashboardHighlightContext {
  growthItems: GrowthItem[];
}

const INSIGHT_RULES = {
  behavioral: {
    pendingCriticalMin: 4,
    staleDays: 14,
    staleCriticalMin: 2,
    severeRatioMin: 0.25,
    severeAbsoluteMin: 2,
    outlierMinIncidents: 3,
    outlierFactorVsMedian: 1.6,
    trendPrevMin: 2,
    trendIncreaseMinRatio: 0.35,
  },
  family: {
    pendingCriticalMin: 3,
    staleDays: 21,
    staleCriticalMin: 2,
    severeRatioMin: 0.2,
    severeAbsoluteMin: 2,
    outlierMinIncidents: 2,
    outlierFactorVsMedian: 1.5,
    trendPrevMin: 2,
    trendIncreaseMinRatio: 0.35,
  },
  dashboard: {
    minTrendPoints: 3,
    minVariationAbs: 0.5,
    minStudents: 10,
    minGradeSampleCount: 40,
  },
} as const;

const getPriorityByType = (type: InsightType): number => {
  if (type === 'alert') return 90;
  if (type === 'warning') return 75;
  if (type === 'success') return 60;
  return 50;
};

const getEvidenceBonus = (evidenceLevel?: InsightEvidenceLevel): number => {
  if (evidenceLevel === 'high') return 10;
  if (evidenceLevel === 'medium') return 5;
  return 0;
};

const clampPriority = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const scoreInsightPriority = (insight: InsightItem): number => {
  const base = getPriorityByType(insight.type);
  const evidenceBonus = getEvidenceBonus(insight.evidenceLevel);
  return clampPriority(base + evidenceBonus);
};

export const dedupeInsightsBySemanticKey = <T extends InsightItem>(insights: T[]): T[] => {
  const byKey = new Map<string, T>();

  insights.forEach((insight) => {
    const key = insight.semanticKey || insight.id;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, insight);
      return;
    }

    const currentPriority = current.priority ?? scoreInsightPriority(current);
    const candidatePriority = insight.priority ?? scoreInsightPriority(insight);
    if (candidatePriority > currentPriority) {
      byKey.set(key, insight);
    }
  });

  return Array.from(byKey.values());
};

const sortByPriority = <T extends InsightItem>(insights: T[]): T[] => {
  return [...insights].sort((a, b) => {
    const aPriority = a.priority ?? scoreInsightPriority(a);
    const bPriority = b.priority ?? scoreInsightPriority(b);
    return bPriority - aPriority;
  });
};

const finalizeInsights = <T extends InsightItem>(insights: T[]): T[] => {
  const actionable = insights
    .map((insight) => ({
      ...insight,
      priority: insight.priority ?? scoreInsightPriority(insight),
    }))
    .filter((insight) => {
      const hasAction = Boolean(insight.actionLabel);
      const isCritical = insight.type === 'alert' || insight.type === 'warning';
      return hasAction || isCritical;
    });

  return sortByPriority(dedupeInsightsBySemanticKey(actionable));
};

const getMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const pluralize = (count: number, singular: string, plural: string): string =>
  count === 1 ? singular : plural;

const parseDate = (value: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    return new Date(`${year}-${month}-${day}T12:00:00`);
  }
  return new Date(value);
};

const getPendingOlderThanDays = (pendingIncidents: IncidentLite[], days: number): number => {
  const today = parseDate(getBrasiliaISODate());

  return pendingIncidents.filter((incident) => {
    const date = parseDate(incident.date);
    if (Number.isNaN(date.getTime()) || Number.isNaN(today.getTime())) return false;
    const diffMs = today.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= days;
  }).length;
};

const evaluateTrendIncrease = (
  trend: TrendItem[],
  prevMin: number,
  increaseMinRatio: number,
): { hasIncrease: boolean; increaseRatio: number; prevTotal: number; lastTotal: number } => {
  if (trend.length < 6) {
    return { hasIncrease: false, increaseRatio: 0, prevTotal: 0, lastTotal: 0 };
  }

  const previousWindow = trend.slice(0, 3);
  const latestWindow = trend.slice(-3);

  const prevTotal = previousWindow.reduce((sum, item) => sum + item.count, 0);
  const lastTotal = latestWindow.reduce((sum, item) => sum + item.count, 0);

  if (prevTotal < prevMin) {
    return { hasIncrease: false, increaseRatio: 0, prevTotal, lastTotal };
  }

  const increaseRatio = (lastTotal - prevTotal) / prevTotal;
  return {
    hasIncrease: increaseRatio >= increaseMinRatio,
    increaseRatio,
    prevTotal,
    lastTotal,
  };
};

export const buildBehaviorInsights = (ctx: BehaviorInsightContext): InsightItem[] => {
  const rules = INSIGHT_RULES.behavioral;
  const insights: InsightItem[] = [];

  const stalePending = getPendingOlderThanDays(ctx.pendingIncidents, rules.staleDays);
  const stalePendingDetail =
    stalePending > 0
      ? `; ${stalePending} estão abertos há mais de ${rules.staleDays} dias`
      : '';
  if (ctx.openIncidentsCount >= rules.pendingCriticalMin || stalePending >= rules.staleCriticalMin) {
    insights.push({
      id: 'behavior-pending-critical',
      semanticKey: 'behavior-pending-critical',
      type: 'alert',
      category: 'behavioral',
      title: `${ctx.openIncidentsCount} ${pluralize(
        ctx.openIncidentsCount,
        'caso disciplinar em aberto',
        'casos disciplinares em aberto',
      )}`,
      description: `Há ${ctx.openIncidentsCount} registros disciplinares sem fechamento${stalePendingDetail}. Isso pode atrasar intervenções com os alunos. Sugestão: revisar os casos com a coordenação e definir encaminhamento nesta semana.`,
      actionLabel: 'Abrir casos em aberto',
      actionData: { filter: 'open' },
      evidenceLevel: stalePending >= rules.staleCriticalMin ? 'high' : 'medium',
    });
  }

  const severeRatio = ctx.totalIncidents > 0 ? ctx.severeIncidentsCount / ctx.totalIncidents : 0;
  if (ctx.severeIncidentsCount >= rules.severeAbsoluteMin && severeRatio >= rules.severeRatioMin) {
    insights.push({
      id: 'behavior-severe-concentration',
      semanticKey: 'behavior-severe-concentration',
      type: 'alert',
      category: 'behavioral',
      title: `${ctx.severeIncidentsCount} ${pluralize(
        ctx.severeIncidentsCount,
        'caso grave ou gravíssimo',
        'casos graves ou gravíssimos',
      )}`,
      description: `Foram identificados ${ctx.severityBreakdown.grave} casos graves e ${ctx.severityBreakdown.gravissima} gravíssimos, totalizando ${(severeRatio * 100).toFixed(0)}% dos registros disciplinares. Isso exige resposta mais rápida da equipe. Sugestão: acompanhar esses alunos semanalmente com plano de ação.`,
      actionLabel: 'Ver casos graves',
      actionData: { severity: ['grave', 'gravissima'] },
      evidenceLevel: severeRatio >= 0.4 ? 'high' : 'medium',
    });
  }

  if (ctx.classRanking.length > 0) {
    const classRates = ctx.classRanking
      .filter((item) => item.studentCount > 0)
      .map((item) => item.incidentsPerStudent);
    const medianRate = getMedian(classRates);
    const top = ctx.classRanking[0];

    if (
      top &&
      top.incidentCount >= rules.outlierMinIncidents &&
      top.incidentsPerStudent >= medianRate * rules.outlierFactorVsMedian &&
      top.studentCount > 0
    ) {
      insights.push({
        id: 'behavior-class-outlier',
        semanticKey: 'behavior-class-outlier',
        type: 'warning',
        category: 'behavioral',
        title: `${top.className} com atenção maior em convivência`,
        description: `Essa turma teve ${top.incidentCount} registros no período, acima do padrão observado nas demais turmas. Isso indica concentração de ocorrências na turma. Sugestão: alinhar estratégia com a equipe docente e coordenação.`,
        actionLabel: 'Ver turma',
        actionData: { classId: top.classId },
        evidenceLevel: 'high',
      });
    }
  }

  const trend = evaluateTrendIncrease(
    ctx.monthlyTrend,
    rules.trendPrevMin,
    rules.trendIncreaseMinRatio,
  );
  if (trend.hasIncrease) {
    insights.push({
      id: 'behavior-trend-worsening',
      semanticKey: 'behavior-trend-worsening',
      type: 'warning',
      category: 'behavioral',
      title: 'Aumento recente de ocorrências disciplinares',
      description: `Nos últimos 3 meses, houve ${trend.lastTotal} registros, contra ${trend.prevTotal} nos 3 meses anteriores (${(trend.increaseRatio * 100).toFixed(0)}% de aumento). Isso pode indicar piora no clima da turma. Sugestão: reforçar ações preventivas no próximo ciclo.`,
      actionLabel: 'Ver tendência',
      actionData: { source: 'monthlyTrend' },
      evidenceLevel: 'high',
    });
  }

  return finalizeInsights(insights);
};

export const buildFamilyInsights = (ctx: FamilyInsightContext): InsightItem[] => {
  const rules = INSIGHT_RULES.family;
  const insights: InsightItem[] = [];

  const stalePending = getPendingOlderThanDays(ctx.pendingIncidents, rules.staleDays);
  const staleFamilyPendingDetail =
    stalePending > 0
      ? `; ${stalePending} estão abertos há mais de ${rules.staleDays} dias`
      : '';
  if (ctx.openIncidentsCount >= rules.pendingCriticalMin || stalePending >= rules.staleCriticalMin) {
    insights.push({
      id: 'family-pending-critical',
      semanticKey: 'family-pending-critical',
      type: 'warning',
      category: 'family',
      title: `${ctx.openIncidentsCount} ${pluralize(
        ctx.openIncidentsCount,
        'acompanhamento familiar em aberto',
        'acompanhamentos familiares em aberto',
      )}`,
      description: `Há ${ctx.openIncidentsCount} acompanhamentos familiares sem fechamento${staleFamilyPendingDetail}. Isso pode atrasar o apoio ao aluno e à família. Sugestão: priorizar contato e registrar os encaminhamentos.`,
      actionLabel: 'Abrir casos em aberto',
      actionData: { filter: 'open' },
      evidenceLevel: stalePending >= rules.staleCriticalMin ? 'high' : 'medium',
    });
  }

  const severeRatio = ctx.totalIncidents > 0 ? ctx.severeIncidentsCount / ctx.totalIncidents : 0;
  if (ctx.severeIncidentsCount >= rules.severeAbsoluteMin && severeRatio >= rules.severeRatioMin) {
    insights.push({
      id: 'family-severe-concentration',
      semanticKey: 'family-severe-concentration',
      type: 'warning',
      category: 'family',
      title: `${ctx.severeIncidentsCount} ${pluralize(
        ctx.severeIncidentsCount,
        'caso familiar de maior gravidade',
        'casos familiares de maior gravidade',
      )}`,
      description: `${(severeRatio * 100).toFixed(0)}% dos acompanhamentos familiares estão em nível grave ou gravíssimo. Esses casos pedem resposta rápida e articulada com os responsáveis. Sugestão: priorizar plano de acompanhamento com coordenação.`,
      actionLabel: 'Ver casos graves',
      actionData: { severity: ['grave', 'gravissima'] },
      evidenceLevel: severeRatio >= 0.35 ? 'high' : 'medium',
    });
  }

  if (ctx.classRanking.length > 0) {
    const classRates = ctx.classRanking
      .filter((item) => item.studentCount > 0)
      .map((item) => item.incidentsPerStudent);
    const medianRate = getMedian(classRates);
    const top = ctx.classRanking[0];

    if (
      top &&
      top.incidentCount >= rules.outlierMinIncidents &&
      top.incidentsPerStudent >= medianRate * rules.outlierFactorVsMedian &&
      top.studentCount > 0
    ) {
      insights.push({
        id: 'family-class-outlier',
        semanticKey: 'family-class-outlier',
        type: 'info',
        category: 'family',
        title: `${top.className} concentra mais acompanhamentos familiares`,
        description: `Essa turma concentrou mais acompanhamentos familiares no período do que o padrão das demais turmas. Isso sugere maior demanda de apoio no grupo. Sugestão: mapear os casos e organizar agenda de contato com as famílias.`,
        actionLabel: 'Ver turma',
        actionData: { classId: top.classId },
        evidenceLevel: 'high',
      });
    }
  }

  const trend = evaluateTrendIncrease(
    ctx.monthlyTrend,
    rules.trendPrevMin,
    rules.trendIncreaseMinRatio,
  );
  if (trend.hasIncrease) {
    insights.push({
      id: 'family-trend-worsening',
      semanticKey: 'family-trend-worsening',
      type: 'warning',
      category: 'family',
      title: 'Aumento recente em acompanhamentos familiares',
      description: `Nos últimos 3 meses, foram ${trend.lastTotal} registros, contra ${trend.prevTotal} nos 3 meses anteriores (${(trend.increaseRatio * 100).toFixed(0)}% de aumento). Isso indica maior necessidade de apoio às famílias. Sugestão: reforçar acompanhamento preventivo nas turmas com mais casos.`,
      actionLabel: 'Ver tendência',
      actionData: { source: 'monthlyTrend' },
      evidenceLevel: 'high',
    });
  }

  return finalizeInsights(insights);
};

export const buildDashboardHighlights = (ctx: DashboardHighlightContext): InsightItem[] => {
  const rules = INSIGHT_RULES.dashboard;

  const qualified = ctx.growthItems.filter(
    (item) =>
      item.trendPoints >= rules.minTrendPoints &&
      item.studentCount >= rules.minStudents &&
      item.gradeSampleCount >= rules.minGradeSampleCount,
  );

  const insights: InsightItem[] = [];

  if (qualified.length > 0) {
    const bestGrowth = qualified.reduce((best, current) =>
      current.growth > best.growth ? current : best,
    );

    if (bestGrowth.growth >= rules.minVariationAbs) {
      insights.push({
        id: 'dashboard-best-growth',
        semanticKey: 'dashboard-best-growth',
        type: 'success',
        category: 'academic',
        title: `${bestGrowth.className} em evolução consistente`,
        description: `A turma avançou ${bestGrowth.growth.toFixed(1)} pontos, com dados consistentes em ${bestGrowth.trendPoints} bimestres. Isso indica melhora real no desempenho. Sugestão: registrar a estratégia pedagógica que funcionou e compartilhar com as demais turmas.`,
        actionLabel: 'Ver turma',
        actionData: { classId: bestGrowth.classId },
        evidenceLevel: 'high',
      });
    }

    const worstGrowth = qualified.reduce((worst, current) =>
      current.growth < worst.growth ? current : worst,
    );

    if (worstGrowth.growth <= -rules.minVariationAbs) {
      insights.push({
        id: 'dashboard-worst-growth',
        semanticKey: 'dashboard-worst-growth',
        type: 'warning',
        category: 'risk',
        title: `${worstGrowth.className} com queda consistente`,
        description: `A turma caiu ${Math.abs(worstGrowth.growth).toFixed(1)} pontos, com evidência em ${worstGrowth.trendPoints} bimestres. Isso aumenta o risco de mais alunos em atenção. Sugestão: priorizar plano de recuperação para a turma nas próximas avaliações.`,
        actionLabel: 'Ver turma',
        actionData: { classId: worstGrowth.classId },
        evidenceLevel: 'high',
      });
    }
  }

  return finalizeInsights(insights);
};
