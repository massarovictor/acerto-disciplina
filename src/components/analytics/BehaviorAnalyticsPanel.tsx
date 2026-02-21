/**
 * Painel de Analytics Comportamental
 * 
 * Exibe dados de convivência disciplinar:
 * - Resumo por severidade
 * - Ranking de turmas por acompanhamentos
 * - Top alunos com acompanhamentos
 * - Gráfico de tendência mensal
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import {
    BehavioralAnalytics,
} from '@/hooks/useSchoolAnalytics';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { List } from 'lucide-react';
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
}

import {
    getSeverityLabel,
} from '@/lib/incidentUtils';
import { INCIDENT_SEVERITY_COLOR_HEX, UNIFIED_STATUS_TONES } from '@/lib/statusPalette';

export function BehaviorAnalyticsPanel({
    behavioralAnalytics,
}: BehaviorAnalyticsPanelProps) {
    const [isClassRankingOpen, setIsClassRankingOpen] = useState(false);
    const [isStudentRankingOpen, setIsStudentRankingOpen] = useState(false);

    const {
        incidentsBySeverity,
        classIncidentRanking,
        topStudentsByIncidents,
        monthlyTrend,
        openIncidentsCount,
        resolvedIncidentsCount,
    } = behavioralAnalytics;

    const totalIncidents = incidentsBySeverity.reduce((sum, s) => sum + s.count, 0);
    const trendColor = UNIFIED_STATUS_TONES.green;

    return (
        <Card className="border-none shadow-none">

            <CardContent className="px-0 space-y-6">
                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-warning/10">
                                    <AlertTriangle className="h-5 w-5 text-warning" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalIncidents}</p>
                                    <p className="text-xs text-muted-foreground">Total Disciplinar</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-warning/10">
                                    <Clock className="h-5 w-5 text-warning" />
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
                                <div className="p-2 rounded-lg bg-info/10">
                                    <CheckCircle2 className="h-5 w-5 text-info" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{resolvedIncidentsCount}</p>
                                    <p className="text-xs text-muted-foreground">Resolvidas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Grid Principal */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Acompanhamentos por Severidade */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Distribuição por Severidade</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {incidentsBySeverity.map((item) => {
                                const severityColor = INCIDENT_SEVERITY_COLOR_HEX[item.severity];
                                return (
                                    <div key={item.severity} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: severityColor }}
                                                />
                                                <span>{getSeverityLabel(item.severity)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{item.count}</span>
                                                <span className="text-muted-foreground">({item.percent.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${item.percent}%`,
                                                    backgroundColor: severityColor,
                                                }}
                                            />
                                        </div>
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
                                            dataKey="monthLabel"
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
                                            name="Disciplinares"
                                            stroke={trendColor}
                                            fill={trendColor}
                                            fillOpacity={0.28}
                                            strokeWidth={3}
                                            dot={{ r: 3, fill: trendColor, stroke: '#ffffff', strokeWidth: 1.5 }}
                                            activeDot={{ r: 5, fill: trendColor, stroke: '#ffffff', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ranking de Turmas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Turmas com Mais Ocorrências Disciplinares</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {classIncidentRanking.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhum acompanhamento registrado
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {classIncidentRanking.length > 5 && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsClassRankingOpen(true)}
                                        className="text-xs"
                                    >
                                        Ver ranking completo
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Alunos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Alunos com Mais Ocorrências Disciplinares</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topStudentsByIncidents.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhum acompanhamento registrado
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
                                                        <Badge variant="outline" className="text-[10px] px-1 bg-destructive/15 text-destructive border-destructive/30">
                                                            {item.severities.gravissima}G
                                                        </Badge>
                                                    )}
                                                    {item.severities.grave > 0 && (
                                                        <Badge variant="outline" className="text-[10px] px-1 bg-warning/15 text-warning border-warning/30">
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

                            {topStudentsByIncidents.length > 5 && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsStudentRankingOpen(true)}
                                        className="text-xs"
                                    >
                                        Ver ranking completo
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </CardContent>

            <Dialog open={isClassRankingOpen} onOpenChange={setIsClassRankingOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-full bg-primary/10">
                                <List className="h-5 w-5 text-primary" />
                            </div>
                            Ranking de Turmas por Ocorrências Disciplinares
                        </DialogTitle>
                        <DialogDescription>
                            Listagem completa de turmas ordenada por volume disciplinar
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pb-2">
                        <span>{classIncidentRanking.length} turmas com registros</span>
                    </div>

                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-y-auto flex-1">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center text-info">Leve</TableHead>
                                        <TableHead className="text-center text-warning">Intermed.</TableHead>
                                        <TableHead className="text-center text-warning">Grave</TableHead>
                                        <TableHead className="text-center text-destructive">Gravíssima</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classIncidentRanking.map((item, index) => (
                                        <TableRow key={item.classData.id}>
                                            <TableCell className="text-center font-medium">
                                                <Badge
                                                    variant={index < 3 ? 'outline' : 'outline'}
                                                    className={
                                                        index === 0 ? 'bg-severity-critical/20 text-severity-critical border-severity-critical/50' :
                                                            index === 1 ? 'bg-severity-serious/20 text-severity-serious border-severity-serious/50' :
                                                                index === 2 ? 'bg-severity-intermediate/20 text-severity-intermediate border-severity-intermediate/50' : ''
                                                    }
                                                >
                                                    {index + 1}º
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>
                                                    <p>{item.classData.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.studentCount} alunos</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-lg">{item.incidentCount}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{item.severities.leve || '-'}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{item.severities.intermediaria || '-'}</TableCell>
                                            <TableCell className="text-center font-medium text-warning">
                                                {item.severities.grave > 0 ? (
                                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                                        {item.severities.grave}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-destructive">
                                                {item.severities.gravissima > 0 ? (
                                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                                        {item.severities.gravissima}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isStudentRankingOpen} onOpenChange={setIsStudentRankingOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-full bg-primary/10">
                                <List className="h-5 w-5 text-primary" />
                            </div>
                            Ranking de Alunos por Ocorrências Disciplinares
                        </DialogTitle>
                        <DialogDescription>
                            Listagem completa de alunos ordenada por volume disciplinar
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pb-2">
                        <span>{topStudentsByIncidents.length} alunos com registros</span>
                    </div>

                    <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-y-auto flex-1">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Aluno</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center text-info">Leve</TableHead>
                                        <TableHead className="text-center text-warning">Intermed.</TableHead>
                                        <TableHead className="text-center text-warning">Grave</TableHead>
                                        <TableHead className="text-center text-destructive">Gravíssima</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topStudentsByIncidents.map((item, index) => (
                                        <TableRow key={item.student.id}>
                                            <TableCell className="text-center font-medium">
                                                <Badge
                                                    variant={index < 3 ? 'outline' : 'outline'}
                                                    className={
                                                        index === 0 ? 'bg-severity-critical/20 text-severity-critical border-severity-critical/50' :
                                                            index === 1 ? 'bg-severity-serious/20 text-severity-serious border-severity-serious/50' :
                                                                index === 2 ? 'bg-severity-intermediate/20 text-severity-intermediate border-severity-intermediate/50' : ''
                                                    }
                                                >
                                                    {index + 1}º
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>
                                                    <p>{item.student.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.className}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-lg">{item.incidentCount}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{item.severities.leve || '-'}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{item.severities.intermediaria || '-'}</TableCell>
                                            <TableCell className="text-center font-medium text-warning">
                                                {item.severities.grave > 0 ? (
                                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                                        {item.severities.grave}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-destructive">
                                                {item.severities.gravissima > 0 ? (
                                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                                        {item.severities.gravissima}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
