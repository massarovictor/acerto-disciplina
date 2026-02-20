import JSZip from 'jszip';
import { Class, FollowUpRecord, Incident, Student } from '@/types';
import { INCIDENT_EPISODES } from '@/data/mockData';
import { FAMILY_FOLLOW_UP_EPISODES } from '@/data/familyFollowUpEpisodes';
import { BasePDFGenerator } from './basePdfExport';
import { ActionLevel, getRequiredActionLevel } from './incidentActions';
import { isPerformanceConvocationIncident } from './incidentClassification';
import { formatBrasiliaDate, getBrasiliaYear } from './brasiliaDate';
import { isFamilyIncident } from './incidentType';

const EPISODE_MAP = new Map(
  INCIDENT_EPISODES.map((episode) => [episode.id, episode.description]),
);
const FAMILY_EPISODE_MAP = new Map(
  FAMILY_FOLLOW_UP_EPISODES.map((episode) => [episode.id, episode.description]),
);

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

const ACTION_LEVEL_SHORT_TEXT: Record<ActionLevel, string> = {
  conversa_registro: 'Conversa de orientação com registro formal da ocorrência.',
  comunicado_pais: 'Comunicado formal aos responsáveis e orientações de acompanhamento.',
  suspensao_1_dia:
    'Suspensão das atividades escolares por 1 dia, com retorno mediante responsável.',
  suspensao_3_dias:
    'Suspensão das atividades escolares por 3 dias, com retorno mediante responsável.',
};

const sanitizeFileNamePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getStudentFirstName = (student?: Student) =>
  (student?.name || 'Aluno').split(' ')[0] || 'Aluno';

const getNotificationPdfFileName = (incident: Incident, student?: Student) =>
  `Notificacao_Acompanhamento_${incident.id.substring(0, 6)}_${sanitizeFileNamePart(getStudentFirstName(student))}.pdf`;

const getNotificationZipFileName = (incident: Incident) =>
  `Notificacoes_Ocorrencia_${incident.id.substring(0, 6)}.zip`;

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

class IncidentParentNotificationPDF extends BasePDFGenerator {
  private hasSuspensionLanguage(value?: string | null): boolean {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes('suspens');
  }

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

    const isFamilyFlow = isFamilyIncident(incident);
    if (incident.episodes && incident.episodes.length > 0) {
      const list = incident.episodes.map((episodeId) =>
        isFamilyFlow
          ? FAMILY_EPISODE_MAP.get(episodeId) ?? episodeId
          : EPISODE_MAP.get(episodeId) ?? episodeId,
      );
      return list.join('; ');
    }

    return isFamilyFlow
      ? 'Acompanhamento familiar registrado no sistema da escola.'
      : 'Ocorrência disciplinar registrada no sistema da escola.';
  }

  private getSchoolMeasure(
    incident: Incident,
    actionLevel: ActionLevel,
    isPerformanceConvocation: boolean,
  ): string {
    const latestFollowUp = this.getLatestFollowUp(incident.followUps);
    const isFamilyFlow = isFamilyIncident(incident);

    if (isFamilyFlow) {
      if (latestFollowUp?.providencias?.trim()) return latestFollowUp.providencias.trim();
      if (incident.actions?.trim()) return incident.actions.trim();
      if (incident.suggestedAction?.trim()) return incident.suggestedAction.trim();
      return 'Plano de acompanhamento pedagógico e socioemocional construído com responsáveis e equipe escolar.';
    }

    if (isPerformanceConvocation) {
      const followUpMeasure = latestFollowUp?.providencias?.trim();
      if (followUpMeasure && !this.hasSuspensionLanguage(followUpMeasure)) {
        return followUpMeasure;
      }

      const incidentMeasure = incident.actions?.trim();
      if (incidentMeasure && !this.hasSuspensionLanguage(incidentMeasure)) {
        return incidentMeasure;
      }

      const suggestedMeasure = incident.suggestedAction?.trim();
      if (suggestedMeasure && !this.hasSuspensionLanguage(suggestedMeasure)) {
        return suggestedMeasure;
      }

      return 'Convocação dos responsáveis para comparecimento à escola e alinhamentos pedagógicos sobre o rendimento bimestral do estudante.';
    }

    if (latestFollowUp?.providencias?.trim()) return latestFollowUp.providencias.trim();
    if (incident.actions?.trim()) return incident.actions.trim();
    if (incident.suggestedAction?.trim()) return incident.suggestedAction.trim();
    return ACTION_LEVEL_SHORT_TEXT[actionLevel];
  }

  private getFamilyMessage(
    incident: Incident,
    actionLevel: ActionLevel,
    isPerformanceConvocation: boolean,
  ): string {
    if (isFamilyIncident(incident)) {
      return 'Solicitamos o comparecimento dos responsáveis para alinhamento de estratégias de apoio pedagógico e emocional ao estudante.';
    }

    if (isPerformanceConvocation) {
      return 'Solicitamos o comparecimento do responsável legal na escola para alinhamentos pedagógicos e acompanhamento do rendimento bimestral.';
    }

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
      formatBrasiliaDate(incident.date),
      col1,
      startY + 9,
      this.colWidth(6) - 8,
    );
    this.renderField(
      isFamilyIncident(incident) ? 'Nível de atenção' : 'Gravidade',
      isFamilyIncident(incident)
        ? (FAMILY_ATTENTION_LABELS[incident.finalSeverity] || incident.finalSeverity)
        : (SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity),
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
    const isFamilyFlow = isFamilyIncident(incident);
    const isPerformanceConvocation =
      !isFamilyFlow && isPerformanceConvocationIncident(incident);
    const incidentSchoolYear = getBrasiliaYear(incident.date);
    const historicalIncidents = allIncidents.filter((item) => item.id !== incident.id);
    const actionLevel = isFamilyFlow
      ? 'conversa_registro'
      : isPerformanceConvocation
      ? 'comunicado_pais'
      : getRequiredActionLevel(
          targetStudentIds,
          incident.finalSeverity,
          historicalIncidents,
          Number.isFinite(incidentSchoolYear) ? incidentSchoolYear : undefined,
        );

    this.setFont('md', 'bold', '#000000');
    this.drawText(
      isFamilyFlow
        ? 'Comunicado de Acompanhamento Familiar'
        : 'Notificação aos Responsáveis',
      this.margin,
      this.y,
    );
    this.y += 6;

    this.setFont('2xs', 'normal', '#666666');
    this.drawText(
      `Protocolo: ${incident.id.substring(0, 8).toUpperCase()}  |  Emissão: ${formatBrasiliaDate(new Date())}`,
      this.margin,
      this.y,
    );
    this.y += 8;

    this.renderIdentification(targetStudent, incidentClass, incident);

    this.renderSectionTitle('Comunicado');
    const intro = isFamilyFlow
      ? `Informamos que o(a) estudante ${targetStudent?.name || 'identificado(a) neste registro'} está em acompanhamento familiar de caráter pedagógico e socioemocional.`
      : `Informamos que o(a) estudante ${targetStudent?.name || 'identificado(a) neste registro'} esteve envolvido(a) em ocorrência disciplinar registrada pela escola.`;
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

    this.renderSectionTitle(
      isFamilyFlow ? 'Plano adotado pela escola' : 'Medida adotada pela escola',
    );
    const measureLines = this.pdf.splitTextToSize(
      this.getSchoolMeasure(incident, actionLevel, isPerformanceConvocation),
      this.contentWidth - 2,
    );
    this.setFont('xs', 'normal', '#000000');
    this.drawText(measureLines, this.margin + 1, this.y + 3);
    this.y += Math.max(6, measureLines.length * 4) + 3;

    this.renderSectionTitle('Encaminhamento aos responsáveis');
    const familyLines = this.pdf.splitTextToSize(
      this.getFamilyMessage(incident, actionLevel, isPerformanceConvocation),
      this.contentWidth - 2
    );
    this.setFont('xs', 'normal', '#000000');
    this.drawText(familyLines, this.margin + 1, this.y + 3);
    this.y += Math.max(6, familyLines.length * 4) + 3;

    this.renderSignatures(
      targetStudent?.name,
      this.getResponsibleName(incident, incidentClass),
    );

    const fileName = getNotificationPdfFileName(incident, targetStudent);
    const blob = this.outputBlob();
    return { blob, fileName };
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
    const zip = new JSZip();
    for (const student of scopedStudents) {
      const generator = new IncidentParentNotificationPDF();
      const { blob, fileName } = await generator.generate(
        incident,
        incidentClass,
        scopedStudents,
        allIncidents,
        student,
      );
      zip.file(fileName, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, getNotificationZipFileName(incident));
    return;
  }

  const generator = new IncidentParentNotificationPDF();
  const { blob, fileName } = await generator.generate(
    incident,
    incidentClass,
    scopedStudents,
    allIncidents,
  );
  downloadBlob(blob, fileName);
}
