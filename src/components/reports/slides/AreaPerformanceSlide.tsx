import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { Class, Grade } from '@/types';
import { SUBJECT_AREAS } from '@/lib/subjects';

interface AreaPerformanceSlideProps {
  classData: Class;
  grades: Grade[];
  period: string;
  professionalSubjects: string[];
}

export const AreaPerformanceSlide = ({ classData, grades, period, professionalSubjects }: AreaPerformanceSlideProps) => {
  const filteredGrades = period === 'all' 
    ? grades 
    : grades.filter(g => g.quarter === period);

  // Calculate performance by area
  const areaPerformance = SUBJECT_AREAS.map(area => {
    const areaGrades = filteredGrades.filter(g => area.subjects.includes(g.subject));
    const average = areaGrades.length > 0
      ? areaGrades.reduce((sum, g) => sum + g.grade, 0) / areaGrades.length
      : 0;

    return {
      name: area.name,
      color: area.color,
      average,
      subjects: area.subjects.map(subject => {
        const subjectGrades = filteredGrades.filter(g => g.subject === subject);
        const subjectAvg = subjectGrades.length > 0
          ? subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length
          : 0;
        return { subject, average: subjectAvg };
      }).filter(s => s.average > 0)
    };
  });

  // Professional subjects performance
  const professionalPerformance = professionalSubjects.map(subject => {
    const subjectGrades = filteredGrades.filter(g => g.subject === subject);
    const average = subjectGrades.length > 0
      ? subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length
      : 0;
    return { subject, average };
  }).filter(s => s.average > 0);

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">{classData.name} - Desempenho por Área</h1>
        <p className="text-lg text-muted-foreground">
          {period === 'all' ? 'Ano Letivo Completo' : period}
        </p>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Knowledge Areas */}
        {areaPerformance.map((area, index) => (
          area.subjects.length > 0 && (
            <Card key={index} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{area.name}</h3>
                  </div>
                  <Badge 
                    variant={area.average >= 7 ? 'default' : area.average >= 6 ? 'secondary' : 'destructive'}
                    className="text-lg px-3 py-1"
                  >
                    {area.average.toFixed(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {area.subjects.map((item, idx) => (
                    <div key={idx} className="p-3 bg-background/50 rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate flex-1">{item.subject}</span>
                        <Badge 
                          variant={item.average >= 7 ? 'default' : item.average >= 6 ? 'secondary' : 'destructive'}
                          className="ml-2"
                        >
                          {item.average.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.average >= 7 ? 'bg-green-500' :
                            item.average >= 6 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${(item.average / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ))}

        {/* Professional Subjects */}
        {professionalPerformance.length > 0 && (
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Base Profissional / Técnica</h3>
                </div>
                <Badge 
                  variant="outline"
                  className="text-lg px-3 py-1"
                >
                  {(professionalPerformance.reduce((sum, s) => sum + s.average, 0) / professionalPerformance.length).toFixed(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {professionalPerformance.map((item, idx) => (
                  <div key={idx} className="p-3 bg-background/50 rounded border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate flex-1">{item.subject}</span>
                      <Badge 
                        variant={item.average >= 7 ? 'default' : item.average >= 6 ? 'secondary' : 'destructive'}
                        className="ml-2"
                      >
                        {item.average.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.average >= 7 ? 'bg-green-500' :
                          item.average >= 6 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(item.average / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};