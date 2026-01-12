import { Home, School, Users, BookOpen, BarChart3, GraduationCap, AlertTriangle, LineChart, Shield } from 'lucide-react';
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
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: LineChart, label: 'Analytics', path: '/analytics' },
  { icon: AlertTriangle, label: 'Ocorrências', path: '/ocorrencias' },
  { icon: School, label: 'Turmas', path: '/turmas' },
  { icon: Users, label: 'Alunos', path: '/alunos' },
  { icon: BookOpen, label: 'Notas', path: '/notas-frequencia' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();


  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">MAVIC</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Sistema de Acompanhamento Escolar</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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

        {/* Admin Section */}
        {isAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/usuarios')}
                    isActive={location.pathname === '/usuarios'}
                    tooltip="Usuários"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Usuários</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
