import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClassesManage } from '@/components/classes/ClassesManage';
import { ClassesCreate } from '@/components/classes/ClassesCreate';
import { SubjectTemplatesManager } from '@/components/classes/SubjectTemplatesManager';

const Classes = () => {
  const [activeTab, setActiveTab] = useState('manage');
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurar Turmas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie turmas, atribua diretores e acompanhe a estrutura escolar
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/turmas-arquivadas')}>
          <Archive className="h-4 w-4 mr-2" />
          Turmas Arquivadas
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
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
    </div>
  );
};

export default Classes;

