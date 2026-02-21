import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { IntegratedReports } from '@/components/reports/IntegratedReports';
import { Card, CardContent } from '@/components/ui/card';
import { useClasses, useIncidents, useStudents } from '@/hooks/useData';
import { isDisciplinaryIncident } from '@/lib/incidentType';

const IntegratedReportsPage = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();
  const disciplinaryIncidents = incidents.filter((incident) =>
    isDisciplinaryIncident(incident),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Relatórios Integrados"
        description="Visualize dados consolidados, rankings e indicadores acadêmicos da escola."
      />

      <div className="mt-6">
        <Card>
          <CardContent className="p-6">
            <IntegratedReports
              classes={classes}
              students={students}
              incidents={disciplinaryIncidents}
              enabled
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default IntegratedReportsPage;
