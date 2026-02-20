import { Incident, IncidentSeverity, IncidentType } from "@/types";

export const isDisciplinaryIncident = (
  incident?: Pick<Incident, "incidentType"> | null,
) => (incident?.incidentType ?? "disciplinar") === "disciplinar";

export const isFamilyIncident = (
  incident?: Pick<Incident, "incidentType"> | null,
) => incident?.incidentType === "acompanhamento_familiar";

export const getIncidentTypeLabel = (incidentType?: IncidentType | null) => {
  if (incidentType === "acompanhamento_familiar") {
    return "Acompanhamento Familiar";
  }
  return "Disciplinar";
};

const DISCIPLINARY_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  leve: "Leve",
  intermediaria: "Intermediária",
  grave: "Grave",
  gravissima: "Gravíssima",
};

const FAMILY_ATTENTION_LABELS: Record<IncidentSeverity, string> = {
  leve: "Baixa",
  intermediaria: "Média",
  grave: "Alta",
  gravissima: "Crítica",
};

export const getIncidentSeverityLabel = (
  severity?: IncidentSeverity | null,
  incidentType?: IncidentType | null,
) => {
  if (!severity) return "-";
  if (incidentType === "acompanhamento_familiar") {
    return FAMILY_ATTENTION_LABELS[severity];
  }
  return DISCIPLINARY_SEVERITY_LABELS[severity];
};
