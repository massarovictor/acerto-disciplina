import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClasses,
  useStudents,
  useIncidents,
} from "@/hooks/useData";
import { IntegratedReports } from "@/components/reports/IntegratedReports";
import { ClassSlides } from "@/components/reports/ClassSlides";
import { useUIStore } from "@/stores/useUIStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

const Reports = () => {
  // ✅ Usando Zustand store para persistir tab entre navegações
  const { reportsUI, setReportsUI } = useUIStore();
  const activeTab = reportsUI.activeTab;
  const setActiveTab = (value: string) => setReportsUI({ activeTab: value });
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();
  // DISABLED: Attendance feature temporarily removed
  // const { attendance } = useAttendance();

  return (
    <PageContainer>
      <PageHeader
        title="Relatórios"
        description="Visualize dados, gere relatórios e analise indicadores do sistema"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/20 p-1">
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
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Reports;
