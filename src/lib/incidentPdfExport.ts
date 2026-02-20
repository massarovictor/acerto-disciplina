import JSZip from 'jszip';
import { Incident, Student, Class, Comment } from '@/types';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { FAMILY_FOLLOW_UP_EPISODES } from '@/data/familyFollowUpEpisodes';
import { BasePDFGenerator } from './basePdfExport';
import { supabase } from '@/services/supabase/client';
import { perfTimer } from '@/lib/perf';
import { formatBrasiliaDate } from './brasiliaDate';
import { isFamilyIncident } from './incidentType';

/**
 * Gerador de PDF de Acompanhamentos Disciplinares
 */

const EPISODE_MAP = new Map(INCIDENT_EPISODES.map((episode) => [episode.id, episode.description]));
const FAMILY_EPISODE_MAP = new Map(
  FAMILY_FOLLOW_UP_EPISODES.map((episode) => [episode.id, episode.description]),
);

// Mapeamento de gravidade para texto formatado (sem cores)
const SEVERITY_LABELS: Record<string, string> = {
  leve: 'Leve',
  intermediaria: 'Intermediária',
  grave: 'Grave',
  gravissima: 'Gravíssima',
};

const FAMILY_ATTENTION_LABELS: Record<string, string> = {
  leve: 'Baixa',
  intermediaria: 'Média',
  grave: 'Alta',
  gravissima: 'Crítica',
};

const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  acompanhamento: 'Em Acompanhamento',
  resolvida: 'Resolvida',
};

const sanitizeFileNamePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getStudentFirstName = (student?: Student) =>
  (student?.name || 'Aluno').split(' ')[0] || 'Aluno';

const getIncidentPdfFileName = (incident: Incident, student?: Student) =>
  `Ocorrencia_${incident.id.substring(0, 6)}_${sanitizeFileNamePart(getStudentFirstName(student))}.pdf`;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getIncidentZipFileName = (incident: Incident) =>
  `Ocorrencias_${incident.id.substring(0, 6)}.zip`;

class IncidentPDF extends BasePDFGenerator {
  private responsibleName: string = '';

  constructor() {
    super();
  }

  private async getResponsibleName(
    incident: Incident,
    incidentClass?: Class,
  ): Promise<string> {
    // Tenta buscar o email do último acompanhamento primeiro
    if (incident.followUps && incident.followUps.length > 0) {
      const lastFollowUp = incident.followUps[incident.followUps.length - 1];
      if (lastFollowUp.responsavel?.trim()) {
        return lastFollowUp.responsavel.trim();
      }
    }

    // Se não tiver no acompanhamento, usa o email do diretor da turma
    if (incidentClass?.directorEmail?.trim()) {
      return incidentClass.directorEmail.trim();
    }

    // Se não tiver, busca o email do usuário que criou o incidente
    if (incident.createdBy) {
      const done = perfTimer('incident_pdf.profile_lookup');
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', incident.createdBy)
          .single();

        if (profile?.email) {
          done({ ok: true });
          return profile.email;
        }
        done({ ok: true, email: 'missing' });
      } catch (e) {
        done({ ok: false });
        console.error('Erro ao buscar email do responsável:', e);
      }
    }

    // Fallback para o responsável configurado
    return this.config.directorName || 'Responsável pelo Registro';
  }

  public async generate(
    incident: Incident,
    incidentClass: Class | undefined,
    students: Student[],
    singleStudent?: Student
  ) {
    try {
      await this.loadConfig();
      this.responsibleName = await this.getResponsibleName(
        incident,
        incidentClass,
      );
      this.renderHeader();
      const isFamilyFlow = isFamilyIncident(incident);

      // Título do Documento - formato profissional
      this.setFont('md', 'bold', '#000000');
      this.drawText(
        isFamilyFlow
          ? 'Registro de Acompanhamento Familiar'
          : 'Registro de Ocorrência Disciplinar',
        this.margin,
        this.y,
      );
      this.y += 6;

      // Protocolo e Meta - formato compacto
      this.setFont('2xs', 'normal', '#666666');
      this.drawText(`Protocolo: ${incident.id.substring(0, 8).toUpperCase()}  |  Data do Registro: ${formatBrasiliaDate(incident.createdAt)}`, this.margin, this.y);
      this.y += 8;

      // Identificação (Grid 2 colunas)
      this.renderIdentification(incident, incidentClass, students, singleStudent);

      // Status e Gravidade
      this.renderStatusInfo(incident, isFamilyFlow);

      // Episódios
      this.renderEpisodes(incident.episodes, isFamilyFlow);

      // Descrição
      if (incident.description) {
        this.checkPageBreak(35); // Orphan control: Garante título + ~3-4 linhas
        this.renderSectionTitle(
          isFamilyFlow ? 'Contexto do acompanhamento' : 'Descrição dos Fatos',
        );
        this.setFont('xs', 'normal', '#000000');
        const lines = this.pdf.splitTextToSize(incident.description, this.contentWidth);
        lines.forEach((line: string) => {
          this.checkPageBreak(5);
          this.drawText(line, this.margin, this.y + 4);
          this.y += 5;
        });
        this.y += 5;
      }

      // Providências (Ações Iniciais + Encaminhamentos dos Acompanhamentos)
      const hasActions = !!incident.actions;
      const followUpsWithEncaminhamentos = incident.followUps?.filter(f => f.encaminhamentos && f.encaminhamentos.trim()) || [];

      if (hasActions || followUpsWithEncaminhamentos.length > 0) {
        this.checkPageBreak(35); // Orphan control
        this.renderSectionTitle(
          isFamilyFlow
            ? 'Plano de acompanhamento / combinados'
            : 'Providências Tomadas / Combinados',
        );

        // 1. Ações Iniciais (Campo "Providências" do registro principal)
        if (hasActions) {
          this.setFont('xs', 'normal', '#000000');
          const lines = this.pdf.splitTextToSize(incident.actions, this.contentWidth);
          lines.forEach((line: string) => {
            this.checkPageBreak(5);
            this.drawText(line, this.margin, this.y + 4);
            this.y += 5;
          });
          this.y += 3; // Espaçamento entre as ações iniciais e os combinados
        }

        // 2. Encaminhamentos de Acompanhamentos (Sorted by date)
        if (followUpsWithEncaminhamentos.length > 0) {
          const sorted = [...followUpsWithEncaminhamentos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          sorted.forEach((fu, index) => {
            this.checkPageBreak(15);
            const dateStr = formatBrasiliaDate(fu.date);

            // Subtítulo do combinado
            this.setFont('xs', 'bold', '#000000');
            this.drawText(
              `${isFamilyFlow ? 'Registro' : 'Combinado'} em ${dateStr}:`,
              this.margin,
              this.y + 4,
            );
            this.y += 5;

            // Conteúdo do combinado
            this.setFont('xs', 'normal', '#000000');
            const lines = this.pdf.splitTextToSize(fu.encaminhamentos || '', this.contentWidth);
            lines.forEach((line: string) => {
              this.checkPageBreak(5);
              this.drawText(line, this.margin, this.y + 4);
              this.y += 5;
            });
            this.y += 3; // Espaçamento entre itens
          });
        }
        this.y += 2; // Espaçamento final da seção
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

      const targetStudent = singleStudent || students[0];
      const fileName = getIncidentPdfFileName(incident, targetStudent);
      const blob = this.outputBlob();
      return { blob, fileName };
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
    this.renderField('Data do Fato', formatBrasiliaDate(incident.date), col2, startY + 9, this.colWidth(6) - 8);

    this.y += 25;
  }

  private renderStatusInfo(incident: Incident, isFamilyFlow: boolean) {
    // Gravidade e Status - preto e branco, formato profissional
    const severityTitle = isFamilyFlow ? 'Nível de atenção:' : 'Gravidade:';
    const severityLabel = isFamilyFlow
      ? (FAMILY_ATTENTION_LABELS[incident.finalSeverity] || incident.finalSeverity)
      : (SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity);

    this.setFont('xs', 'normal', '#000000');
    this.drawText(severityTitle, this.margin, this.y + 4);

    const severityTitleWidth = this.pdf.getTextWidth(severityTitle);
    this.setFont('xs', 'bold', '#000000');
    const severityLabelWidth = this.pdf.getTextWidth(severityLabel);
    const severityBoxWidth = Math.max(28, severityLabelWidth + 12);
    const severityBoxX = this.margin + severityTitleWidth + 4;

    // Caixa com borda preta (sem cor de fundo)
    this.drawRect(severityBoxX, this.y, severityBoxWidth, 6, {
      stroke: '#000000',
      radius: 1,
    });
    this.drawText(severityLabel, severityBoxX + severityBoxWidth / 2, this.y + 4.2, {
      align: 'center',
    });

    const statusTitle = 'Status:';
    const statusTitleX = severityBoxX + severityBoxWidth + 10;
    this.setFont('xs', 'normal', '#000000');
    this.drawText(statusTitle, statusTitleX, this.y + 4);
    this.setFont('xs', 'bold', '#000000');
    const statusLabel = STATUS_LABELS[incident.status] || incident.status;
    const statusValueX = statusTitleX + this.pdf.getTextWidth(statusTitle) + 3;
    this.drawText(statusLabel, statusValueX, this.y + 4);

    this.y += 10;
  }

  private renderEpisodes(episodes: string[], isFamilyFlow: boolean) {
    if (!episodes || episodes.length === 0) return;

    this.setFont('xs', 'normal', '#000000');
    this.drawText(
      isFamilyFlow ? 'Pontos de acompanhamento:' : 'Episódios / Infrações:',
      this.margin,
      this.y,
    );
    this.y += 4;

    // Lista simples, sem caixas coloridas
    episodes.forEach((ep, index) => {
      const label = isFamilyFlow
        ? FAMILY_EPISODE_MAP.get(ep) ?? ep
        : EPISODE_MAP.get(ep) ?? ep;
      this.setFont('xs', 'normal', '#000000');
      this.drawText(`${index + 1}. ${label}`, this.margin + 2, this.y + 3.5);
      this.y += 5;
    });

    this.y += 5;
  }



  private renderComments(comments: Comment[]) {
    this.checkPageBreak(35);
    this.renderSectionTitle('Observações Adicionais');
    comments.forEach(c => {
      this.checkPageBreak(15);
      this.setFont('xs', 'bold', '#000000');
      this.drawText(`${c.userName} em ${formatBrasiliaDate(c.createdAt)}`, this.margin, this.y + 3);
      this.y += 4;

      this.setFont('xs', 'normal', '#000000');
      const lines = this.pdf.splitTextToSize(c.text, this.contentWidth - 5);
      this.drawText(lines, this.margin + 2, this.y + 3);
      this.y += (lines.length * 5) + 4;
    });
  }

  private renderSignatures(student?: Student, legalGuardianName?: string) {
    this.checkPageBreak(60); // Aumentado para garantir bloco completo
    this.y += 15;

    const sigY = this.y + 15;
    const colW = this.contentWidth / 3;

    this.pdf.setLineWidth(0.3);
    this.pdf.setDrawColor('#000000');

    // Responsável pelo Registro (quem registrou/acompanhou)
    this.pdf.line(this.margin, sigY, this.margin + colW - 5, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável pelo Registro', this.margin + (colW - 5) / 2, sigY + 4, { align: 'center' });
    if (this.responsibleName) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(this.responsibleName, this.margin + (colW - 5) / 2, sigY + 8, { align: 'center', maxWidth: colW - 5 });
    }

    // Estudante
    this.pdf.line(this.margin + colW, sigY, this.margin + (colW * 2) - 5, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Estudante', this.margin + colW + (colW - 5) / 2, sigY + 4, { align: 'center' });
    if (student) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(student.name, this.margin + colW + (colW - 5) / 2, sigY + 8, { align: 'center', maxWidth: colW - 5 });
    }

    // Responsável Legal
    this.pdf.line(this.margin + (colW * 2), sigY, this.pageWidth - this.margin, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável Legal', this.margin + (colW * 2) + (colW - 5) / 2, sigY + 4, { align: 'center' });
    if (legalGuardianName) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(legalGuardianName, this.margin + (colW * 2) + (colW - 5) / 2, sigY + 8, { align: 'center', maxWidth: colW - 5 });
    }

    // Assinatura Digitalizada se houver (posicionada no responsável pelo registro)
    if (this.config.signatureBase64) {
      try {
        this.pdf.addImage(this.config.signatureBase64, 'PNG', this.margin + 5, sigY - 12, 25, 10);
      } catch (error) {
        console.warn('Falha ao renderizar assinatura digital no PDF de ocorrência.', error);
      }
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
    const zip = new JSZip();
    for (const student of scopedStudents) {
      const generator = new IncidentPDF();
      const { blob, fileName } = await generator.generate(
        incident,
        incidentClass,
        scopedStudents,
        student,
      );
      zip.file(fileName, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, getIncidentZipFileName(incident));
  } else {
    const generator = new IncidentPDF();
    const { blob, fileName } = await generator.generate(
      incident,
      incidentClass,
      scopedStudents,
    );
    downloadBlob(blob, fileName);
  }
}
