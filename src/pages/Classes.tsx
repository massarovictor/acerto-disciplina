import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassesOverview } from '@/components/classes/ClassesOverview';
import { ClassesManage } from '@/components/classes/ClassesManage';
import { ClassesCreate } from '@/components/classes/ClassesCreate';

const Classes = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurar Turmas</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie turmas, atribua diretores e acompanhe a estrutura escolar
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="manage">Gerenciar Turmas</TabsTrigger>
          <TabsTrigger value="create">Criar Nova Turma</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <ClassesOverview />
        </TabsContent>

        <TabsContent value="manage" className="space-y-6 mt-6">
          <ClassesManage />
        </TabsContent>

        <TabsContent value="create" className="space-y-6 mt-6">
          <ClassesCreate onSuccess={() => setActiveTab('manage')} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Classes;
