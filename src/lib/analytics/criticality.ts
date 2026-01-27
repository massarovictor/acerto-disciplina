export type CriticalityLevel = 'MUITO CRITICO' | 'CRITICO' | 'INTERMEDIARIO' | 'ADEQUADO';

export interface CriticalityBucket {
    level: CriticalityLevel;
    label: string;
    min: number; // Inclusive
    max: number; // Exclusive (except for 10)
    color: string;
    bg: string;
    description: string;
}

export const CRITICALITY_BUCKETS: CriticalityBucket[] = [
    {
        level: 'MUITO CRITICO',
        label: 'Muito Crítico',
        min: 0,
        max: 2.5,
        color: 'text-red-800',
        bg: 'bg-red-100',
        description: 'Desempenho extremamente baixo (0 - 2.5)'
    },
    {
        level: 'CRITICO',
        label: 'Crítico',
        min: 2.5,
        max: 5.0,
        color: 'text-red-600',
        bg: 'bg-red-50',
        description: 'Desempenho insuficiente (2.5 - 5.0)'
    },
    {
        level: 'INTERMEDIARIO',
        label: 'Intermediário',
        min: 5.0,
        max: 7.5,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        description: 'Desempenho mediano (5.0 - 7.5)'
    },
    {
        level: 'ADEQUADO',
        label: 'Adequado',
        min: 7.5,
        max: 10.1, // To include 10
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        description: 'Desempenho satisfatório (7.5 - 10)'
    }
];

export const getCriticalityLevel = (grade: number): CriticalityLevel => {
    // Handle edge cases
    if (grade < 0) return 'MUITO CRITICO';
    if (grade > 10) return 'ADEQUADO';
    if (isNaN(grade)) return 'MUITO CRITICO';

    if (grade < 2.5) return 'MUITO CRITICO';
    if (grade < 5.0) return 'CRITICO';
    if (grade < 7.5) return 'INTERMEDIARIO';
    return 'ADEQUADO';
};

export const getCriticalityBucket = (level: CriticalityLevel): CriticalityBucket => {
    return CRITICALITY_BUCKETS.find(b => b.level === level) || CRITICALITY_BUCKETS[0];
};
