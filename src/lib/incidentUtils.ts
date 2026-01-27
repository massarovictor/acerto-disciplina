import { IncidentSeverity, IncidentStatus } from "@/types";

export const getSeverityColor = (severity: IncidentSeverity | string) => {
    switch (severity) {
        case 'leve': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        case 'intermediaria': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        case 'grave': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
        case 'gravissima': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
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
        case 'leve': return 'bg-blue-500';
        case 'intermediaria': return 'bg-amber-500';
        case 'grave': return 'bg-orange-500';
        case 'gravissima': return 'bg-red-500';
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
