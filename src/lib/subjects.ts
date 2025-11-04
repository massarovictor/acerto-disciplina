// Subject configuration by knowledge area

export interface SubjectArea {
  name: string;
  subjects: string[];
  color: string;
}

export const SUBJECT_AREAS: SubjectArea[] = [
  {
    name: 'Linguagens',
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
    name: 'Ciências Humanas',
    subjects: [
      'História',
      'Geografia',
      'Filosofia',
      'Sociologia',
    ],
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  },
  {
    name: 'Ciências da Natureza',
    subjects: [
      'Matemática',
      'Física',
      'Química',
      'Biologia',
    ],
    color: 'bg-green-500/10 text-green-700 border-green-500/30',
  },
];

export const QUARTERS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

export const getAllSubjects = (): string[] => {
  return SUBJECT_AREAS.flatMap(area => area.subjects);
};

export const getSubjectArea = (subject: string): SubjectArea | undefined => {
  return SUBJECT_AREAS.find(area => area.subjects.includes(subject));
};
