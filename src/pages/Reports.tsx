import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClasses,
  useStudents,
  useIncidents,
} from "@/hooks/useData";
import { IntegratedReports } from "@/components/reports/IntegratedReports";
import { ClassSlides } from "@/components/reports/ClassSlides";
import { CertificatesReports } from "@/components/reports/CertificatesReports";
import { useUIStore } from "@/stores/useUIStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { isDisciplinaryIncident } from "@/lib/incidentType";

type ReportsTab = "integrated" | "slides" | "certificates";
const REPORTS_TABS: ReportsTab[] = ["integrated", "slides", "certificates"];
const isReportsTab = (value: string | null | undefined): value is ReportsTab =>
  Boolean(value && REPORTS_TABS.includes(value as ReportsTab));

const Reports = () => {
  // ✅ Usando Zustand store para persistir tab entre navegações
  const { reportsUI, setReportsUI } = useUIStore();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab = isReportsTab(reportsUI.activeTab)
    ? reportsUI.activeTab
    : "integrated";
  const setActiveTab = (value: string) => {
    if (!isReportsTab(value)) return;
    if (value === activeTab) return;
    setReportsUI({ activeTab: value });
  };

  useEffect(() => {
    if (isReportsTab(reportsUI.activeTab)) return;
    setReportsUI({ activeTab: "integrated" });
  }, [reportsUI.activeTab, setReportsUI]);

  // Sync tab with URL param on mount
  useEffect(() => {
    if (!tabParam) return;
    if (tabParam === activeTab) return;
    if (!isReportsTab(tabParam)) return;
    setReportsUI({ activeTab: tabParam });
  }, [tabParam, setReportsUI, activeTab]);

  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();
  const disciplinaryIncidents = incidents.filter((incident) =>
    isDisciplinaryIncident(incident),
  );
  // DISABLED: Attendance feature temporarily removed
  // const { attendance } = useAttendance();

  return (
    <PageContainer>
      <PageHeader
        title="Relatórios"
        description="Visualize dados, gere relatórios e analise indicadores do sistema"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
          <TabsTrigger value="integrated">Relatórios Integrados</TabsTrigger>
          <TabsTrigger value="slides">Slides de Apresentação</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
        </TabsList>

        <TabsContent value="integrated" className="mt-6 space-y-6">
          {activeTab === "integrated" ? (
            <IntegratedReports
              classes={classes}
              students={students}
              incidents={disciplinaryIncidents}
              enabled
            />
          ) : null}
        </TabsContent>

        <TabsContent value="slides" className="mt-6 space-y-6">
          {activeTab === "slides" ? (
            <ClassSlides
              classes={classes}
              students={students}
              incidents={disciplinaryIncidents}
              enabled
            />
          ) : null}
        </TabsContent>

        <TabsContent value="certificates" className="mt-6 space-y-6">
          {activeTab === "certificates" ? (
            <CertificatesReports
              classes={classes}
              students={students}
              enabled
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Reports;
