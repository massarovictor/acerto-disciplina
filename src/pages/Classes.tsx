import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClassesManage } from '@/components/classes/ClassesManage';
import { ClassesCreate } from '@/components/classes/ClassesCreate';
import { SubjectTemplatesManager } from '@/components/classes/SubjectTemplatesManager';
import { useUIStore } from '@/stores/useUIStore';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

const Classes = () => {
  // ✅ Usando Zustand store para persistir tab entre navegações
  const { classesUI, setClassesUI } = useUIStore();
  const activeTab = classesUI.activeTab;
  const setActiveTab = (value: string) => setClassesUI({ activeTab: value });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  // Limpar highlight após 3 segundos
  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, setSearchParams]);

  return (
    <PageContainer>
      <PageHeader
        title="Configurar Turmas"
        description="Gerencie turmas, atribua diretores e acompanhe a estrutura escolar"
        actions={
          <Button variant="outline" onClick={() => navigate('/turmas-arquivadas')}>
            <Archive className="h-4 w-4 mr-2" />
            Turmas Arquivadas
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1">
          <TabsTrigger value="manage">Gerenciar Turmas</TabsTrigger>
          <TabsTrigger value="create">Criar Nova Turma</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6 mt-6">
          <ClassesManage highlightId={highlightId} />
        </TabsContent>

        <TabsContent value="create" className="space-y-6 mt-6">
          <ClassesCreate onSuccess={() => setActiveTab('manage')} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <SubjectTemplatesManager />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Classes;
