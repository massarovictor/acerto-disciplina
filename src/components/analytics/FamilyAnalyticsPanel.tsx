/**
 * Painel de Analytics de Convivência Familiar
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FamilyAnalytics } from '@/hooks/useSchoolAnalytics';
import { getIncidentSeverityLabel } from '@/lib/incidentType';
import { INCIDENT_SEVERITY_COLOR_HEX, UNIFIED_STATUS_TONES } from '@/lib/statusPalette';
import {
  CheckCircle2,
  Clock,
  Home,
  List,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface FamilyAnalyticsPanelProps {
  familyAnalytics: FamilyAnalytics;
}

export function FamilyAnalyticsPanel({
  familyAnalytics,
}: FamilyAnalyticsPanelProps) {
  const [isClassRankingOpen, setIsClassRankingOpen] = useState(false);
  const [isStudentRankingOpen, setIsStudentRankingOpen] = useState(false);

  const {
    incidentsBySeverity,
    classIncidentRanking,
    topStudentsByIncidents,
    monthlyTrend,
    openIncidentsCount,
    resolvedIncidentsCount,
  } = familyAnalytics;

  const totalIncidents = incidentsBySeverity.reduce((sum, item) => sum + item.count, 0);
  const trendColor = UNIFIED_STATUS_TONES.blue;

  return (
    <Card className="border-none shadow-none">
      <CardContent className="px-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Home className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalIncidents}</p>
                  <p className="text-xs text-muted-foreground">Total Familiar</p>
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
                  <p className="text-xs text-muted-foreground">Resolvidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Nível de Atenção</CardTitle>
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
                        <span>{getIncidentSeverityLabel(item.severity, 'acompanhamento_familiar')}</span>
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
                    <XAxis dataKey="monthLabel" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
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
                      name="Familiar"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Turmas com Mais Acompanhamentos Familiares</CardTitle>
            </CardHeader>
            <CardContent>
              {classIncidentRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum acompanhamento familiar registrado</p>
              ) : (
                <div className="space-y-3">
                  {classIncidentRanking.slice(0, 5).map((item, index) => (
                    <div key={item.classData.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}º</span>
                        <div>
                          <p className="text-sm font-medium">{item.classData.name}</p>
                          <p className="text-xs text-muted-foreground">{item.studentCount} alunos</p>
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
                  <Button variant="ghost" size="sm" onClick={() => setIsClassRankingOpen(true)} className="text-xs">
                    Ver ranking completo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alunos com Mais Acompanhamentos Familiares</CardTitle>
            </CardHeader>
            <CardContent>
              {topStudentsByIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum acompanhamento familiar registrado</p>
              ) : (
                <div className="space-y-3">
                  {topStudentsByIncidents.slice(0, 5).map((item, index) => (
                    <div key={item.student.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}º</span>
                        <div>
                          <p className="text-sm font-medium">{item.student.name}</p>
                          <p className="text-xs text-muted-foreground">{item.className}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{item.incidentCount}</span>
                    </div>
                  ))}
                </div>
              )}
              {topStudentsByIncidents.length > 5 && (
                <div className="mt-4 flex justify-center">
                  <Button variant="ghost" size="sm" onClick={() => setIsStudentRankingOpen(true)} className="text-xs">
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
              Ranking de Turmas por Acompanhamentos Familiares
            </DialogTitle>
            <DialogDescription>Listagem completa de turmas ordenada por volume familiar</DialogDescription>
          </DialogHeader>
          <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16 text-center">Posição</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classIncidentRanking.map((item, index) => (
                    <TableRow key={item.classData.id}>
                      <TableCell className="text-center">{index + 1}º</TableCell>
                      <TableCell>{item.classData.name}</TableCell>
                      <TableCell className="text-center font-bold">{item.incidentCount}</TableCell>
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
              Ranking de Alunos por Acompanhamentos Familiares
            </DialogTitle>
            <DialogDescription>Listagem completa de alunos ordenada por volume familiar</DialogDescription>
          </DialogHeader>
          <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16 text-center">Posição</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topStudentsByIncidents.map((item, index) => (
                    <TableRow key={item.student.id}>
                      <TableCell className="text-center">{index + 1}º</TableCell>
                      <TableCell>{item.student.name}</TableCell>
                      <TableCell>{item.className}</TableCell>
                      <TableCell className="text-center font-bold">{item.incidentCount}</TableCell>
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
