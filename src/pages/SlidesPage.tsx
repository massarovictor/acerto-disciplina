import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ClassSlides } from '@/components/reports/ClassSlides';
import { Card, CardContent } from '@/components/ui/card';
import { useClasses, useIncidents, useStudents } from '@/hooks/useData';
import { isDisciplinaryIncident } from '@/lib/incidentType';

const SlidesPage = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();
  const disciplinaryIncidents = incidents.filter((incident) =>
    isDisciplinaryIncident(incident),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Slides"
        description="Gere apresentações acadêmicas de turma, aluno ou visão escolar em poucos cliques."
      />

      <div className="mt-6">
        <Card>
          <CardContent className="p-6">
            <ClassSlides
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

export default SlidesPage;
