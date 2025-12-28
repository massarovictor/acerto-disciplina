/**
 * PDF Ocorrência Disciplinar - Layout "Modern Corporate" (Multipáginas)
 * Design limpo, profissional, com suporte a conteúdo extenso e histórico completo.
 */

import jsPDF from 'jspdf';
import { Incident, Student, Class, FollowUpRecord, Comment } from '@/types';

// ================ CONFIGURAÇÕES VISUAIS ================

const COLORS = {
  text: {
    primary: '#111827',   // Gray 900
    secondary: '#4B5563', // Gray 600
    tertiary: '#9CA3AF',  // Gray 400
  },
  bg: {
    surface: '#F9FAFB',   // Gray 50
    highlight: '#F3F4F6', // Gray 100
    header: '#F8FAFC',    // Slate 50
  },
  border: '#E5E7EB',      // Gray 200
  brand: '#0F172A',       // Slate 900 (Institucional)
  accent: '#2563EB',      // Blue 600
};

const FONTS = {
  family: 'helvetica',
  size: {
    title: 16,
    subtitle: 10,
    label: 8,
    value: 9,
    body: 9,
    small: 7
  }
};

const LAYOUT = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 15,
  contentWidth: 180, // 210 - 30
  footerHeight: 40,  // Altura reservada para rodapé/assinaturas
};

// ================ HELPERS ================

const getSeverityInfo = (s: string) => {
  const map: Record<string, { label: string, color: string, bg: string }> = {
    leve: { label: 'LEVE', color: '#15803d', bg: '#dcfce7' },
    intermediaria: { label: 'INTERMEDIÁRIA', color: '#b45309', bg: '#ffedd5' },
    grave: { label: 'GRAVE', color: '#c2410c', bg: '#ffedd5' },
    gravissima: { label: 'GRAVÍSSIMA', color: '#b91c1c', bg: '#fee2e2' },
  };
  return map[s] || { label: s.toUpperCase(), color: '#000000', bg: '#ffffff' };
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
const formatDateTime = (d: string) => {
  const date = new Date(d);
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

// ================ PDF GENERATOR CLASS ================

class IncidentPDF {
  private pdf: jsPDF;
  private y: number;
  private pageCount: number;

  constructor() {
    this.pdf = new jsPDF({ format: 'a4', unit: 'mm' });
    this.y = LAYOUT.margin;
    this.pageCount = 1;
  }

  // --- Core Drawing Methods ---

  private addPage() {
    this.renderFooterInfo();
    this.pdf.addPage();
    this.pageCount++;
    this.y = LAYOUT.margin;
    // Opcional: Renderizar cabeçalho simplificado em novas páginas
  }

  private checkPageBreak(heightNeeded: number) {
    // Se o espaço necessário exceder a área útil (considerando margem inferior)
    if (this.y + heightNeeded > LAYOUT.pageHeight - LAYOUT.margin) {
      this.addPage();
    }
  }

  // --- Helper Components ---

  private drawLabel(text: string, x: number, y: number) {
    this.pdf.setFont(FONTS.family, 'bold');
    this.pdf.setFontSize(FONTS.size.label);
    this.pdf.setTextColor(COLORS.text.secondary);
    this.pdf.text(text.toUpperCase(), x, y);
  }

  private drawValue(text: string, x: number, y: number, style: 'normal' | 'bold' = 'normal') {
    this.pdf.setFont(FONTS.family, style);
    this.pdf.setFontSize(FONTS.size.value);
    this.pdf.setTextColor(COLORS.text.primary);
    this.pdf.text(text, x, y);
  }

  private drawSectionTitle(text: string) {
    this.checkPageBreak(15);
    this.pdf.setFont(FONTS.family, 'bold');
    this.pdf.setFontSize(FONTS.size.subtitle);
    this.pdf.setTextColor(COLORS.brand);
    this.pdf.text(text, LAYOUT.margin, this.y + 5);

    // Divider
    this.pdf.setDrawColor(COLORS.border);
    this.pdf.setLineWidth(0.1);
    this.pdf.line(LAYOUT.margin, this.y + 7, LAYOUT.pageWidth - LAYOUT.margin, this.y + 7);

    this.y += 12;
  }

  private drawParagraph(text: string) {
    this.pdf.setFont(FONTS.family, 'normal');
    this.pdf.setFontSize(FONTS.size.body);
    this.pdf.setTextColor(COLORS.text.primary);

    const lines = this.pdf.splitTextToSize(text, LAYOUT.contentWidth);

    lines.forEach((line: string) => {
      this.checkPageBreak(5);
      this.pdf.text(line, LAYOUT.margin, this.y + 4);
      this.y += 5;
    });
    this.y += 3; // Margem após parágrafo
  }

  // --- Specific Sections ---

  private renderHeader(incident: Incident) {
    // Instituição
    this.pdf.setFont(FONTS.family, 'bold');
    this.pdf.setFontSize(FONTS.size.title);
    this.pdf.setTextColor(COLORS.brand);
    this.pdf.text('INSTITUIÇÃO DE ENSINO', LAYOUT.margin, this.y + 6);

    // Protocolo
    this.pdf.setFontSize(FONTS.size.label);
    this.pdf.setTextColor(COLORS.text.tertiary);
    this.pdf.text('PROTOCOLO', LAYOUT.pageWidth - LAYOUT.margin, this.y + 3, { align: 'right' });

    this.pdf.setFontSize(12);
    this.pdf.setFont(FONTS.family, 'bold');
    this.pdf.setTextColor(COLORS.accent);
    this.pdf.text(`#${incident.id.substring(0, 8).toUpperCase()}`, LAYOUT.pageWidth - LAYOUT.margin, this.y + 8, { align: 'right' });

    this.y += 15;

    // Header Border
    this.pdf.setDrawColor(COLORS.brand);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(LAYOUT.margin, this.y, LAYOUT.pageWidth - LAYOUT.margin, this.y);
    this.y += 5;

    // Subtítulo
    this.pdf.setFontSize(FONTS.size.subtitle);
    this.pdf.setFont(FONTS.family, 'bold');
    this.pdf.setTextColor(COLORS.text.primary);
    this.pdf.text('REGISTRO DE OCORRÊNCIA DISCIPLINAR', LAYOUT.margin, this.y + 4);

    this.pdf.setFontSize(FONTS.size.small);
    this.pdf.setFont(FONTS.family, 'normal');
    this.pdf.setTextColor(COLORS.text.secondary);
    this.pdf.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, LAYOUT.pageWidth - LAYOUT.margin, this.y + 4, { align: 'right' });

    this.y += 12;
  }

  private renderIdentification(incident: Incident, incidentClass: Class | undefined, students: Student[]) {
    const boxHeight = 28;
    this.checkPageBreak(boxHeight + 5);

    // Bg Box
    this.pdf.setFillColor(COLORS.bg.surface);
    this.pdf.setDrawColor(COLORS.border);
    this.pdf.setLineWidth(0.1);
    this.pdf.roundedRect(LAYOUT.margin, this.y, LAYOUT.contentWidth, boxHeight, 1, 1, 'FD');

    const p = 5;
    const col1X = LAYOUT.margin + p;
    const col2X = LAYOUT.margin + (LAYOUT.contentWidth * 0.6);

    const row1Y = this.y + p + 3;
    const row2Y = this.y + p + 14;

    // Aluno(s)
    this.drawLabel('Alunos(s)', col1X, row1Y);
    const names = students.map(s => s.name).join(', ');
    this.drawValue(names, col1X, row1Y + 4, 'bold');

    this.drawLabel('Matrícula(s)', col1X, row2Y);
    const enrollments = students.map(s => s.enrollment || 'N/A').join(', ');
    this.drawValue(enrollments, col1X, row2Y + 4);

    // Contexto
    this.drawLabel('Turma', col2X, row1Y);
    this.drawValue(incidentClass?.name || 'Não inf.', col2X, row1Y + 4);

    this.drawLabel('Data do Fato', col2X, row2Y);
    this.drawValue(formatDate(incident.date), col2X, row2Y + 4);

    this.y += boxHeight + 10;
  }

  private renderStatusBadge(incident: Incident) {
    const sevInfo = getSeverityInfo(incident.finalSeverity);

    this.checkPageBreak(15);

    // Dot
    this.pdf.setFillColor(sevInfo.color);
    this.pdf.setDrawColor(sevInfo.color);
    this.pdf.roundedRect(LAYOUT.margin, this.y, 4, 4, 0.5, 0.5, 'F');

    // Grau
    this.pdf.setFont(FONTS.family, 'bold');
    this.pdf.setFontSize(FONTS.size.subtitle);
    this.pdf.setTextColor(COLORS.text.primary);
    this.pdf.text(`GRAU ${sevInfo.label}`, LAYOUT.margin + 6, this.y + 3.5);

    // Divider
    this.pdf.setDrawColor(COLORS.border);
    this.pdf.line(LAYOUT.margin + 45, this.y, LAYOUT.margin + 45, this.y + 4);

    // Status
    this.pdf.setTextColor(COLORS.text.secondary);
    this.pdf.setFont(FONTS.family, 'normal');
    this.pdf.text(`Status: ${incident.status.toUpperCase()}`, LAYOUT.margin + 50, this.y + 3.5);

    this.y += 10;
  }

  private renderEpisodes(episodes: string[]) {
    if (!episodes || episodes.length === 0) return;

    this.drawLabel('Infrações/Episódios', LAYOUT.margin, this.y);
    this.y += 4;

    const startX = LAYOUT.margin;
    let currentX = startX;

    episodes.forEach(ep => {
      this.pdf.setFontSize(FONTS.size.small);
      const w = this.pdf.getTextWidth(ep) + 6;

      // Quebra de linha para tags
      if (currentX + w > LAYOUT.pageWidth - LAYOUT.margin) {
        currentX = startX;
        this.y += 8;
        this.checkPageBreak(10);
      }

      this.pdf.setDrawColor(COLORS.border);
      this.pdf.roundedRect(currentX, this.y, w, 6, 1, 1, 'S');

      this.pdf.setTextColor(COLORS.text.primary);
      this.pdf.text(ep, currentX + 3, this.y + 4);

      currentX += w + 2;
    });

    this.y += 10;
  }

  private renderFollowUps(followUps: FollowUpRecord[]) {
    if (!followUps || followUps.length === 0) return;

    this.drawSectionTitle('Histórico de Acompanhamento');

    // Ordenar por data (mais recente primeiro ou cronológico?) 
    // Cronológico reverso (mais recente em cima) parece melhor para leitura rápida, 
    // mas em relatórios oficiais cronológico (antigo -> novo) conta a história.
    // Vamos usar cronológico (antigo -> novo).
    const sorted = [...followUps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((fu, index) => {
      this.checkPageBreak(30); // Espaço mínimo para começar um bloco

      // Data e Tipo
      this.pdf.setFont(FONTS.family, 'bold');
      this.pdf.setFontSize(FONTS.size.value);
      this.pdf.setTextColor(COLORS.brand);

      const typeLabel = {
        'conversa_individual': 'Conversa Individual',
        'conversa_pais': 'Conversa com Responsáveis',
        'situacoes_diversas': 'Situação Diversa/Outros'
      }[fu.type] || fu.type;

      this.pdf.text(`${index + 1}. ${formatDate(fu.date)} - ${typeLabel}`, LAYOUT.margin, this.y);
      this.y += 5;

      // Responsável
      this.pdf.setFont(FONTS.family, 'normal');
      this.pdf.setFontSize(FONTS.size.small);
      this.pdf.setTextColor(COLORS.text.secondary);
      this.pdf.text(`Registrado por: ${fu.responsavel || 'Não informado'}`, LAYOUT.margin, this.y);
      this.y += 6;

      // Campos variáveis
      const fields = [];
      if (fu.motivo) fields.push({ l: 'Motivo', v: fu.motivo });
      if (fu.providencias) fields.push({ l: 'Providências', v: fu.providencias });
      if (fu.assuntosTratados) fields.push({ l: 'Assuntos', v: fu.assuntosTratados });
      if (fu.encaminhamentos) fields.push({ l: 'Encaminhamentos', v: fu.encaminhamentos });

      fields.forEach(field => {
        const text = `${field.l}: ${field.v}`;

        // Renderizar campo com quebra de linha
        this.pdf.setFont(FONTS.family, 'normal');
        this.pdf.setFontSize(FONTS.size.body);
        this.pdf.setTextColor(COLORS.text.primary);

        const lines = this.pdf.splitTextToSize(text, LAYOUT.contentWidth - 5); // Indentado levemente

        lines.forEach((line: string) => {
          this.checkPageBreak(5);
          this.pdf.text(line, LAYOUT.margin + 2, this.y + 4); // +2 indent
          this.y += 5;
        });

        this.y += 1; // pequeno spaço entre campos
      });

      this.y += 6; // espaço entre followups

      // Linha separadora leve se não for o último
      if (index < sorted.length - 1) {
        this.pdf.setDrawColor(COLORS.border);
        this.pdf.setLineWidth(0.1);
        // pontilhado se possível, senão linha sólida muito clara
        this.pdf.line(LAYOUT.margin, this.y, LAYOUT.pageWidth - LAYOUT.margin, this.y);
        this.y += 6;
      }
    });

    this.y += 5;
  }

  private renderComments(comments: Comment[]) {
    if (!comments || comments.length === 0) return;

    this.drawSectionTitle('Observações Adicionais');

    comments.forEach(comment => {
      this.checkPageBreak(20);

      this.pdf.setFont(FONTS.family, 'bold');
      this.pdf.setFontSize(FONTS.size.small);
      this.pdf.setTextColor(COLORS.text.secondary);
      this.pdf.text(`${comment.userName} em ${formatDateTime(comment.createdAt)}`, LAYOUT.margin, this.y);
      this.y += 4;

      this.drawParagraph(comment.text);
      this.y += 2;
    });
    this.y += 5;
  }

  private renderSignatures() {
    // Bloco de assinaturas precisa de aprox 40mm
    // Tenta manter unido na página atual, se não couber, joga para nova página
    this.checkPageBreak(40);

    this.y += 10; // Espaço antes das assinaturas

    const sigWidth = (LAYOUT.contentWidth - 10) / 3;
    const sigY = this.y + 15; // Linha de assinatura

    this.pdf.setDrawColor(COLORS.text.primary);
    this.pdf.setLineWidth(0.2);
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(COLORS.text.primary);

    // 1. Escola
    this.pdf.line(LAYOUT.margin, sigY, LAYOUT.margin + sigWidth, sigY);
    this.pdf.text('Responsável pela Escola', LAYOUT.margin, sigY + 4);

    // 2. Aluno
    const x2 = LAYOUT.margin + sigWidth + 5;
    this.pdf.line(x2, sigY, x2 + sigWidth, sigY);
    this.pdf.text('Aluno(a)', x2, sigY + 4);

    // 3. Responsável
    const x3 = x2 + sigWidth + 5;
    this.pdf.line(x3, sigY, LAYOUT.pageWidth - LAYOUT.margin, sigY);
    this.pdf.text('Responsável Legal', x3, sigY + 4);

    this.y = sigY + 15;
  }

  private renderFooterInfo() {
    const footerY = LAYOUT.pageHeight - 10;

    // Hash/ID
    this.pdf.setFontSize(6);
    this.pdf.setTextColor(COLORS.text.tertiary);
    this.pdf.text(
      `ID: ${this.id || 'N/A'} - Página ${this.pageCount}`,
      LAYOUT.margin,
      footerY
    );

    // Brand
    this.pdf.text('Acerto Disciplina System', LAYOUT.pageWidth - LAYOUT.margin, footerY, { align: 'right' });
  }

  // Id hook for footer
  private id: string = '';

  // --- Main Generate ---

  public generate(
    incident: Incident,
    incidentClass: Class | undefined,
    students: Student[]
  ) {
    this.id = incident.id.substring(0, 8);

    this.renderHeader(incident);
    this.renderIdentification(incident, incidentClass, students);
    this.renderStatusBadge(incident);

    this.renderEpisodes(incident.episodes);

    if (incident.description) {
      this.drawSectionTitle('Descrição dos Fatos');
      this.drawParagraph(incident.description);
    }

    if (incident.actions) {
      this.drawSectionTitle('Providências Tomadas');
      this.drawParagraph(incident.actions);
    }

    // Renderizar FollowUps se houver
    if (incident.followUps && incident.followUps.length > 0) {
      this.renderFollowUps(incident.followUps);
    }

    // Renderizar Comentários se houver
    if (incident.comments && incident.comments.length > 0) {
      this.renderComments(incident.comments);
    }

    this.renderSignatures();
    this.renderFooterInfo(); // Footer da última página

    // Save
    const studentName = students[0]?.name?.split(' ')[0] || 'Aluno';
    const dateStr = formatDate(incident.date).replace(/\//g, '-');
    this.pdf.save(`Ocorrencia_${incident.id.substring(0, 6)}_${studentName}_${dateStr}.pdf`);
  }

}

// ================ EXPORT ================

export function generateIncidentPDF(
  incident: Incident,
  incidentClass: Class | undefined,
  students: Student[]
) {
  const generator = new IncidentPDF();
  generator.generate(incident, incidentClass, students);
}
