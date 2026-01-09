/**
 * Painel de Analytics Comportamental
 * 
 * Exibe dados de ocorrências disciplinares:
 * - Resumo por severidade
 * - Ranking de turmas por ocorrências
 * - Top alunos com ocorrências
 * - Gráfico de tendência mensal
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    AlertTriangle,
    Users,
    TrendingDown,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import {
    BehavioralAnalytics,
    Insight,
} from '@/hooks/useSchoolAnalytics';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

interface BehaviorAnalyticsPanelProps {
    behavioralAnalytics: BehavioralAnalytics;
    behavioralInsights: Insight[];
}

const SEVERITY_CONFIG = {
    leve: { label: 'Leve', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-100' },
    intermediaria: { label: 'Intermediária', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-100' },
    grave: { label: 'Grave', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-100' },
    gravissima: { label: 'Gravíssima', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-100' },
};

const InsightIcon = ({ type }: { type: Insight['type'] }) => {
    const iconClass = 'h-4 w-4';
    switch (type) {
        case 'alert':
            return <AlertTriangle className={`${iconClass} text-red-500`} />;
        case 'warning':
            return <AlertCircle className={`${iconClass} text-amber-500`} />;
        case 'success':
            return <CheckCircle2 className={`${iconClass} text-emerald-500`} />;
        default:
            return <AlertCircle className={`${iconClass} text-blue-500`} />;
    }
};

export function BehaviorAnalyticsPanel({
    behavioralAnalytics,
    behavioralInsights
}: BehaviorAnalyticsPanelProps) {
    const {
        incidentsBySeverity,
        classIncidentRanking,
        topStudentsByIncidents,
        monthlyTrend,
        openIncidentsCount,
        resolvedIncidentsCount,
        averageIncidentsPerStudent,
    } = behavioralAnalytics;

    const totalIncidents = incidentsBySeverity.reduce((sum, s) => sum + s.count, 0);

    return (
        <div className="space-y-6">
            {/* Header da Seção */}
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-semibold">Comportamento e Disciplina</h2>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalIncidents}</p>
                                <p className="text-xs text-muted-foreground">Total de Ocorrências</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <Clock className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{openIncidentsCount}</p>
                                <p className="text-xs text-muted-foreground">Pendentes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{resolvedIncidentsCount}</p>
                                <p className="text-xs text-muted-foreground">Resolvidas</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10">
                                <Users className="h-5 w-5 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{averageIncidentsPerStudent.toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">Por Aluno</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid Principal */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Ocorrências por Severidade */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Distribuição por Severidade</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {incidentsBySeverity.map((item) => {
                            const config = SEVERITY_CONFIG[item.severity];
                            return (
                                <div key={item.severity} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${config.color}`} />
                                            <span>{config.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.count}</span>
                                            <span className="text-muted-foreground">({item.percent.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={item.percent}
                                        className="h-2"
                                    />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Tendência Mensal */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Tendência Mensal</CardTitle>
                        <CardDescription>Últimos 6 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="month"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                        }}
                                        labelStyle={{ fontWeight: 600 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="Ocorrências"
                                        stroke="hsl(var(--primary))"
                                        fill="hsl(var(--primary))"
                                        fillOpacity={0.2}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Ranking de Turmas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Turmas com Mais Ocorrências</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {classIncidentRanking.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhuma ocorrência registrada
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {classIncidentRanking.slice(0, 5).map((item, index) => (
                                    <div
                                        key={item.classData.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-muted-foreground w-5">
                                                {index + 1}º
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium">{item.classData.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.studentCount} alunos
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold">{item.incidentCount}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.incidentsPerStudent.toFixed(1)}/aluno
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Alunos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Alunos com Mais Ocorrências</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topStudentsByIncidents.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhuma ocorrência registrada
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {topStudentsByIncidents.slice(0, 5).map((item, index) => (
                                    <div
                                        key={item.student.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-muted-foreground w-5">
                                                {index + 1}º
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium">{item.student.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.className}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {item.severities.gravissima > 0 && (
                                                    <Badge variant="outline" className="text-[10px] px-1 bg-red-100 text-red-700 border-red-200">
                                                        {item.severities.gravissima}G
                                                    </Badge>
                                                )}
                                                {item.severities.grave > 0 && (
                                                    <Badge variant="outline" className="text-[10px] px-1 bg-orange-100 text-orange-700 border-orange-200">
                                                        {item.severities.grave}g
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold">{item.incidentCount}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Insights Comportamentais */}
            {behavioralInsights.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            Insights Comportamentais
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-2">
                            {behavioralInsights.map(insight => (
                                <div
                                    key={insight.id}
                                    className={`p-3 rounded-lg border-l-4 ${insight.type === 'alert' ? 'border-l-red-500 bg-red-50/50' :
                                            insight.type === 'warning' ? 'border-l-amber-500 bg-amber-50/50' :
                                                insight.type === 'success' ? 'border-l-emerald-500 bg-emerald-50/50' :
                                                    'border-l-blue-500 bg-blue-50/50'
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <InsightIcon type={insight.type} />
                                        <div>
                                            <h4 className="font-medium text-sm">{insight.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {insight.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
