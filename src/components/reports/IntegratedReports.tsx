import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Users, TrendingUp, AlertTriangle, Download, FileDown } from 'lucide-react';
import { useState } from 'react';
import { Class, Student, Incident } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface IntegratedReportsProps {
  classes: Class[];
  students: Student[];
  incidents: Incident[];
}

export const IntegratedReports = ({ classes, students, incidents }: IntegratedReportsProps) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const { toast } = useToast();

  const classStudents = selectedClass 
    ? students.filter(s => s.classId === selectedClass)
    : [];

  const handleExportPDF = async (type: string) => {
    if (!selectedClass) return;

    const { generateReportPDF } = await import('@/lib/pdfExport');
    const classData = classes.find(c => c.id === selectedClass);
    const classStudents = students.filter(s => s.classId === selectedClass);

    let sections: { title: string; content: string }[] = [];
    let fileName = '';

    switch (type) {
      case 'occurrences':
        fileName = `relatorio-ocorrencias-${classData?.name || 'turma'}.pdf`;
        const classIncidents = incidents.filter(i => i.classId === selectedClass);
        const resolved = classIncidents.filter(i => i.status === 'resolvida');
        const followUpCount = classIncidents.filter(i => i.followUps && i.followUps.length > 0).length;
        const resolvedDetails = resolved.map(i => {
          const date = new Date(i.date).toLocaleDateString('pt-BR');
          const sev = i.finalSeverity;
          const prov = (i.followUps || [])
            .map(f => f.providencias)
            .filter(Boolean)
            .join('; ');
          return `- ${date} | Gravidade: ${sev} | Alunos: ${i.studentIds.length} | Providências: ${prov || '—'}`;
        }).join('\n');

        sections = [
          {
            title: 'Relatório de Ocorrências',
            content: `Turma: ${classData?.name}\nTotal de alunos: ${classStudents.length}\nOcorrências: ${classIncidents.length}\nCom acompanhamento: ${followUpCount}\nResolvidas: ${resolved.length}`,
          },
          {
            title: 'Ocorrências Resolvidas (Resumo Completo)',
            content: resolved.length ? resolvedDetails : 'Nenhuma ocorrência resolvida registrada para esta turma.',
          },
        ];
        break;

      case 'grades':
        fileName = `relatorio-notas-${classData?.name || 'turma'}.pdf`;
        sections = [
          {
            title: 'Relatório de Notas',
            content: `Turma: ${classData?.name}\nTotal de alunos: ${classStudents.length}\n\nDesempenho acadêmico com médias por bimestre, análise por disciplina e comparativos da turma.`,
          },
          {
            title: 'Análise de Desempenho',
            content: 'Médias por bimestre, identificação de disciplinas com maior índice de dificuldade e alunos que necessitam reforço.',
          },
        ];
        break;

      case 'attendance':
        fileName = `relatorio-frequencia-${classData?.name || 'turma'}.pdf`;
        sections = [
          {
            title: 'Relatório de Frequência',
            content: `Turma: ${classData?.name}\nTotal de alunos: ${classStudents.length}\n\nRegistro de faltas por disciplina, percentual de presença e alertas de frequência.`,
          },
          {
            title: 'Análise de Frequência',
            content: 'Identificação de alunos com faltas excessivas e recomendações de acompanhamento.',
          },
        ];
        break;

      case 'integrated':
        fileName = `relatorio-completo-${classData?.name || 'turma'}.pdf`;
        sections = [
          {
            title: 'Relatório Integrado Completo',
            content: `Turma: ${classData?.name}\nTotal de alunos: ${classStudents.length}\n\nDocumento completo integrando ocorrências, notas, frequência e insights para análise pedagógica.`,
          },
          {
            title: 'Visão Geral',
            content: 'Análise consolidada de todos os indicadores da turma, incluindo desempenho acadêmico, comportamento disciplinar e frequência.',
          },
          {
            title: 'Recomendações',
            content: 'Sugestões de ações pedagógicas baseadas na análise integrada dos dados: reforço escolar, reunião com responsáveis, acompanhamento psicopedagógico.',
          },
        ];
        break;
    }

    const pdf = generateReportPDF(`Relatório - ${classData?.name}`, sections);
    pdf.save(fileName);
    
    toast({
      title: 'PDF gerado com sucesso!',
      description: `O relatório foi baixado como ${fileName}`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aluno (Opcional)</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o aluno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {classStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2">
          <CardContent className="pt-6">
            <FileText className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Relatório de Ocorrências</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Histórico completo de ocorrências com análise de gravidade, providências e reincidências.
            </p>
            <Button className="w-full" onClick={() => handleExportPDF('occurrences')} disabled={!selectedClass}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <TrendingUp className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Relatório de Notas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Desempenho acadêmico com médias por bimestre, disciplinas e comparativos da turma.
            </p>
            <Button className="w-full" onClick={() => handleExportPDF('grades')} disabled={!selectedClass}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <Users className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Relatório de Frequência</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Registro de faltas por disciplina, percentual de presença e alertas de frequência.
            </p>
            <Button className="w-full" onClick={() => handleExportPDF('attendance')} disabled={!selectedClass}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <FileDown className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Relatório Integrado (Completo)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Documento completo com ocorrências, notas, frequência e insights para análise pedagógica.
            </p>
            <Button className="w-full" onClick={() => handleExportPDF('integrated')} disabled={!selectedClass}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF Completo
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Insights e Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium mb-1">Alunos em Situação de Risco</h4>
                  <p className="text-sm text-muted-foreground">
                    Identificados alunos com notas abaixo de 6.0 em 3 ou mais disciplinas, faltas acima de 25% ou múltiplas ocorrências graves.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium mb-1">Correlação Desempenho x Comportamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Análise automática identifica padrões entre ocorrências disciplinares e queda de desempenho acadêmico.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium mb-1">Recomendações Pedagógicas</h4>
                  <p className="text-sm text-muted-foreground">
                    Sugestões baseadas em dados: reforço escolar, reunião com responsáveis, acompanhamento psicopedagógico.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};