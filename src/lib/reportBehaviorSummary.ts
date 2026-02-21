import { Incident, IncidentSeverity, IncidentStatus } from "@/types";
import {
  getIncidentSeverityLabel,
  getIncidentTypeLabel,
  isFamilyIncident,
} from "@/lib/incidentType";
import { formatBrasiliaDate } from "@/lib/brasiliaDate";

const STATUS_LABELS: Record<IncidentStatus, string> = {
  aberta: "Aberta",
  acompanhamento: "Em acompanhamento",
  resolvida: "Resolvida",
};

const SEVERITY_ORDER: IncidentSeverity[] = ["leve", "intermediaria", "grave", "gravissima"];

const normalizeDescription = (description?: string, maxLength = 180) => {
  const normalized = (description || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Descrição não informada.";
  }

  if (normalized.length <= maxLength) {
    return normalized.endsWith(".") ? normalized : `${normalized}.`;
  }

  const truncated = normalized.slice(0, maxLength).trim();
  return `${truncated}...`;
};

const getIncidentTimestamp = (incident: Incident) => {
  const reference = incident.date || incident.createdAt || incident.updatedAt;
  const parsed = new Date(reference);
  const timestamp = parsed.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export interface BehaviorSummaryEntry {
  incidentId: string;
  incidentType: "disciplinar" | "acompanhamento_familiar";
  incidentTypeLabel: string;
  severity: IncidentSeverity;
  severityLabel: string;
  status: IncidentStatus;
  statusLabel: string;
  dateLabel: string;
  cause: string;
  line: string;
}

export interface BehaviorTotals {
  total: number;
  byType: {
    disciplinar: number;
    acompanhamento_familiar: number;
  };
  bySeverity: Record<IncidentSeverity, number>;
  byStatus: Record<IncidentStatus, number>;
}

export interface ClassBehaviorEntriesByStudent {
  studentId: string;
  entries: BehaviorSummaryEntry[];
  totals: BehaviorTotals;
}

export const buildBehaviorTotals = (incidents: Incident[]): BehaviorTotals => {
  const totals: BehaviorTotals = {
    total: 0,
    byType: {
      disciplinar: 0,
      acompanhamento_familiar: 0,
    },
    bySeverity: {
      leve: 0,
      intermediaria: 0,
      grave: 0,
      gravissima: 0,
    },
    byStatus: {
      aberta: 0,
      acompanhamento: 0,
      resolvida: 0,
    },
  };

  incidents.forEach((incident) => {
    totals.total += 1;
    if (isFamilyIncident(incident)) {
      totals.byType.acompanhamento_familiar += 1;
    } else {
      totals.byType.disciplinar += 1;
    }

    totals.bySeverity[incident.finalSeverity] += 1;
    totals.byStatus[incident.status] += 1;
  });

  return totals;
};

export const buildIndividualBehaviorEntries = (
  incidents: Incident[],
  options?: { maxCauseLength?: number; includeStatusInLine?: boolean },
): BehaviorSummaryEntry[] => {
  const maxCauseLength = options?.maxCauseLength ?? 180;
  const includeStatusInLine = options?.includeStatusInLine ?? false;

  return [...incidents]
    .sort((a, b) => getIncidentTimestamp(b) - getIncidentTimestamp(a))
    .map((incident) => {
      const incidentTypeLabel = getIncidentTypeLabel(incident.incidentType);
      const severityLabel = getIncidentSeverityLabel(
        incident.finalSeverity,
        incident.incidentType,
      );
      const statusLabel = STATUS_LABELS[incident.status];
      const cause = normalizeDescription(incident.description, maxCauseLength);
      const dateLabel = formatBrasiliaDate(incident.date || incident.createdAt, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const baseLine = `${dateLabel} • ${incidentTypeLabel} • ${severityLabel} • ${cause}`;
      const line = includeStatusInLine ? `${baseLine} (${statusLabel})` : baseLine;

      return {
        incidentId: incident.id,
        incidentType: isFamilyIncident(incident)
          ? "acompanhamento_familiar"
          : "disciplinar",
        incidentTypeLabel,
        severity: incident.finalSeverity,
        severityLabel,
        status: incident.status,
        statusLabel,
        dateLabel,
        cause,
        line,
      };
    });
};

export const buildClassBehaviorEntriesByStudent = (
  incidents: Incident[],
  studentIds: string[],
  options?: { maxCauseLength?: number; includeStatusInLine?: boolean },
): ClassBehaviorEntriesByStudent[] => {
  const byStudent = new Map<string, Incident[]>();

  studentIds.forEach((studentId) => {
    byStudent.set(studentId, []);
  });

  incidents.forEach((incident) => {
    incident.studentIds.forEach((studentId) => {
      if (!byStudent.has(studentId)) return;
      byStudent.get(studentId)?.push(incident);
    });
  });

  return studentIds.map((studentId) => {
    const studentIncidents = byStudent.get(studentId) || [];
    return {
      studentId,
      entries: buildIndividualBehaviorEntries(studentIncidents, options),
      totals: buildBehaviorTotals(studentIncidents),
    };
  });
};

export const formatSeverityTotals = (totals: BehaviorTotals) =>
  SEVERITY_ORDER.map((severity) => `${getIncidentSeverityLabel(severity)}: ${totals.bySeverity[severity]}`)
    .join(" • ");

export const formatStatusTotals = (totals: BehaviorTotals) =>
  (Object.keys(totals.byStatus) as IncidentStatus[])
    .map((status) => `${STATUS_LABELS[status]}: ${totals.byStatus[status]}`)
    .join(" • ");
