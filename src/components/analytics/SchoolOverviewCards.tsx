/**
 * Cards de Visão Geral da Escola
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Clock, AlertTriangle } from 'lucide-react';
import { SchoolOverview, CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '@/hooks/useSchoolAnalytics';

interface SchoolOverviewCardsProps {
  overview: SchoolOverview;
}

export function SchoolOverviewCards({ overview }: SchoolOverviewCardsProps) {
  const cards = [
    {
      title: 'Total de Alunos',
      value: overview.totalStudents.toString(),
      icon: Users,
      description: `${overview.totalClasses} turmas ativas`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Média Geral',
      value: overview.overallAverage.toFixed(1),
      icon: GraduationCap,
      description: overview.overallAverage >= 6 ? 'Acima da média' : 'Abaixo da média',
      color: overview.overallAverage >= 6 ? 'text-emerald-600' : 'text-red-600',
      bgColor: overview.overallAverage >= 6 ? 'bg-emerald-100' : 'bg-red-100',
    },
    // DISABLED: Frequência removida temporariamente
    // {
    //   title: 'Frequência',
    //   value: `${overview.overallFrequency.toFixed(0)}%`,
    //   icon: Clock,
    //   description: overview.overallFrequency >= 75 ? 'Adequada' : 'Atenção necessária',
    //   color: overview.overallFrequency >= 75 ? 'text-emerald-600' : 'text-amber-600',
    //   bgColor: overview.overallFrequency >= 75 ? 'bg-emerald-100' : 'bg-amber-100',
    // },
    {
      title: 'Ocorrências',
      value: overview.totalIncidents.toString(),
      icon: AlertTriangle,
      description: 'Total registrado',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`${card.bgColor} ${card.color} p-2 rounded-lg`}>
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Classification Summary */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {(Object.keys(overview.classifications) as Array<keyof typeof overview.classifications>).map((key) => {
              const count = overview.classifications[key];
              const percent = overview.totalStudents > 0
                ? ((count / overview.totalStudents) * 100).toFixed(0)
                : '0';

              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg border"
                  style={{ borderColor: CLASSIFICATION_COLORS[key] }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CLASSIFICATION_COLORS[key] }}
                  />
                  <div>
                    <p className="text-sm font-medium">{CLASSIFICATION_LABELS[key]}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} alunos ({percent}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
