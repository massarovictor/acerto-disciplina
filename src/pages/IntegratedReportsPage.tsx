import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { IntegratedReports } from '@/components/reports/IntegratedReports';
import { Card, CardContent } from '@/components/ui/card';
import { useClasses, useIncidents, useStudents } from '@/hooks/useData';

const IntegratedReportsPage = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();

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
              incidents={incidents}
              enabled
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default IntegratedReportsPage;
