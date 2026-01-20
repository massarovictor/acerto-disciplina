import { Incident, Student, Class, FollowUpRecord, Comment } from '@/types';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { BasePDFGenerator } from './basePdfExport';
import { supabase } from '@/services/supabase/client';

/**
 * Gerador de PDF de Ocorrências Disciplinares
 */

const EPISODE_MAP = new Map(INCIDENT_EPISODES.map((episode) => [episode.id, episode.description]));

// Mapeamento de gravidade para texto formatado (sem cores)
const SEVERITY_LABELS: Record<string, string> = {
  leve: 'Leve',
  intermediaria: 'Intermediária',
  grave: 'Grave',
  gravissima: 'Gravíssima',
};

const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  acompanhamento: 'Em Acompanhamento',
  resolvida: 'Resolvida',
};

class IncidentPDF extends BasePDFGenerator {
  private responsibleName: string = '';

  constructor() {
    super();
  }

  private async getResponsibleName(incident: Incident): Promise<string> {
    // Tenta buscar o email do último acompanhamento primeiro
    if (incident.followUps && incident.followUps.length > 0) {
      const lastFollowUp = incident.followUps[incident.followUps.length - 1];
      if (lastFollowUp.responsavel) {
        return lastFollowUp.responsavel;
      }
    }

    // Se não tiver, busca o email do usuário que criou o incidente
    if (incident.createdBy) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', incident.createdBy)
          .single();

        if (profile?.email) {
          return profile.email;
        }
      } catch (e) {
        console.error('Erro ao buscar email do responsável:', e);
      }
    }

    // Fallback para o diretor configurado
    return this.config.directorName || 'Responsável pela Escola';
  }

  public async generate(
    incident: Incident,
    incidentClass: Class | undefined,
    students: Student[],
    singleStudent?: Student
  ) {
    try {
      await this.loadConfig();
      this.responsibleName = await this.getResponsibleName(incident);
      this.renderHeader();

      // Título do Documento - formato profissional
      this.setFont('md', 'bold', '#000000');
      this.drawText('Registro de Ocorrência Disciplinar', this.margin, this.y);
      this.y += 6;

      // Protocolo e Meta - formato compacto
      this.setFont('2xs', 'normal', '#666666');
      this.drawText(`Protocolo: ${incident.id.substring(0, 8).toUpperCase()}  |  Data do Registro: ${new Date(incident.createdAt).toLocaleDateString('pt-BR')}`, this.margin, this.y);
      this.y += 8;

      // Identificação (Grid 2 colunas)
      this.renderIdentification(incident, incidentClass, students, singleStudent);

      // Status e Gravidade
      this.renderStatusInfo(incident);

      // Episódios
      this.renderEpisodes(incident.episodes);

      // Descrição
      if (incident.description) {
        this.renderSectionTitle('Descrição dos Fatos');
        this.setFont('xs', 'normal', '#000000');
        const lines = this.pdf.splitTextToSize(incident.description, this.contentWidth);
        lines.forEach((line: string) => {
          this.checkPageBreak(5);
          this.drawText(line, this.margin, this.y + 4);
          this.y += 5;
        });
        this.y += 5;
      }

      // Providências
      if (incident.actions) {
        this.renderSectionTitle('Providências Tomadas / Combinados');
        this.setFont('xs', 'normal', '#000000');
        const lines = this.pdf.splitTextToSize(incident.actions, this.contentWidth);
        lines.forEach((line: string) => {
          this.checkPageBreak(5);
          this.drawText(line, this.margin, this.y + 4);
          this.y += 5;
        });
        this.y += 5;
      }

      // Acompanhamentos
      if (incident.followUps && incident.followUps.length > 0) {
        this.renderFollowUps(incident.followUps);
      }

      // Comentários
      if (incident.comments && incident.comments.length > 0) {
        this.renderComments(incident.comments);
      }

      // Assinaturas - buscar nome do responsável legal do último acompanhamento se houver
      const lastFollowUp = incident.followUps && incident.followUps.length > 0
        ? incident.followUps[incident.followUps.length - 1]
        : null;
      const legalGuardianName = lastFollowUp?.nomeResponsavelPai || undefined;

      this.renderSignatures(singleStudent || (students.length === 1 ? students[0] : undefined), legalGuardianName);

      const name = (singleStudent || students[0])?.name || 'Aluno';
      this.save(`Ocorrencia_${incident.id.substring(0, 6)}_${name.split(' ')[0]}.pdf`);
    } catch (error) {
      console.error('Erro fatal ao gerar PDF de ocorrência:', error);
      throw error;
    }
  }

  private renderIdentification(incident: Incident, incidentClass: Class | undefined, students: Student[], singleStudent?: Student) {
    // Caixa de identificação - preto e branco
    this.drawRect(this.margin, this.y, this.contentWidth, 20, { fill: '#F5F5F5', stroke: '#000000' });

    const startY = this.y + 5;
    const col1 = this.colX(1) + 4;
    const col2 = this.colX(7) + 4;

    this.renderField('Estudante(s)', singleStudent ? singleStudent.name : students.map(s => s.name).join(', '), col1, startY, this.colWidth(6) - 8);
    this.renderField('Turma', incidentClass?.name || 'Não informado', col2, startY, this.colWidth(6) - 8);

    this.renderField('Matrícula(s)', singleStudent ? (singleStudent.enrollment || 'N/A') : students.map(s => s.enrollment || 'N/A').join(', '), col1, startY + 9, this.colWidth(6) - 8);
    this.renderField('Data do Fato', new Date(incident.date).toLocaleDateString('pt-BR'), col2, startY + 9, this.colWidth(6) - 8);

    this.y += 25;
  }

  private renderStatusInfo(incident: Incident) {
    // Gravidade e Status - preto e branco, formato profissional
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Gravidade:', this.margin, this.y + 4);

    // Caixa com borda preta (sem cor de fundo)
    this.drawRect(this.margin + 20, this.y, 35, 6, { stroke: '#000000', radius: 1 });
    this.setFont('xs', 'bold', '#000000');
    const severityLabel = SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity;
    this.drawText(severityLabel, this.margin + 37.5, this.y + 4.2, { align: 'center' });

    this.setFont('xs', 'normal', '#000000');
    this.drawText('Status:', this.margin + 60, this.y + 4);
    this.setFont('xs', 'bold', '#000000');
    const statusLabel = STATUS_LABELS[incident.status] || incident.status;
    this.drawText(statusLabel, this.margin + 75, this.y + 4);

    this.y += 10;
  }

  private renderEpisodes(episodes: string[]) {
    if (!episodes || episodes.length === 0) return;

    this.setFont('xs', 'normal', '#000000');
    this.drawText('Episódios / Infrações:', this.margin, this.y);
    this.y += 4;

    // Lista simples, sem caixas coloridas
    episodes.forEach((ep, index) => {
      const label = EPISODE_MAP.get(ep) ?? ep;
      this.setFont('xs', 'normal', '#000000');
      this.drawText(`${index + 1}. ${label}`, this.margin + 2, this.y + 3.5);
      this.y += 5;
    });

    this.y += 5;
  }

  private renderFollowUps(followUps: FollowUpRecord[]) {
    this.renderSectionTitle('Histórico de Acompanhamento');

    const sorted = [...followUps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((fu, index) => {
      this.checkPageBreak(25);

      this.setFont('xs', 'bold', '#000000');
      this.drawText(`${index + 1}. ${new Date(fu.date).toLocaleDateString('pt-BR')} - ${this.getFollowUpType(fu.type)}`, this.margin, this.y + 4);
      this.y += 6;

      const fields = [];
      if (fu.responsavel) fields.push(`Registrado por: ${fu.responsavel}`);
      if (fu.motivo) fields.push(`Motivo: ${fu.motivo}`);
      if (fu.providencias) fields.push(`Providências: ${fu.providencias}`);

      this.setFont('xs', 'normal', '#000000');
      fields.forEach(f => {
        const lines = this.pdf.splitTextToSize(f, this.contentWidth - 10);
        lines.forEach((line: string) => {
          this.checkPageBreak(5);
          this.drawText(line, this.margin + 5, this.y + 3);
          this.y += 4;
        });
      });
      this.y += 2;
    });
  }

  private getFollowUpType(type: string) {
    const map: any = {
      conversa_individual: 'Conversa Individual',
      conversa_pais: 'Conversa com Responsáveis',
      situacoes_diversas: 'Outras Situações'
    };
    return map[type] || type;
  }

  private renderComments(comments: Comment[]) {
    this.renderSectionTitle('Observações Adicionais');
    comments.forEach(c => {
      this.checkPageBreak(15);
      this.setFont('xs', 'bold', '#000000');
      this.drawText(`${c.userName} em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`, this.margin, this.y + 3);
      this.y += 4;

      this.setFont('xs', 'normal', '#000000');
      const lines = this.pdf.splitTextToSize(c.text, this.contentWidth - 5);
      this.drawText(lines, this.margin + 2, this.y + 3);
      this.y += (lines.length * 5) + 4;
    });
  }

  private renderSignatures(student?: Student, legalGuardianName?: string) {
    this.checkPageBreak(50);
    this.y += 15;

    const sigY = this.y + 15;
    const colW = this.contentWidth / 3;

    this.pdf.setLineWidth(0.3);
    this.pdf.setDrawColor('#000000');

    // Responsável pela Escola (quem registrou/acompanhou)
    this.pdf.line(this.margin, sigY, this.margin + colW - 5, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável pela Escola', this.margin + (colW - 5) / 2, sigY + 4, { align: 'center' });
    if (this.responsibleName) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(this.responsibleName, this.margin + (colW - 5) / 2, sigY + 8, { align: 'center' });
    }

    // Estudante
    this.pdf.line(this.margin + colW, sigY, this.margin + (colW * 2) - 5, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Estudante', this.margin + colW + (colW - 5) / 2, sigY + 4, { align: 'center' });
    if (student) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(student.name, this.margin + colW + (colW - 5) / 2, sigY + 8, { align: 'center' });
    }

    // Responsável Legal
    this.pdf.line(this.margin + (colW * 2), sigY, this.pageWidth - this.margin, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável Legal', this.margin + (colW * 2) + (colW - 5) / 2, sigY + 4, { align: 'center' });
    if (legalGuardianName) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(legalGuardianName, this.margin + (colW * 2) + (colW - 5) / 2, sigY + 8, { align: 'center' });
    }

    // Assinatura Digitalizada se houver (posicionada no responsável pela escola)
    if (this.config.signatureBase64) {
      try {
        this.pdf.addImage(this.config.signatureBase64, 'PNG', this.margin + 5, sigY - 12, 25, 10);
      } catch (e) { }
    }
  }
}

export async function generateIncidentPDF(
  incident: Incident,
  incidentClass: Class | undefined,
  students: Student[]
) {
  const scopedStudents = incident.studentIds && incident.studentIds.length > 0
    ? students.filter((student) => incident.studentIds.includes(student.id))
    : students;

  if (scopedStudents.length > 1) {
    for (const student of scopedStudents) {
      const generator = new IncidentPDF();
      await generator.generate(incident, incidentClass, scopedStudents, student);
    }
  } else {
    const generator = new IncidentPDF();
    await generator.generate(incident, incidentClass, scopedStudents);
  }
}
