// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GradesManager } from '@/components/grades/GradesManager';
// import { AttendanceManager } from '@/components/grades/AttendanceManager'; // DISABLED: Attendance feature temporarily removed
// import { useUIStore } from '@/stores/useUIStore';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

const GradesAttendance = () => {
  // DISABLED: Tab navigation removed - only grades for now
  // const { gradesAttendanceUI, setGradesAttendanceUI } = useUIStore();
  // const activeTab = gradesAttendanceUI.activeTab;
  // const setActiveTab = (value: string) => setGradesAttendanceUI({ activeTab: value });

  return (
    <PageContainer>
      <PageHeader
        title="Notas"
        description="Lance notas dos alunos por turma e bimestre"
      />

      {/* DISABLED: Tabs removed - only GradesManager for now
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
      */}

      <GradesManager />
    </PageContainer>
  );
};

export default GradesAttendance;
