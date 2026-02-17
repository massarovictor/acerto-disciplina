import { IncidentSeverity, IncidentStatus } from "@/types";
import {
    INCIDENT_SEVERITY_BADGE_CLASS,
    INCIDENT_SEVERITY_DOT_CLASS,
} from "@/lib/statusPalette";

export const getSeverityColor = (severity: IncidentSeverity | string) => {
    switch (severity) {
        case 'leve': return INCIDENT_SEVERITY_BADGE_CLASS.leve;
        case 'intermediaria': return INCIDENT_SEVERITY_BADGE_CLASS.intermediaria;
        case 'grave': return INCIDENT_SEVERITY_BADGE_CLASS.grave;
        case 'gravissima': return INCIDENT_SEVERITY_BADGE_CLASS.gravissima;
        default: return 'bg-muted text-muted-foreground';
    }
};

export const getSeverityLabel = (severity: IncidentSeverity | string) => {
    switch (severity) {
        case 'leve': return 'Leve';
        case 'intermediaria': return 'Intermediária';
        case 'grave': return 'Grave';
        case 'gravissima': return 'Gravíssima';
        default: return severity;
    }
};

export const getUrgencyDot = (severity: IncidentSeverity | string) => {
    switch (severity) {
        case 'leve': return INCIDENT_SEVERITY_DOT_CLASS.leve;
        case 'intermediaria': return INCIDENT_SEVERITY_DOT_CLASS.intermediaria;
        case 'grave': return INCIDENT_SEVERITY_DOT_CLASS.grave;
        case 'gravissima': return INCIDENT_SEVERITY_DOT_CLASS.gravissima;
        default: return 'bg-muted';
    }
};

export const getStatusColor = (status: IncidentStatus | string) => {
    switch (status) {
        case 'aberta': return 'bg-status-open/10 text-status-open border-status-open';
        case 'acompanhamento': return 'bg-status-analysis/10 text-status-analysis border-status-analysis';
        case 'resolvida': return 'bg-status-resolved/10 text-status-resolved border-status-resolved';
        default: return '';
    }
};

export const getStatusLabel = (status: IncidentStatus | string) => {
    switch (status) {
        case 'aberta': return 'Aberta';
        case 'acompanhamento': return 'Em Acompanhamento';
        case 'resolvida': return 'Resolvida';
        default: return status;
    }
};
