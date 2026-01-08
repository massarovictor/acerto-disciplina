import { Student, Class, Grade, Incident, AttendanceRecord } from '@/types';
import { QUARTERS } from '@/lib/subjects';
import { BasePDFGenerator } from './basePdfExport';
import { REPORT_COLORS } from './reportDesignSystem';

/**
 * Gerador de Relatório Individual do Aluno
 */

class StudentReportPDF extends BasePDFGenerator {
  constructor() {
    super();
  }

  public async generate(
    student: Student,
    studentClass: Class | undefined,
    grades: Grade[],
    incidents: Incident[],
    attendance: AttendanceRecord[],
    subjects?: string[]
  ) {
    try {
      await this.loadConfig();
      this.renderHeader();

      // Título - formato profissional
      this.setFont('md', 'bold', '#000000');
      this.drawText('Relatório Individual de Desempenho', this.margin, this.y);
      this.y += 8;

      // Identificação
      this.renderIdentification(student, studentClass);

      // Métricas Resumidas (Cards)
      this.renderMetrics(grades, attendance, student.id);

      // Quadro de Notas
      this.renderGradesTable(grades, student.id, subjects);

      // Histórico Disciplinar
      this.renderIncidents(incidents, student.id);

      // Assinaturas
      this.renderSignatures(student);

      const safeName = (student.name || 'Aluno').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      this.save(`Relatorio_${safeName}.pdf`);
    } catch (error) {
      console.error('Erro fatal ao gerar relatório individual:', error);
      throw error;
    }
  }

  private renderIdentification(student: Student, studentClass: Class | undefined) {
    // Caixa de identificação - preto e branco
    this.drawRect(this.margin, this.y, this.contentWidth, 18, { fill: '#F5F5F5', stroke: '#000000' });
    
    const col1 = this.colX(1) + 4;
    const col2 = this.colX(7) + 4;
    const startY = this.y + 5;

    this.renderField('Estudante', student.name, col1, startY, this.colWidth(6) - 8);
    this.renderField('Turma', studentClass?.name || 'Não informado', col2, startY, this.colWidth(6) - 8);
    
    if (student.enrollment) {
      this.renderField('Matrícula', student.enrollment, col1, startY + 9, this.colWidth(6) - 8);
    }

    this.y += 23;
  }

  private renderMetrics(grades: Grade[], attendance: AttendanceRecord[], studentId: string) {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    const avg = studentGrades.length > 0 ? studentGrades.reduce((a, b) => a + b.grade, 0) / studentGrades.length : 0;
    
    const studentAtt = attendance.filter(a => a.studentId === studentId);
    const total = studentAtt.length;
    const absences = studentAtt.filter(a => a.status !== 'presente').length;
    const freq = total > 0 ? ((total - absences) / total) * 100 : 100;

    const cardW = (this.contentWidth - 10) / 3;
    
    const renderCard = (x: number, label: string, value: string, isWarning: boolean = false) => {
      this.drawRect(x, this.y, cardW, 15, { stroke: '#000000', radius: 1 });
      this.setFont('xs', 'bold', '#000000');
      this.drawText(label, x + 3, this.y + 5);
      this.setFont('md', 'bold', isWarning ? '#000000' : '#000000');
      this.drawText(value, x + 3, this.y + 11);
    };

    renderCard(this.margin, 'Média Geral', avg.toFixed(1), avg < 6);
    renderCard(this.margin + cardW + 5, 'Frequência', `${freq.toFixed(1)}%`, freq < 75);
    renderCard(this.margin + (cardW + 5) * 2, 'Total Faltas', absences.toString());

    this.y += 22;
  }

  private renderGradesTable(grades: Grade[], studentId: string, subjects?: string[]) {
    this.renderSectionTitle('Quadro de Aproveitamento');
    
    const studentGrades = grades.filter(g => g.studentId === studentId);
    const subjectList = subjects && subjects.length > 0
        ? [...subjects].sort()
        : [...new Set(studentGrades.map(g => g.subject))].sort();

    const colSub = 70;
    const colQ = (this.contentWidth - colSub) / 5;

    // Header - preto e branco
    this.drawRect(this.margin, this.y, this.contentWidth, 7, { fill: '#000000' });
    this.setFont('xs', 'bold', '#FFFFFF');
    this.drawText('Disciplina', this.margin + 2, this.y + 4.5);
    
    ['1º Bim', '2º Bim', '3º Bim', '4º Bim', 'Média'].forEach((h, i) => {
      this.drawText(h, this.margin + colSub + (i * colQ) + (colQ/2), this.y + 4.5, { align: 'center' });
    });

    this.y += 7;

    subjectList.forEach((sub, idx) => {
      this.checkPageBreak(7);
      if (idx % 2 === 0) this.drawRect(this.margin, this.y, this.contentWidth, 6, { fill: '#F5F5F5' });
      
      this.setFont('xs', 'normal', '#000000');
      this.drawText(sub.length > 35 ? sub.substring(0, 32) + '...' : sub, this.margin + 2, this.y + 4);

      const subGrades = studentGrades.filter(g => g.subject === sub);
      let sum = 0;
      let count = 0;

      QUARTERS.forEach((q, i) => {
        const grade = subGrades.find(g => g.quarter === q);
        if (grade) {
          const val = grade.grade;
          this.setFont('xs', val < 6 ? 'bold' : 'normal', '#000000');
          this.drawText(val.toFixed(1), this.margin + colSub + (i * colQ) + (colQ/2), this.y + 4, { align: 'center' });
          sum += val;
          count++;
        } else {
          this.setFont('xs', 'normal', '#666666');
          this.drawText('-', this.margin + colSub + (i * colQ) + (colQ/2), this.y + 4, { align: 'center' });
        }
      });

      const finalAvg = count > 0 ? sum / count : 0;
      this.setFont('xs', 'bold', '#000000');
      this.drawText(count > 0 ? finalAvg.toFixed(1) : '-', this.margin + colSub + (4 * colQ) + (colQ/2), this.y + 4, { align: 'center' });

      this.y += 6;
    });

    this.y += 10;
  }

  private renderIncidents(incidents: Incident[], studentId: string) {
    const studentIncidents = incidents
        .filter(i => i.studentIds.includes(studentId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (studentIncidents.length === 0) return;

    this.renderSectionTitle('Histórico Disciplinar');

    const SEVERITY_LABELS: Record<string, string> = {
      leve: 'Leve',
      intermediaria: 'Intermediária',
      grave: 'Grave',
      gravissima: 'Gravíssima',
    };

    studentIncidents.forEach(incident => {
      this.checkPageBreak(15);
      
      // Barra lateral preta (sem cor)
      this.drawRect(this.margin, this.y, 1.5, 10, { fill: '#000000' });
      
      const severityLabel = SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity;
      this.setFont('xs', 'bold', '#000000');
      this.drawText(`${new Date(incident.date).toLocaleDateString('pt-BR')} - ${severityLabel}`, this.margin + 4, this.y + 4);
      
      this.setFont('xs', 'normal', '#000000');
      const desc = incident.description.length > 120 ? incident.description.substring(0, 117) + '...' : incident.description;
      this.drawText(desc, this.margin + 4, this.y + 8);

      this.y += 12;
    });
  }

  private renderSignatures(student: Student) {
    this.checkPageBreak(40);
    this.y += 15;
    const sigY = this.y + 15;
    const colW = this.contentWidth / 2;

    this.pdf.setLineWidth(0.3);
    this.pdf.setDrawColor('#000000');
    
    // Responsável pela Unidade
    this.pdf.line(this.margin, sigY, this.margin + colW - 10, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável pela Unidade', this.margin + (colW-10)/2, sigY + 4, { align: 'center' });
    if (this.config.directorName) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(this.config.directorName, this.margin + (colW-10)/2, sigY + 8, { align: 'center' });
    }

    // Responsável Legal
    this.pdf.line(this.margin + colW + 10, sigY, this.pageWidth - this.margin, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Pai / Mãe / Responsável', this.margin + colW + 10 + (colW-10)/2, sigY + 4, { align: 'center' });
  }
}

export async function generateStudentReportPDF(
  student: Student,
  studentClass: Class | undefined,
  grades: Grade[],
  incidents: Incident[],
  attendance: AttendanceRecord[],
  subjects?: string[]
) {
  const generator = new StudentReportPDF();
  await generator.generate(student, studentClass, grades, incidents, attendance, subjects);
}
