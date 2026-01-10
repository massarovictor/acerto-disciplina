import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

export const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background">
            <Outlet />
          </main>
          <footer className="p-4 border-t bg-background text-center">
            <p className="text-[10px] text-muted-foreground/60">
              © {new Date().getFullYear()} Todos os direitos reservados —
              Massaro Victor Pinheiro Alves —
              victormassaro00@gmail.com
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};
