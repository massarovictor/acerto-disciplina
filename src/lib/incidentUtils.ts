import { IncidentSeverity, IncidentStatus } from "@/types";

export const getSeverityColor = (severity: IncidentSeverity | string) => {
    switch (severity) {
        case 'leve': return 'bg-info/15 text-info dark:bg-info/20 dark:text-info border-info/30 dark:border-info/40';
        case 'intermediaria': return 'bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning border-warning/30 dark:border-warning/40';
        case 'grave': return 'bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning border-warning/30 dark:border-warning/40';
        case 'gravissima': return 'bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-destructive border-destructive/30 dark:border-destructive/40';
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
        case 'leve': return 'bg-info';
        case 'intermediaria': return 'bg-warning';
        case 'grave': return 'bg-warning';
        case 'gravissima': return 'bg-destructive';
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
