import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { StudentsRegister } from '@/components/students/StudentsRegister';
import { StudentsManage } from '@/components/students/StudentsManage';
import { StudentApprovalManager } from '@/components/students/StudentApprovalManager';
import { useUIStore } from '@/stores/useUIStore';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

const Students = () => {
  // ✅ Usando Zustand store para persistir tab entre navegações
  const { studentsUI, setStudentsUI } = useUIStore();
  const activeTab = studentsUI.activeTab;
  const setActiveTab = (value: string) => setStudentsUI({ activeTab: value });
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
        title="Cadastro de Alunos"
        description="Registre novos alunos individualmente ou em lote, e gerencie dados cadastrais"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
          <TabsTrigger value="manage" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Gerenciar Alunos</TabsTrigger>
          <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Cadastrar</TabsTrigger>
          <TabsTrigger value="approval" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Aprovações</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6 mt-6">
          <StudentsManage highlightId={highlightId} />
        </TabsContent>

        <TabsContent value="register" className="space-y-6 mt-6">
          <StudentsRegister />
        </TabsContent>

        <TabsContent value="approval" className="space-y-6 mt-6">
          <StudentApprovalManager />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Students;
