import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Incidents from '@/pages/Incidents';
import Classes from '@/pages/Classes';
import ArchivedClasses from '@/pages/ArchivedClasses';
import Students from '@/pages/Students';
import GradesAttendance from '@/pages/GradesAttendance';
import IntegratedReportsPage from '@/pages/IntegratedReportsPage';
import SlidesPage from '@/pages/SlidesPage';
import CertificatesPage from '@/pages/CertificatesPage';
import Analytics from '@/pages/Analytics';
import Users from '@/pages/Users';
import StudentTrajectory from '@/pages/StudentTrajectory';
import CertificateVerification from '@/pages/CertificateVerification';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

import { ThemeProvider } from 'next-themes';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const LegacyIncidentsRedirect = () => {
  const location = useLocation();

  return (
    <Navigate
      to={{
        pathname: '/acompanhamentos',
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  );
};

const LegacyReportsRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tab = (params.get('tab') || '').toLowerCase();
  params.delete('tab');
  const nextSearch = params.toString();

  const pathname =
    tab === 'slides'
      ? '/slides'
      : tab === 'certificates'
        ? '/certificados'
        : '/relatorios-integrados';

  return (
    <Navigate
      to={{
        pathname,
        search: nextSearch ? `?${nextSearch}` : '',
        hash: location.hash,
      }}
      replace
    />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/certificados/verificar" element={<CertificateVerification />} />
              <Route path="/certificados/verificar/:codigo" element={<CertificateVerification />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="acompanhamentos" element={<Incidents />} />
                <Route path="ocorrencias" element={<LegacyIncidentsRedirect />} />
                <Route path="turmas" element={<Classes />} />
                <Route path="turmas-arquivadas" element={<ArchivedClasses />} />
                <Route path="alunos" element={<Students />} />
                <Route path="notas-frequencia" element={<GradesAttendance />} />
                <Route path="relatorios-integrados" element={<IntegratedReportsPage />} />
                <Route path="slides" element={<SlidesPage />} />
                <Route path="certificados" element={<CertificatesPage />} />
                <Route path="relatorios" element={<LegacyReportsRedirect />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="trajetoria" element={<StudentTrajectory />} />
                <Route path="usuarios" element={<Users />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
