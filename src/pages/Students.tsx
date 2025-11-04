import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentsRegister } from '@/components/students/StudentsRegister';
import { StudentsManage } from '@/components/students/StudentsManage';

const Students = () => {
  const [activeTab, setActiveTab] = useState('register');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastro de Alunos</h1>
        <p className="text-muted-foreground mt-1">
          Registre novos alunos individualmente ou em lote, e gerencie dados cadastrais
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Cadastrar</TabsTrigger>
          <TabsTrigger value="manage">Gerenciar Alunos</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-6 mt-6">
          <StudentsRegister />
        </TabsContent>

        <TabsContent value="manage" className="space-y-6 mt-6">
          <StudentsManage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Students;
