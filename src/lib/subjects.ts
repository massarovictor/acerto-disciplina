// Subject configuration by knowledge area (following ENEM structure)

export interface SubjectArea {
  name: string;
  subjects: string[];
  color: string;
}

// Áreas de conhecimento conforme ENEM
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

export const QUARTERS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

// Obter todas as disciplinas das áreas de conhecimento (base comum ENEM)
export const getAllSubjects = (): string[] => {
  return SUBJECT_AREAS.flatMap(area => area.subjects);
};

// Obter área de conhecimento de uma disciplina
export const getSubjectArea = (subject: string): SubjectArea | undefined => {
  return SUBJECT_AREAS.find(area => area.subjects.includes(subject));
};
