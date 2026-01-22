// Subject configuration by knowledge area (following ENEM structure)

export interface SubjectArea {
  name: string;
  subjects: string[];
  color: string;
}

// Áreas de conhecimento conforme ENEM (Base Nacional Comum)
export const SUBJECT_AREAS: SubjectArea[] = [
  {
    name: 'Linguagens, Códigos e suas Tecnologias',
    subjects: [
      'Língua Portuguesa',
      'Inglês',
      'Espanhol',
      'Educação Física',
      'Arte',
    ],
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  },
  {
    name: 'Ciências Humanas e suas Tecnologias',
    subjects: [
      'História',
      'Geografia',
      'Filosofia',
      'Sociologia',
    ],
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  },
  {
    name: 'Ciências da Natureza e suas Tecnologias',
    subjects: [
      'Física',
      'Química',
      'Biologia',
    ],
    color: 'bg-green-500/10 text-green-700 border-green-500/30',
  },
  {
    name: 'Matemática e suas Tecnologias',
    subjects: [
      'Matemática',
    ],
    color: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  },
];

// Área de Formação Técnica e Profissional (disciplinas definidas por template)
export const PROFESSIONAL_AREA: SubjectArea = {
  name: 'Formação Técnica e Profissional',
  subjects: [], // Preenchido dinamicamente via template
  color: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};

export const QUARTERS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

// Obter todas as disciplinas das áreas de conhecimento (base comum ENEM)
export const getAllSubjects = (): string[] => {
  return SUBJECT_AREAS.flatMap(area => area.subjects);
};

// Obter área de conhecimento de uma disciplina (incluindo profissionais se fornecidas)
export const getSubjectArea = (subject: string, professionalSubjects: string[] = []): SubjectArea | undefined => {
  // Primeiro verifica nas áreas base
  const baseArea = SUBJECT_AREAS.find(area => area.subjects.includes(subject));
  if (baseArea) return baseArea;

  // Se não encontrou, verifica se é disciplina profissional
  if (professionalSubjects.includes(subject)) {
    return { ...PROFESSIONAL_AREA, subjects: professionalSubjects };
  }

  return undefined;
};

// Obter todas as áreas incluindo a profissional (se houver disciplinas)
export const getAllAreas = (professionalSubjects: string[] = []): SubjectArea[] => {
  const areas = [...SUBJECT_AREAS];

  if (professionalSubjects.length > 0) {
    areas.push({
      ...PROFESSIONAL_AREA,
      subjects: professionalSubjects
    });
  }

  return areas;
};

// ============ EQUIVALÊNCIA DE DISCIPLINAS (Fundamental ↔ Médio) ============
// Mapeia disciplinas do fundamental para suas equivalentes no médio
export const SUBJECT_EQUIVALENCE: Record<string, string[]> = {
  // Ciências no fundamental equivale a Física, Química e Biologia no médio
  'Ciências': ['Física', 'Química', 'Biologia'],
  // Língua Inglesa no fundamental equivale a Inglês no médio
  'Língua Inglesa': ['Inglês'],
  // Disciplinas que são iguais (mapeamento direto)
  'Língua Portuguesa': ['Língua Portuguesa'],
  'Matemática': ['Matemática'],
  'História': ['História'],
  'Geografia': ['Geografia'],
  'Arte': ['Arte'],
  'Educação Física': ['Educação Física'],
};

// Mapeamento reverso: do médio para o fundamental
export const SUBJECT_EQUIVALENCE_REVERSE: Record<string, string> = {
  'Física': 'Ciências',
  'Química': 'Ciências',
  'Biologia': 'Ciências',
  'Inglês': 'Língua Inglesa',
};

// Função para obter disciplinas equivalentes (fundamental → médio)
export const getEquivalentSubjects = (fundamentalSubject: string): string[] => {
  return SUBJECT_EQUIVALENCE[fundamentalSubject] || [fundamentalSubject];
};

// Função para obter disciplina do fundamental (médio → fundamental)
export const getFundamentalEquivalent = (medioSubject: string): string => {
  return SUBJECT_EQUIVALENCE_REVERSE[medioSubject] || medioSubject;
};

// ============ ÁREAS DO ENSINO FUNDAMENTAL ============
export const FUNDAMENTAL_SUBJECT_AREAS: SubjectArea[] = [
  {
    name: 'Linguagens',
    subjects: ['Língua Portuguesa', 'Língua Inglesa', 'Arte', 'Educação Física'],
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  },
  {
    name: 'Ciências Humanas',
    subjects: ['História', 'Geografia'],
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  },
  {
    name: 'Ciências da Natureza',
    subjects: ['Ciências'],
    color: 'bg-green-500/10 text-green-700 border-green-500/30',
  },
  {
    name: 'Matemática',
    subjects: ['Matemática'],
    color: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  },
];

// Nomes curtos para as áreas (para uso em tabelas e gráficos)
export const AREA_SHORT_NAMES: Record<string, string> = {
  'Linguagens, Códigos e suas Tecnologias': 'Linguagens',
  'Ciências Humanas e suas Tecnologias': 'Humanas',
  'Ciências da Natureza e suas Tecnologias': 'Natureza',
  'Matemática e suas Tecnologias': 'Matemática',
  'Formação Técnica e Profissional': 'Profissional',
};

// Obter nome curto de uma área
export const getAreaShortName = (areaName: string): string => {
  return AREA_SHORT_NAMES[areaName] || areaName;
};
