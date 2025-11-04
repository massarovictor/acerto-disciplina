import { Home, FileText, School, Users, BookOpen, BarChart3, Settings, GraduationCap, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/', roles: ['professor', 'diretor', 'coordenador', 'secretaria'] },
  { icon: AlertTriangle, label: 'Ocorrências', path: '/ocorrencias', roles: ['professor', 'diretor', 'coordenador', 'secretaria'] },
  { icon: FileText, label: 'Nova Ocorrência', path: '/nova-ocorrencia', roles: ['professor', 'diretor', 'coordenador'] },
  { icon: School, label: 'Turmas', path: '/turmas', roles: ['diretor', 'coordenador'] },
  { icon: Users, label: 'Alunos', path: '/alunos', roles: ['diretor', 'coordenador', 'secretaria'] },
  { icon: BookOpen, label: 'Notas & Frequência', path: '/notas-frequencia', roles: ['professor', 'diretor', 'coordenador'] },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios', roles: ['diretor', 'coordenador'] },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Sistema de Ocorrências</span>
            <span className="text-xs text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
