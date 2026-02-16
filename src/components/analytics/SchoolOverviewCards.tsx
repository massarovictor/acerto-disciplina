/**
 * Cards de Visão Geral da Escola
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Clock, AlertTriangle } from 'lucide-react';
import { SchoolOverview, CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '@/hooks/useSchoolAnalytics';

interface SchoolOverviewCardsProps {
  overview: SchoolOverview;
  showBehavior?: boolean;
  showClassification?: boolean;
  subjectMode?: boolean;
  hasGrades?: boolean;
}

export function SchoolOverviewCards({
  overview,
  showBehavior = true,
  showClassification = true,
  subjectMode = false,
  hasGrades = true,
}: SchoolOverviewCardsProps) {
  const cards = [
    {
      title: 'Total de Alunos',
      value: overview.totalStudents.toString(),
      icon: Users,
      description: `${overview.totalClasses} turmas ativas`,
      color: 'text-info dark:text-info',
      bgColor: 'bg-info/15 dark:bg-info/20',
    },
    {
      title: subjectMode ? 'Média do Recorte' : 'Média Geral',
      value: hasGrades ? overview.overallAverage.toFixed(1) : '—',
      icon: GraduationCap,
      description: hasGrades
        ? subjectMode
          ? 'Média nas disciplinas selecionadas'
          : overview.overallAverage >= 6 ? 'Acima da média' : 'Abaixo da média'
        : 'Sem notas lançadas no recorte',
      color: hasGrades
        ? overview.overallAverage >= 6 ? 'text-success dark:text-success' : 'text-destructive dark:text-destructive'
        : 'text-muted-foreground',
      bgColor: hasGrades
        ? overview.overallAverage >= 6 ? 'bg-success/15 dark:bg-success/20' : 'bg-destructive/15 dark:bg-destructive/20'
        : 'bg-muted',
    },
    // DISABLED: Frequência removida temporariamente
    // {
    //   title: 'Frequência',
    //   value: `${overview.overallFrequency.toFixed(0)}%`,
    //   icon: Clock,
    //   description: overview.overallFrequency >= 75 ? 'Adequada' : 'Atenção necessária',
    //   color: overview.overallFrequency >= 75 ? 'text-success dark:text-success' : 'text-warning dark:text-warning',
    //   bgColor: overview.overallFrequency >= 75 ? 'bg-success/15 dark:bg-success/20' : 'bg-warning/15 dark:bg-warning/20',
    // },
    ...(showBehavior
      ? [
        {
          title: 'Ocorrências',
          value: overview.totalIncidents.toString(),
          icon: AlertTriangle,
          description: 'Total registrado',
          color: 'text-warning dark:text-warning',
          bgColor: 'bg-warning/15 dark:bg-warning/20',
        },
      ]
      : []),
  ];

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
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
    </div>
  );
}
