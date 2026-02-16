import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  ClipboardList,
  AlertTriangle,
  FileBarChart,
  TrendingUp,
  Settings,
  ArrowRight,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIncidents, useClasses, useStudents } from '@/hooks/useData';
import { SchoolConfigDialog } from '@/components/settings/SchoolConfigDialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget';
import { OperatingStatus } from '@/components/dashboard/OperatingStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

interface NavigationCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  iconBg: string;
  iconColor: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'destructive' | 'secondary';
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  const { classes } = useClasses();
  const { students } = useStudents();

  const [showSchoolConfig, setShowSchoolConfig] = useState(false);

  // Calculate badges and counts
  const activeClasses = classes.filter(c => !c.archived);
  const activeStudents = students.filter(s => s.status === 'active');
  const activeClassIds = new Set(activeClasses.map((c) => c.id));
  const pendingIncidents = incidents.filter(
    (i) => i.status !== 'resolvida' && activeClassIds.has(i.classId),
  );

  const navigationCards: NavigationCard[] = [
    {
      title: 'Turmas',
      description: 'Gestão de turmas',
      icon: GraduationCap,
      path: '/turmas',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Alunos',
      description: 'Gestão de estudantes',
      icon: Users,
      path: '/alunos',
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Notas/Freq.',
      description: 'Diário de classe',
      icon: ClipboardList,
      path: '/notas-frequencia',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Ocorrências',
      description: 'Registro disciplinar',
      icon: AlertTriangle,
      path: '/ocorrencias',
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: pendingIncidents.length > 0 ? pendingIncidents.length : undefined,
      badgeVariant: 'destructive',
    },
    {
      title: 'Relatórios',
      description: 'Documentos e atas',
      icon: FileBarChart,
      path: '/relatorios',
      iconBg: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Analytics',
      description: 'Indicadores',
      icon: TrendingUp,
      path: '/analytics',
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Trajetória',
      description: 'Histórico longitudinal',
      icon: GraduationCap,
      path: '/trajetoria',
      iconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            <Sparkles className="h-6 w-6 text-primary" />
            <span>Olá, {user?.email?.split('@')[0] || 'Gestor'}</span>
          </>
        }
        description={`Hoje é ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchoolConfig(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        }
      />

      {/* 1. Operating Status (Top KPIs) */}
      <OperatingStatus
        studentsCount={activeStudents.length}
        classesCount={activeClasses.length}
        pendingIncidentsCount={pendingIncidents.length}
      />

      {/* 2. Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column (2/3): Recent Activity */}
        <div className="lg:col-span-2 h-full">
          <RecentActivity incidents={incidents} students={students} />
        </div>

        {/* Right Column (1/3): Birthdays */}
        <div className="space-y-6 flex flex-col h-full">
          <div className="flex-1">
            <BirthdayWidget students={students} classes={classes} />
          </div>
        </div>
      </div>

      {/* 3. Applications Menu (Former Navigation Cards) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <LayoutGrid className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-foreground">Aplicativos</h2>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {navigationCards.map((card) => (
            <Card
              key={card.path}
              className="
                group cursor-pointer overflow-hidden transition-all duration-200
                hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5
                bg-card border h-full
                "
              onClick={() => navigate(card.path)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-xl ${card.iconBg} transition-transform group-hover:scale-110`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    {card.badge !== undefined && (
                      <Badge
                        variant={card.badgeVariant || 'default'}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Archived Classes Link */}
      <div className="flex justify-center mt-12 mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={() => navigate('/turmas-arquivadas')}
        >
          Ver turmas arquivadas
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* School Config Dialog */}
      <SchoolConfigDialog
        open={showSchoolConfig}
        onOpenChange={setShowSchoolConfig}
      />
    </PageContainer>
  );
};
export default Dashboard;
