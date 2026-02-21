import { Shield } from 'lucide-react';
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
import { getSidebarNavItems } from '@/lib/navigationSearchIndex';
import { resolveUserRole } from '@/lib/dashboardRoleScope';

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, profile, user } = useAuth();
  const role = resolveUserRole({ profile, user });
  const menuItems = getSidebarNavItems(role);


  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="bg-brand-500 text-white rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
            <img src="/logo-white.svg" alt="MAVIC Logo" className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold leading-none lowercase tracking-tighter text-foreground" style={{ fontFamily: 'Sora, sans-serif' }}>mavic</span>
            <span className="text-xs font-normal text-muted-foreground leading-none mt-1" style={{ fontFamily: 'Geist, sans-serif' }}>Sistema de Acompanhamento Escolar</span>
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
