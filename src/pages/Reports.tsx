import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClasses, useStudents, useIncidents, useGrades, useAttendance } from '@/hooks/useLocalStorage';
import { IntegratedReports } from '@/components/reports/IntegratedReports';
import { ClassSlides } from '@/components/reports/ClassSlides';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('integrated');
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();
  const { grades } = useGrades();
  const { attendance } = useAttendance();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">
          Visualize dados, gere relatórios e analise indicadores do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="integrated">Relatórios Integrados</TabsTrigger>
          <TabsTrigger value="slides">Slides de Apresentação</TabsTrigger>
        </TabsList>

        <TabsContent value="integrated" className="mt-6 space-y-6">
          <IntegratedReports 
            classes={classes} 
            students={students} 
            incidents={incidents}
          />
        </TabsContent>

        <TabsContent value="slides" className="mt-6 space-y-6">
          <ClassSlides 
            classes={classes} 
            students={students} 
            incidents={incidents} 
            grades={grades} 
            attendance={attendance} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
