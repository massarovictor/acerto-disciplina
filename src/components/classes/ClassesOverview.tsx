import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClasses, useStudents } from '@/hooks/useLocalStorage';
import { School, Users, AlertCircle, CheckCircle, Calendar, Archive } from 'lucide-react';
import { MOCK_USERS } from '@/data/mockData';

export const ClassesOverview = () => {
  const { classes } = useClasses();
  const { students } = useStudents();

  // Filtrar apenas turmas ativas (não arquivadas)
  const activeClasses = classes.filter(c => !c.archived);

  const classesWithDirector = activeClasses.filter(c => c.directorId);
  const classesWithoutDirector = activeClasses.filter(c => !c.directorId);
  
  // Distribuição por ano atual
  const yearDistribution = activeClasses.reduce((acc, cls) => {
    if (cls.currentYear) {
      const yearLabel = `${cls.currentYear}º ano`;
      acc[yearLabel] = (acc[yearLabel] || 0) + 1;
    } else {
      acc['Sem ano definido'] = (acc['Sem ano definido'] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const directors = MOCK_USERS.filter(u => u.role === 'diretor');
  const directorLoad = directors.map(director => ({
    name: director.name,
    classes: activeClasses.filter(c => c.directorId === director.id).length
  }));

  const courseDistribution = activeClasses.reduce((acc, cls) => {
    const course = cls.course || 'Sem curso';
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const seriesDistribution = activeClasses.reduce((acc, cls) => {
    const series = cls.name.split(' ')[0];
    acc[series] = (acc[series] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Turmas</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClasses.length}</div>
            <p className="text-xs text-muted-foreground">
              {students.length} alunos matriculados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Diretor</CardTitle>
            <CheckCircle className="h-4 w-4 text-severity-light" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classesWithDirector.length}</div>
            <Badge variant="outline" className="bg-severity-light-bg text-severity-light border-severity-light mt-1">
              {activeClasses.length > 0 ? Math.round((classesWithDirector.length / activeClasses.length) * 100) : 0}% do total
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Diretor</CardTitle>
            <AlertCircle className="h-4 w-4 text-severity-critical" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classesWithoutDirector.length}</div>
            {classesWithoutDirector.length > 0 && (
              <Badge variant="outline" className="bg-severity-critical-bg text-severity-critical border-severity-critical mt-1">
                Requer atenção
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivadas</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.filter(c => c.archived).length}</div>
            <p className="text-xs text-muted-foreground">
              Turmas concluídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Year Distribution */}
      {Object.keys(yearDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Distribuição por Ano Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(yearDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([year, count]) => (
                  <div key={year}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{year}</span>
                      <span className="text-sm text-muted-foreground">{count} turma(s)</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${(count / Math.max(...Object.values(yearDistribution), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {classesWithoutDirector.length > 0 && (
        <Card className="border-severity-critical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-severity-critical">
              <AlertCircle className="h-5 w-5" />
              Turmas Requerendo Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {classesWithoutDirector.map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-3 bg-severity-critical-bg rounded-lg">
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">{cls.course}</p>
                  </div>
                  <Badge variant="outline" className="bg-background text-severity-critical border-severity-critical">
                    Sem diretor
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(courseDistribution).map(([course, count]) => (
                <div key={course}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{course}</span>
                    <span className="text-sm text-muted-foreground">{count} turmas</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${(count / classes.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Série</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(seriesDistribution).map(([series, count]) => (
                <div key={series}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{series}</span>
                    <span className="text-sm text-muted-foreground">{count} turmas</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-status-analysis h-full rounded-full"
                      style={{ width: `${(count / classes.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Director Load */}
      <Card>
        <CardHeader>
          <CardTitle>Carga por Diretor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {directorLoad.map((director, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{director.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{director.classes} turmas</span>
                    {director.classes > 5 && (
                      <Badge variant="outline" className="bg-severity-intermediate-bg text-severity-intermediate border-severity-intermediate">
                        Sobrecarga
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${director.classes > 5 ? 'bg-severity-intermediate' : 'bg-severity-light'}`}
                    style={{ width: `${Math.min((director.classes / 8) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
