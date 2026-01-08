import { Class, Student, Grade, Incident, AttendanceRecord } from '@/types';
import { BasePDFGenerator } from './basePdfExport';
import { 
  generateClassAnalytics, 
  ClassAnalytics
} from './classAnalytics';
import { getAllAreas, getAreaShortName } from './subjects';

/**
 * Gerador de Relatório Qualitativo de Turma - Versão Organizada
 */

interface StudentAnalysis {
  id: string;
  name: string;
  average: number;
  frequency: number;
  subjectsBelow: string[];
  subjectsAbove: string[];
  incidentCount: number;
  classification: 'excelencia' | 'aprovado' | 'atencao' | 'critico';
}

class ClassReportPDF extends BasePDFGenerator {
  private analytics: ClassAnalytics | null = null;
  private studentAnalyses: StudentAnalysis[] = [];

  constructor() {
    super({ orientation: 'portrait' });
  }

  public async generate(
    cls: Class,
    students: Student[],
    grades: Grade[],
    incidents: Incident[],
    attendance: AttendanceRecord[],
    professionalSubjects: string[] = [],
    selectedQuarter?: string
  ) {
    try {
      await this.loadConfig();
      
      this.analytics = generateClassAnalytics(
        students, grades, attendance, incidents, 
        professionalSubjects, selectedQuarter
      );

      this.analyzeStudents(students, grades, attendance, incidents, selectedQuarter);

      this.renderHeader();

      // Título compacto
      this.setFont('lg', 'bold', '#000000');
      this.drawText('Relatório Qualitativo da Turma', this.margin, this.y);
      this.y += 6;
      
      this.setFont('md', 'normal', '#000000');
      this.drawText(`${cls.name} | Período: ${this.analytics?.period || 'Ano Completo'}`, this.margin, this.y);
      this.y += 8;

      // Seções
      this.renderOverview();
      this.renderStudentTable();
      this.renderHighlights();
      this.renderAreaAnalysis(grades, students, professionalSubjects, selectedQuarter);
      
      if (incidents.length > 0) {
        this.renderBehaviorSection();
      }
      
      this.renderRecommendations();

      const periodSuffix = selectedQuarter && selectedQuarter !== 'anual' 
        ? `_${selectedQuarter.replace(/\s+/g, '_').replace('º', '')}` 
        : '_Anual';
      this.save(`Relatorio_${cls.name.replace(/\s+/g, '_')}${periodSuffix}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }

  private analyzeStudents(
    students: Student[],
    grades: Grade[],
    attendance: AttendanceRecord[],
    incidents: Incident[],
    selectedQuarter?: string
  ) {
    let filteredGrades = grades;
    if (selectedQuarter && selectedQuarter !== 'anual') {
      filteredGrades = grades.filter(g => g.quarter === selectedQuarter);
    }

    this.studentAnalyses = students.map(student => {
      const studentGrades = filteredGrades.filter(g => g.studentId === student.id);
      const studentAttendance = attendance.filter(a => a.studentId === student.id);
      
      const subjectGrades: Record<string, number[]> = {};
      studentGrades.forEach(g => {
        if (!subjectGrades[g.subject]) subjectGrades[g.subject] = [];
        subjectGrades[g.subject].push(g.grade);
      });

      const subjectAverages = Object.entries(subjectGrades).map(([subject, gradeList]) => ({
        subject,
        average: gradeList.reduce((a, b) => a + b, 0) / gradeList.length
      }));

      const subjectsBelow = subjectAverages.filter(s => s.average < 6).map(s => s.subject);
      const subjectsAbove = subjectAverages.filter(s => s.average >= 8).map(s => s.subject);
      
      const average = subjectAverages.length > 0
        ? subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length
        : 0;

      const present = studentAttendance.filter(a => a.status === 'presente').length;
      const frequency = studentAttendance.length > 0 ? (present / studentAttendance.length) * 100 : 100;

      const incidentCount = incidents.filter(i => i.studentIds.includes(student.id)).length;

      let classification: StudentAnalysis['classification'];
      if (average >= 8 && frequency >= 90 && subjectsBelow.length === 0) {
        classification = 'excelencia';
      } else if (subjectsBelow.length === 0 && average >= 6) {
        classification = 'aprovado';
      } else if (subjectsBelow.length >= 3 || average < 5 || frequency < 60) {
        classification = 'critico';
      } else {
        classification = 'atencao';
      }

      return {
        id: student.id,
        name: student.name,
        average,
        frequency,
        subjectsBelow,
        subjectsAbove,
        incidentCount,
        classification
      };
    }).sort((a, b) => b.average - a.average);
  }

  private renderOverview() {
    this.setFont('sm', 'bold', '#000000');
    this.drawText('VISÃO GERAL', this.margin, this.y);
    this.y += 5;

    const total = this.studentAnalyses.length;
    const avgGrade = total > 0 
      ? this.studentAnalyses.reduce((sum, s) => sum + s.average, 0) / total 
      : 0;
    const avgFreq = total > 0
      ? this.studentAnalyses.reduce((sum, s) => sum + s.frequency, 0) / total
      : 100;

    const excelencia = this.studentAnalyses.filter(s => s.classification === 'excelencia').length;
    const aprovados = this.studentAnalyses.filter(s => s.classification === 'aprovado').length;
    const atencao = this.studentAnalyses.filter(s => s.classification === 'atencao').length;
    const critico = this.studentAnalyses.filter(s => s.classification === 'critico').length;

    // Linha de métricas
    this.setFont('xs', 'normal', '#000000');
    this.drawText(
      `Total: ${total} alunos | Média Geral: ${avgGrade.toFixed(1)} | Frequência: ${avgFreq.toFixed(0)}%`,
      this.margin, this.y
    );
    this.y += 4;
    this.drawText(
      `Classificação: Excelência (${excelencia}) | Aprovados (${aprovados}) | Atenção (${atencao}) | Crítico (${critico})`,
      this.margin, this.y
    );
    this.y += 6;

    // Legenda
    this.drawRect(this.margin, this.y, this.contentWidth, 16, { fill: '#F5F5F5' });
    this.setFont('xs', 'bold', '#000000');
    this.drawText('Critérios:', this.margin + 2, this.y + 4);
    this.setFont('xs', 'normal', '#333333');
    this.drawText('Excelência = média ≥8, freq ≥90%, sem reprovações', this.margin + 2, this.y + 8);
    this.drawText('Aprovado = passou em tudo | Atenção = 1-2 disc. | Crítico = 3+ disc. ou média <5', this.margin + 2, this.y + 12);
    this.y += 20;
  }

  private renderStudentTable() {
    this.setFont('sm', 'bold', '#000000');
    this.drawText('CLASSIFICAÇÃO DOS ALUNOS', this.margin, this.y);
    this.y += 5;

    // Cabeçalho da tabela - ajustado para caber nomes maiores
    const colNum = 8;
    const colName = 75;  // Aumentado
    const colMedia = 18;
    const colFreq = 18;
    const colDisc = 18;
    const colClass = 48;

    this.drawRect(this.margin, this.y, this.contentWidth, 5, { fill: '#000000' });
    this.setFont('xs', 'bold', '#FFFFFF');
    let x = this.margin + 1;
    this.drawText('Nº', x, this.y + 3.5); x += colNum;
    this.drawText('Nome do Aluno', x, this.y + 3.5); x += colName;
    this.drawText('Média', x, this.y + 3.5); x += colMedia;
    this.drawText('Freq.', x, this.y + 3.5); x += colFreq;
    this.drawText('Rep.', x, this.y + 3.5); x += colDisc;
    this.drawText('Situação', x, this.y + 3.5);
    this.y += 5;

    const classLabels: Record<string, string> = {
      excelencia: 'Excelência',
      aprovado: 'Aprovado',
      atencao: 'Atenção',
      critico: 'Crítico'
    };

    this.studentAnalyses.forEach((student, idx) => {
      this.checkPageBreak(5);
      
      if (idx % 2 === 0) {
        this.drawRect(this.margin, this.y, this.contentWidth, 4.5, { fill: '#F9F9F9' });
      }

      this.setFont('xs', 'normal', '#000000');
      x = this.margin + 1;
      this.drawText((idx + 1).toString(), x, this.y + 3); x += colNum;
      
      // Nome - truncar se necessário mas com mais espaço
      const maxNameLen = 38;
      const name = student.name.length > maxNameLen 
        ? student.name.substring(0, maxNameLen - 2) + '..' 
        : student.name;
      this.drawText(name, x, this.y + 3); x += colName;
      
      this.drawText(student.average.toFixed(1), x, this.y + 3); x += colMedia;
      this.drawText(`${student.frequency.toFixed(0)}%`, x, this.y + 3); x += colFreq;
      this.drawText(student.subjectsBelow.length.toString(), x, this.y + 3); x += colDisc;
      
      // Situação com destaque para críticos
      if (student.classification === 'critico') {
        this.setFont('xs', 'bold', '#000000');
      }
      this.drawText(classLabels[student.classification], x, this.y + 3);

      this.y += 4.5;
    });

    this.y += 5;
  }

  private renderHighlights() {
    this.checkPageBreak(30);
    
    this.setFont('sm', 'bold', '#000000');
    this.drawText('DESTAQUES', this.margin, this.y);
    this.y += 5;

    // Aprovados em TODAS
    const allPassed = this.studentAnalyses.filter(s => 
      s.subjectsBelow.length === 0 && s.average >= 6
    );

    // Em recuperação (3+)
    const recovery = this.studentAnalyses.filter(s => s.subjectsBelow.length >= 3);

    // Box 1: Aprovados em todas
    this.drawRect(this.margin, this.y, 2, 12, { fill: '#000000' });
    this.setFont('xs', 'bold', '#000000');
    this.drawText(`Aprovados em Todas as Disciplinas: ${allPassed.length} aluno(s)`, this.margin + 5, this.y + 4);
    
    if (allPassed.length > 0) {
      this.setFont('xs', 'normal', '#333333');
      const displayCount = Math.min(8, allPassed.length);
      const names = allPassed.slice(0, displayCount).map(s => s.name).join(', ');
      const remaining = allPassed.length - displayCount;
      
      const text = remaining > 0 ? `${names} (+${remaining} mais)` : names;
      const lines = this.pdf.splitTextToSize(text, this.contentWidth - 10);
      lines.slice(0, 2).forEach((line: string, i: number) => {
        this.drawText(line, this.margin + 5, this.y + 8 + (i * 3.5));
      });
    }
    this.y += 16;

    // Box 2: Em recuperação
    this.drawRect(this.margin, this.y, 2, 20, { fill: '#000000' });
    this.setFont('xs', 'bold', '#000000');
    this.drawText(`Em Recuperação (3+ disciplinas): ${recovery.length} aluno(s)`, this.margin + 5, this.y + 4);
    
    if (recovery.length > 0) {
      this.setFont('xs', 'normal', '#333333');
      const displayCount = Math.min(4, recovery.length);
      recovery.slice(0, displayCount).forEach((student, i) => {
        const discs = student.subjectsBelow.slice(0, 3).join(', ');
        const extra = student.subjectsBelow.length > 3 ? ` (+${student.subjectsBelow.length - 3})` : '';
        this.drawText(`• ${student.name}: ${discs}${extra}`, this.margin + 5, this.y + 8 + (i * 3.5));
      });
      
      const remaining = recovery.length - displayCount;
      if (remaining > 0) {
        this.drawText(`... e mais ${remaining} aluno(s)`, this.margin + 5, this.y + 8 + (displayCount * 3.5));
      }
    }
    this.y += 24;
  }

  private renderAreaAnalysis(
    grades: Grade[],
    students: Student[],
    professionalSubjects: string[],
    selectedQuarter?: string
  ) {
    this.checkPageBreak(25);
    
    this.setFont('sm', 'bold', '#000000');
    this.drawText('ANÁLISE POR ÁREA', this.margin, this.y);
    this.y += 5;

    let filteredGrades = grades;
    if (selectedQuarter && selectedQuarter !== 'anual') {
      filteredGrades = grades.filter(g => g.quarter === selectedQuarter);
    }

    const areas = getAllAreas(professionalSubjects);

    areas.forEach(area => {
      const areaGrades = filteredGrades.filter(g => area.subjects.includes(g.subject));
      if (areaGrades.length === 0) return;

      this.checkPageBreak(20);

      const shortName = getAreaShortName(area.name);
      const areaAvg = areaGrades.reduce((s, g) => s + g.grade, 0) / areaGrades.length;
      const existingSubjects = [...new Set(areaGrades.map(g => g.subject))];

      // Cabeçalho da área
      this.drawRect(this.margin, this.y, this.contentWidth, 5, { fill: '#E0E0E0' });
      this.setFont('xs', 'bold', '#000000');
      this.drawText(`${shortName} - Média: ${areaAvg.toFixed(1)}`, this.margin + 2, this.y + 3.5);
      this.y += 6;

      // Disciplinas
      existingSubjects.forEach(subject => {
        this.checkPageBreak(10);
        
        const subjectGrades = areaGrades.filter(g => g.subject === subject);
        const subjectAvg = subjectGrades.reduce((s, g) => s + g.grade, 0) / subjectGrades.length;
        
        // Alunos abaixo da média
        const studentsBelow: string[] = [];
        students.forEach(student => {
          const studentSubjectGrades = subjectGrades.filter(g => g.studentId === student.id);
          if (studentSubjectGrades.length > 0) {
            const studentAvg = studentSubjectGrades.reduce((s, g) => s + g.grade, 0) / studentSubjectGrades.length;
            if (studentAvg < 6) studentsBelow.push(student.name);
          }
        });

        // Linha da disciplina
        this.setFont('xs', 'bold', '#000000');
        this.drawText(`${subject}`, this.margin + 3, this.y + 3);
        this.setFont('xs', 'normal', '#666666');
        this.drawText(`(média ${subjectAvg.toFixed(1)})`, this.margin + 60, this.y + 3);
        this.y += 4;

        // Alunos em dificuldade
        if (studentsBelow.length > 0) {
          this.setFont('xs', 'normal', '#333333');
          const displayCount = Math.min(5, studentsBelow.length);
          const names = studentsBelow.slice(0, displayCount).join(', ');
          const remaining = studentsBelow.length - displayCount;
          const text = remaining > 0 
            ? `Em dificuldade (${studentsBelow.length}): ${names} (+${remaining})` 
            : `Em dificuldade (${studentsBelow.length}): ${names}`;
          
          const lines = this.pdf.splitTextToSize(text, this.contentWidth - 8);
          lines.slice(0, 2).forEach((line: string) => {
            this.drawText(line, this.margin + 5, this.y + 3);
            this.y += 3.5;
          });
        }
        this.y += 1;
      });

      this.y += 3;
    });
  }

  private renderBehaviorSection() {
    if (!this.analytics) return;
    
    const correlation = this.analytics.behaviorCorrelation;
    if (correlation.withIncidents.count === 0) return;

    this.checkPageBreak(20);
    
    this.setFont('sm', 'bold', '#000000');
    this.drawText('ANÁLISE COMPORTAMENTAL', this.margin, this.y);
    this.y += 5;

    const gradeDiff = correlation.withoutIncidents.avgGrade - correlation.withIncidents.avgGrade;

    this.setFont('xs', 'normal', '#000000');
    this.drawText(
      `Alunos sem ocorrências: ${correlation.withoutIncidents.count} (média ${correlation.withoutIncidents.avgGrade.toFixed(1)})`,
      this.margin, this.y + 3
    );
    this.y += 4;
    this.drawText(
      `Alunos com ocorrências: ${correlation.withIncidents.count} (média ${correlation.withIncidents.avgGrade.toFixed(1)})`,
      this.margin, this.y + 3
    );
    this.y += 4;
    
    if (gradeDiff > 0.3) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(`Diferença: ${gradeDiff.toFixed(1)} pontos a menos`, this.margin, this.y + 3);
      this.y += 5;
    }

    if (correlation.withIncidents.studentNames.length > 0) {
      this.setFont('xs', 'normal', '#333333');
      const names = correlation.withIncidents.studentNames.slice(0, 8).join(', ');
      const remaining = correlation.withIncidents.studentNames.length - 8;
      const text = remaining > 0 ? `Alunos: ${names} (+${remaining})` : `Alunos: ${names}`;
      this.drawText(text, this.margin, this.y + 3);
      this.y += 5;
    }

    this.y += 3;
  }

  private renderRecommendations() {
    if (!this.analytics) return;

    this.checkPageBreak(25);
    
    this.setFont('sm', 'bold', '#000000');
    this.drawText('RECOMENDAÇÕES', this.margin, this.y);
    this.y += 5;

    const recommendations: string[] = [];

    const criticos = this.studentAnalyses.filter(s => s.classification === 'critico');
    const recovery = this.studentAnalyses.filter(s => s.subjectsBelow.length >= 3);

    if (criticos.length > 0) {
      recommendations.push(`Acompanhamento urgente para ${criticos.length} aluno(s) em situação crítica`);
    }

    if (recovery.length > 0) {
      recommendations.push(`Recuperação para ${recovery.length} aluno(s) com 3+ disciplinas abaixo da média`);
    }

    // Disciplinas críticas
    const subjectProblems: Record<string, number> = {};
    this.studentAnalyses.forEach(s => {
      s.subjectsBelow.forEach(subj => {
        subjectProblems[subj] = (subjectProblems[subj] || 0) + 1;
      });
    });

    const criticalSubjects = Object.entries(subjectProblems)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (criticalSubjects.length > 0) {
      const subjects = criticalSubjects.map(([s, c]) => `${s} (${c})`).join(', ');
      recommendations.push(`Reforço em: ${subjects}`);
    }

    const lowFreq = this.studentAnalyses.filter(s => s.frequency < 75);
    if (lowFreq.length > 0) {
      recommendations.push(`Acompanhamento de frequência para ${lowFreq.length} aluno(s)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Turma com bom desempenho. Manter acompanhamento regular.');
    }

    this.setFont('xs', 'normal', '#000000');
    recommendations.forEach((rec, i) => {
      this.checkPageBreak(5);
      this.drawText(`${i + 1}. ${rec}`, this.margin, this.y + 3);
      this.y += 4;
    });

    this.y += 5;
  }
}

export async function generateProfessionalClassReportPDF(
  cls: Class,
  students: Student[],
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  professionalSubjects?: string[],
  selectedQuarter?: string
) {
  const generator = new ClassReportPDF();
  await generator.generate(
    cls, students, grades, incidents, attendance, 
    professionalSubjects || [], selectedQuarter
  );
}
