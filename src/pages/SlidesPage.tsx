import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ClassSlides } from '@/components/reports/ClassSlides';
import { Card, CardContent } from '@/components/ui/card';
import { useClasses, useIncidents, useStudents } from '@/hooks/useData';

const SlidesPage = () => {
  const { classes } = useClasses();
  const { students } = useStudents();
  const { incidents } = useIncidents();

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
              incidents={incidents}
              enabled
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default SlidesPage;
