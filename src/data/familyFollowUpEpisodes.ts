import { IncidentEpisode } from "@/types";

export const FAMILY_FOLLOW_UP_EPISODES: IncidentEpisode[] = [
  {
    id: "fam-leve-1",
    description: "Baixo engajamento pontual nas atividades escolares",
    severity: "leve",
    category: "Pedagógico",
  },
  {
    id: "fam-leve-2",
    description: "Oscilação leve de organização de rotina de estudos",
    severity: "leve",
    category: "Pedagógico",
  },
  {
    id: "fam-leve-3",
    description: "Sinais iniciais de dificuldade de integração em sala",
    severity: "leve",
    category: "Socioemocional",
  },
  {
    id: "fam-leve-4",
    description: "Necessidade de aproximação inicial com responsáveis",
    severity: "leve",
    category: "Familiar",
  },
  {
    id: "fam-inter-1",
    description: "Queda recorrente de rendimento em múltiplas disciplinas",
    severity: "intermediaria",
    category: "Pedagógico",
  },
  {
    id: "fam-inter-2",
    description: "Frequência irregular com impacto no processo de aprendizagem",
    severity: "intermediaria",
    category: "Pedagógico",
  },
  {
    id: "fam-inter-3",
    description: "Relatos de ansiedade, tristeza ou desmotivação persistente",
    severity: "intermediaria",
    category: "Socioemocional",
  },
  {
    id: "fam-inter-4",
    description: "Baixa resposta da família às estratégias escolares propostas",
    severity: "intermediaria",
    category: "Familiar",
  },
  {
    id: "fam-grave-1",
    description: "Risco de abandono escolar identificado pela equipe",
    severity: "grave",
    category: "Pedagógico",
  },
  {
    id: "fam-grave-2",
    description: "Comprometimento acentuado da aprendizagem sem adesão ao plano",
    severity: "grave",
    category: "Pedagógico",
  },
  {
    id: "fam-grave-3",
    description: "Sofrimento emocional relevante com impacto no desempenho escolar",
    severity: "grave",
    category: "Socioemocional",
  },
  {
    id: "fam-grave-4",
    description: "Necessidade de articulação imediata com rede de apoio",
    severity: "grave",
    category: "Rede de Proteção",
  },
  {
    id: "fam-crit-1",
    description: "Situação familiar crítica com prejuízo severo ao vínculo escolar",
    severity: "gravissima",
    category: "Familiar",
  },
  {
    id: "fam-crit-2",
    description: "Risco psicossocial elevado exigindo intervenção urgente",
    severity: "gravissima",
    category: "Rede de Proteção",
  },
  {
    id: "fam-crit-3",
    description: "Indícios de vulnerabilidade intensa com necessidade de proteção",
    severity: "gravissima",
    category: "Socioemocional",
  },
];

