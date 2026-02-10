import { Class, FollowUpRecord, Incident, Student } from '@/types';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { BasePDFGenerator } from './basePdfExport';
import { ActionLevel, getRequiredActionLevel } from './incidentActions';

const EPISODE_MAP = new Map(
  INCIDENT_EPISODES.map((episode) => [episode.id, episode.description]),
);

const SEVERITY_LABELS: Record<string, string> = {
  leve: 'Leve',
  intermediaria: 'Intermediária',
  grave: 'Grave',
  gravissima: 'Gravíssima',
};

const ACTION_LEVEL_SHORT_TEXT: Record<ActionLevel, string> = {
  conversa_registro: 'Conversa de orientação com registro formal da ocorrência.',
  comunicado_pais: 'Comunicado formal aos responsáveis e orientações de acompanhamento.',
  suspensao_1_dia:
    'Suspensão das atividades escolares por 1 dia, com retorno mediante responsável.',
  suspensao_3_dias:
    'Suspensão das atividades escolares por 3 dias, com retorno mediante responsável.',
};

class IncidentParentNotificationPDF extends BasePDFGenerator {
  private getResponsibleName(
    incident: Incident,
    incidentClass?: Class,
  ): string {
    if (incident.followUps && incident.followUps.length > 0) {
      const sorted = [...incident.followUps].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const lastFollowUp = sorted[sorted.length - 1];
      if (lastFollowUp?.responsavel?.trim()) return lastFollowUp.responsavel.trim();
    }

    if (incidentClass?.directorEmail?.trim()) {
      return incidentClass.directorEmail.trim();
    }

    return this.config.directorName || 'Responsável pelo Registro';
  }

  private getLatestFollowUp(followUps?: FollowUpRecord[]): FollowUpRecord | null {
    if (!followUps || followUps.length === 0) return null;
    const sorted = [...followUps].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return sorted[sorted.length - 1] ?? null;
  }

  private getOccurrenceSummary(incident: Incident): string {
    if (incident.description?.trim()) return incident.description.trim();

    if (incident.episodes && incident.episodes.length > 0) {
      const list = incident.episodes.map((episodeId) => EPISODE_MAP.get(episodeId) ?? episodeId);
      return list.join('; ');
    }

    return 'Ocorrência disciplinar registrada no sistema da escola.';
  }

  private getSchoolMeasure(incident: Incident, actionLevel: ActionLevel): string {
    const latestFollowUp = this.getLatestFollowUp(incident.followUps);
    if (latestFollowUp?.providencias?.trim()) return latestFollowUp.providencias.trim();
    if (incident.actions?.trim()) return incident.actions.trim();
    if (incident.suggestedAction?.trim()) return incident.suggestedAction.trim();
    return ACTION_LEVEL_SHORT_TEXT[actionLevel];
  }

  private getFamilyMessage(actionLevel: ActionLevel): string {
    if (actionLevel === 'suspensao_1_dia' || actionLevel === 'suspensao_3_dias') {
      return 'Solicitamos o comparecimento do responsável legal na escola para alinhamento das medidas aplicadas.';
    }

    return 'Este documento tem objetivo de dar ciência aos responsáveis e fortalecer o acompanhamento escolar do estudante.';
  }

  private renderIdentification(
    student: Student | undefined,
    incidentClass: Class | undefined,
    incident: Incident,
  ) {
    this.drawRect(this.margin, this.y, this.contentWidth, 22, {
      fill: '#F5F5F5',
      stroke: '#000000',
    });

    const startY = this.y + 5;
    const col1 = this.colX(1) + 4;
    const col2 = this.colX(7) + 4;

    this.renderField('Estudante', student?.name || 'Não informado', col1, startY, this.colWidth(6) - 8);
    this.renderField('Turma', incidentClass?.name || 'Não informada', col2, startY, this.colWidth(6) - 8);

    this.renderField(
      'Data do fato',
      new Date(incident.date).toLocaleDateString('pt-BR'),
      col1,
      startY + 9,
      this.colWidth(6) - 8,
    );
    this.renderField(
      'Gravidade',
      SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity,
      col2,
      startY + 9,
      this.colWidth(6) - 8,
    );

    this.y += 26;
  }

  private renderSignatures(studentName?: string, responsibleName?: string) {
    this.checkPageBreak(48);
    this.y += 12;

    const sigY = this.y + 14;
    const colW = this.contentWidth / 2;

    this.pdf.setLineWidth(0.3);
    this.pdf.setDrawColor('#000000');

    this.pdf.line(this.margin, sigY, this.margin + colW - 5, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável pelo Registro', this.margin + (colW - 5) / 2, sigY + 4, {
      align: 'center',
    });
    if (responsibleName) {
      this.setFont('xs', 'bold', '#000000');
      this.drawText(responsibleName, this.margin + (colW - 5) / 2, sigY + 8, {
        align: 'center',
        maxWidth: colW - 5,
      });
    }

    this.pdf.line(this.margin + colW, sigY, this.pageWidth - this.margin, sigY);
    this.setFont('xs', 'normal', '#000000');
    this.drawText('Responsável Legal', this.margin + colW + (colW - 5) / 2, sigY + 4, {
      align: 'center',
    });
    if (studentName) {
      this.setFont('2xs', 'normal', '#666666');
      this.drawText(`Ref. estudante: ${studentName}`, this.margin + colW + (colW - 5) / 2, sigY + 8, {
        align: 'center',
        maxWidth: colW - 5,
      });
    }
  }

  public async generate(
    incident: Incident,
    incidentClass: Class | undefined,
    students: Student[],
    allIncidents: Incident[],
    singleStudent?: Student,
  ) {
    await this.loadConfig();
    this.renderHeader();

    const targetStudent = singleStudent || students[0];
    const targetStudentIds = targetStudent ? [targetStudent.id] : incident.studentIds;
    const actionLevel = getRequiredActionLevel(
      targetStudentIds,
      incident.finalSeverity,
      allIncidents,
    );

    this.setFont('md', 'bold', '#000000');
    this.drawText('Notificação aos Responsáveis', this.margin, this.y);
    this.y += 6;

    this.setFont('2xs', 'normal', '#666666');
    this.drawText(
      `Protocolo: ${incident.id.substring(0, 8).toUpperCase()}  |  Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
      this.margin,
      this.y,
    );
    this.y += 8;

    this.renderIdentification(targetStudent, incidentClass, incident);

    this.renderSectionTitle('Comunicado');
    const intro = `Informamos que o(a) estudante ${targetStudent?.name || 'identificado(a) neste registro'} esteve envolvido(a) em ocorrência disciplinar registrada pela escola.`;
    this.setFont('xs', 'normal', '#000000');
    const introLines = this.pdf.splitTextToSize(intro, this.contentWidth - 2);
    this.drawText(introLines, this.margin + 1, this.y + 3);
    this.y += Math.max(6, introLines.length * 4) + 2;

    this.setFont('xs', 'bold', '#000000');
    this.drawText('Resumo do ocorrido:', this.margin, this.y + 3);
    this.y += 5;
    const summaryLines = this.pdf.splitTextToSize(this.getOccurrenceSummary(incident), this.contentWidth - 2);
    this.setFont('xs', 'normal', '#000000');
    this.drawText(summaryLines, this.margin + 1, this.y + 3);
    this.y += Math.max(6, summaryLines.length * 4) + 3;

    this.renderSectionTitle('Medida adotada pela escola');
    const measureLines = this.pdf.splitTextToSize(
      this.getSchoolMeasure(incident, actionLevel),
      this.contentWidth - 2,
    );
    this.setFont('xs', 'normal', '#000000');
    this.drawText(measureLines, this.margin + 1, this.y + 3);
    this.y += Math.max(6, measureLines.length * 4) + 3;

    this.renderSectionTitle('Encaminhamento aos responsáveis');
    const familyLines = this.pdf.splitTextToSize(this.getFamilyMessage(actionLevel), this.contentWidth - 2);
    this.setFont('xs', 'normal', '#000000');
    this.drawText(familyLines, this.margin + 1, this.y + 3);
    this.y += Math.max(6, familyLines.length * 4) + 3;

    this.renderSignatures(
      targetStudent?.name,
      this.getResponsibleName(incident, incidentClass),
    );

    const firstName = (targetStudent?.name || 'Aluno').split(' ')[0];
    this.save(`Notificacao_Acompanhamento_${incident.id.substring(0, 6)}_${firstName}.pdf`);
  }
}

export async function generateIncidentParentNotificationPDF(
  incident: Incident,
  incidentClass: Class | undefined,
  students: Student[],
  allIncidents: Incident[],
) {
  const scopedStudents =
    incident.studentIds && incident.studentIds.length > 0
      ? students.filter((student) => incident.studentIds.includes(student.id))
      : students;

  if (scopedStudents.length > 1) {
    for (const student of scopedStudents) {
      const generator = new IncidentParentNotificationPDF();
      await generator.generate(
        incident,
        incidentClass,
        scopedStudents,
        allIncidents,
        student,
      );
    }
    return;
  }

  const generator = new IncidentParentNotificationPDF();
  await generator.generate(incident, incidentClass, scopedStudents, allIncidents);
}
