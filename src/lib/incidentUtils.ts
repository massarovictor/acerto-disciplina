import { IncidentSeverity, IncidentStatus } from "@/types";

export const getSeverityColor = (severity: IncidentSeverity | string) => {
    switch (severity) {
        case 'leve': return 'bg-severity-light/15 text-severity-light dark:bg-severity-light/20 dark:text-severity-light border-severity-light/30 dark:border-severity-light/40';
        case 'intermediaria': return 'bg-severity-intermediate/15 text-severity-intermediate dark:bg-severity-intermediate/20 dark:text-severity-intermediate border-severity-intermediate/30 dark:border-severity-intermediate/40';
        case 'grave': return 'bg-severity-serious/15 text-severity-serious dark:bg-severity-serious/20 dark:text-severity-serious border-severity-serious/30 dark:border-severity-serious/40';
        case 'gravissima': return 'bg-severity-critical/15 text-severity-critical dark:bg-severity-critical/20 dark:text-severity-critical border-severity-critical/30 dark:border-severity-critical/40';
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
        case 'leve': return 'bg-severity-light';
        case 'intermediaria': return 'bg-severity-intermediate';
        case 'grave': return 'bg-severity-serious';
        case 'gravissima': return 'bg-severity-critical';
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
