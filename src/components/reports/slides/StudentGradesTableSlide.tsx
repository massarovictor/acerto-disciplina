import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Student, Grade } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StudentGradesTableSlideProps {
  student: Student;
  grades: Grade[];
  period: string;
}

export const StudentGradesTableSlide = ({ student, grades, period }: StudentGradesTableSlideProps) => {
  const filteredGrades = period === 'all' 
    ? grades 
    : grades.filter(g => g.quarter === period);

  const studentGrades = filteredGrades.filter(g => g.studentId === student.id);

  // Group grades by subject and calculate average
  const gradesBySubject = studentGrades.reduce((acc, grade) => {
    if (!acc[grade.subject]) {
      acc[grade.subject] = [];
    }
    acc[grade.subject].push(grade);
    return acc;
  }, {} as Record<string, Grade[]>);

  // Sort subjects by average (highest to lowest)
  const sortedSubjects = Object.entries(gradesBySubject)
    .map(([subject, subjectGrades]) => ({
      subject,
      grades: subjectGrades,
      average: subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length
    }))
    .sort((a, b) => b.average - a.average);

  return (
    <div className="h-full p-8 bg-gradient-to-br from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          {student.photoUrl ? (
            <AvatarImage src={student.photoUrl} alt={student.name} />
          ) : (
            <AvatarFallback className="bg-primary/10 text-lg">
              {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{student.name} - Notas por Disciplina</h1>
          <p className="text-md text-muted-foreground">
            {period === 'all' ? 'Todas as Notas' : period} • Ordenado por Desempenho
          </p>
        </div>
      </div>

      {/* Grades Table */}
      <Card className="flex-1 bg-card/50 backdrop-blur overflow-hidden">
        <CardContent className="pt-6 h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Disciplina</TableHead>
                  {period === 'all' && (
                    <>
                      <TableHead className="text-center w-[100px]">1º Bim</TableHead>
                      <TableHead className="text-center w-[100px]">2º Bim</TableHead>
                      <TableHead className="text-center w-[100px]">3º Bim</TableHead>
                      <TableHead className="text-center w-[100px]">4º Bim</TableHead>
                    </>
                  )}
                  <TableHead className="text-center w-[100px]">Média</TableHead>
                  <TableHead className="text-center w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSubjects.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.subject}</TableCell>
                    {period === 'all' && (
                      <>
                        {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map(quarter => {
                          const quarterGrade = item.grades.find(g => g.quarter === quarter);
                          return (
                            <TableCell key={quarter} className="text-center">
                              {quarterGrade ? (
                                <Badge 
                                  variant={
                                    quarterGrade.grade >= 7 ? 'default' : 
                                    quarterGrade.grade >= 6 ? 'secondary' : 
                                    'destructive'
                                  }
                                >
                                  {quarterGrade.grade.toFixed(1)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </>
                    )}
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          item.average >= 7 ? 'default' : 
                          item.average >= 6 ? 'secondary' : 
                          'destructive'
                        }
                        className="text-base px-3 py-1"
                      >
                        {item.average.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.average >= 6 ? (
                        <Badge variant="default" className="bg-green-500">Aprovado</Badge>
                      ) : (
                        <Badge variant="destructive">Recuperação</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Disciplinas</p>
              <p className="text-2xl font-bold">{sortedSubjects.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Aprovado</p>
              <p className="text-2xl font-bold text-green-500">
                {sortedSubjects.filter(s => s.average >= 6).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Recuperação</p>
              <p className="text-2xl font-bold text-red-500">
                {sortedSubjects.filter(s => s.average < 6).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Média Geral</p>
              <p className="text-2xl font-bold">
                {(sortedSubjects.reduce((sum, s) => sum + s.average, 0) / sortedSubjects.length).toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};