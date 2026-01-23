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
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIncidents, useClasses, useStudents } from '@/hooks/useData';
import { SchoolConfigDialog } from '@/components/settings/SchoolConfigDialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

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

  // Calculate badges
  const activeClasses = classes.filter(c => !c.archived);
  const activeStudents = students.filter(s => s.status === 'active');
  const pendingIncidents = incidents.filter(i => i.status !== 'resolvida');

  const navigationCards: NavigationCard[] = [
    {
      title: 'Turmas',
      description: 'Gerencie e visualize todas as turmas e cursos',
      icon: GraduationCap,
      path: '/turmas',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      badge: activeClasses.length > 0 ? activeClasses.length : undefined,
      badgeVariant: 'secondary',
    },
    {
      title: 'Alunos',
      description: 'Acesso completo ao perfil e dados dos estudantes',
      icon: Users,
      path: '/alunos',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      badge: activeStudents.length > 0 ? activeStudents.length : undefined,
      badgeVariant: 'secondary',
    },
    {
      title: 'Notas e Frequência',
      description: 'Lançamento e acompanhamento de desempenho',
      icon: ClipboardList,
      path: '/notas-frequencia',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
    },
    {
      title: 'Ocorrências',
      description: 'Registro de eventos disciplinares e avisos',
      icon: AlertTriangle,
      path: '/ocorrencias',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      badge: pendingIncidents.length > 0 ? pendingIncidents.length : undefined,
      badgeVariant: 'destructive',
    },
    {
      title: 'Relatórios',
      description: 'Geração e análise de relatórios escolares',
      icon: FileBarChart,
      path: '/relatorios',
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-500',
    },
    {
      title: 'Analytics',
      description: 'Painéis de indicadores e métricas da escola',
      icon: TrendingUp,
      path: '/analytics',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
    {
      title: 'Trajetória Acadêmica',
      description: 'Acompanhamento longitudinal do aluno',
      icon: GraduationCap,
      path: '/trajetoria',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-500',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={
          <>
            <Sparkles className="h-6 w-6 text-primary" />
            <span>Olá, {user?.email?.split('@')[0] || 'Usuário'}</span>
          </>
        }
        description="O que você gostaria de fazer hoje?"
        actions={
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowSchoolConfig(true)}
            className="gap-2"
          >
            <Settings className="h-5 w-5" />
            Configurar Escola
          </Button>
        }
      />

      {/* Navigation Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {navigationCards.map((card) => (
          <Card
            key={card.path}
            className="
              group cursor-pointer overflow-hidden transition-all duration-300
              hover:border-primary/50 hover:shadow-lg hover:-translate-y-1
              bg-muted/50 border
            "
            onClick={() => navigate(card.path)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                {card.badge !== undefined && (
                  <Badge
                    variant={card.badgeVariant || 'default'}
                    className="text-xs font-semibold"
                  >
                    {card.badge}
                  </Badge>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {card.title}
              </h3>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {card.description}
              </p>

              <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Acessar
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Archived Classes Link */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/turmas-arquivadas')}
        >
          Ver turmas arquivadas
          <ArrowRight className="h-4 w-4 ml-1" />
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
