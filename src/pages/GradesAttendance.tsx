import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GradesManager } from '@/components/grades/GradesManager';
import { AttendanceManager } from '@/components/grades/AttendanceManager';

const GradesAttendance = () => {
  const [activeTab, setActiveTab] = useState('grades');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notas & Frequência</h1>
        <p className="text-muted-foreground mt-1">
          Lance notas e registre frequência dos alunos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grades">Lançamento de Notas</TabsTrigger>
          <TabsTrigger value="attendance">Registro de Frequência</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="space-y-6 mt-6">
          <GradesManager />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6 mt-6">
          <AttendanceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GradesAttendance;
