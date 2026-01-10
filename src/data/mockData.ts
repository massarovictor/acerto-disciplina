import { User, Class, Student, IncidentEpisode } from '@/types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'professor@escola.com',
    name: 'João Silva',
    role: 'professor',
  },
  {
    id: '2',
    email: 'diretor@escola.com',
    name: 'Maria Santos',
    role: 'diretor',
  },
  {
    id: '3',
    email: 'coordenador@escola.com',
    name: 'Pedro Costa',
    role: 'coordenador',
  },
  {
    id: '4',
    email: 'secretaria@escola.com',
    name: 'Ana Oliveira',
    role: 'secretaria',
  },
  {
    id: '5',
    email: 'diretor2@escola.com',
    name: 'Carlos Mendes',
    role: 'diretor',
  },
];

export const MOCK_COURSES = [
  'Ensino Médio Regular',
  'Técnico em Informática',
  'Técnico em Administração',
  'Técnico em Enfermagem',
  'Técnico em Mecânica',
  'Técnico em Eletrônica',
];

export const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    name: '1º A - Informática',
    series: '1º',
    letter: 'A',
    course: 'Técnico em Informática',
    directorId: '2',
    active: true,
  },
  {
    id: '2',
    name: '1º B - Administração',
    series: '1º',
    letter: 'B',
    course: 'Técnico em Administração',
    directorId: '2',
    active: true,
  },
  {
    id: '3',
    name: '2º A - Informática',
    series: '2º',
    letter: 'A',
    course: 'Técnico em Informática',
    directorId: '5',
    active: true,
  },
  {
    id: '4',
    name: '3º A - Ensino Médio',
    series: '3º',
    letter: 'A',
    course: 'Ensino Médio Regular',
    active: true,
  },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: '1',
    name: 'Ana Clara Silva',
    classId: '1',
    birthDate: '2009-05-15',
    gender: 'F',
    enrollment: '2024001',
    censusId: 'C001',
    cpf: '123.456.789-01',
    status: 'active',
  },
  {
    id: '2',
    name: 'Bruno Santos',
    classId: '1',
    birthDate: '2009-08-22',
    gender: 'M',
    enrollment: '2024002',
    censusId: 'C002',
    cpf: '123.456.789-02',
    status: 'active',
  },
  {
    id: '3',
    name: 'Carla Oliveira',
    classId: '1',
    birthDate: '2009-03-10',
    gender: 'F',
    enrollment: '2024003',
    censusId: 'C003',
    cpf: '123.456.789-03',
    status: 'active',
  },
  {
    id: '4',
    name: 'Daniel Costa',
    classId: '2',
    birthDate: '2009-11-30',
    gender: 'M',
    enrollment: '2024004',
    censusId: 'C004',
    cpf: '123.456.789-04',
    status: 'active',
  },
  {
    id: '5',
    name: 'Eduardo Lima',
    classId: '2',
    birthDate: '2009-07-18',
    gender: 'M',
    enrollment: '2024005',
    censusId: 'C005',
    cpf: '123.456.789-05',
    status: 'active',
  },
  {
    id: '6',
    name: 'Fernanda Alves',
    classId: '3',
    birthDate: '2008-04-25',
    gender: 'F',
    enrollment: '2024006',
    censusId: 'C006',
    cpf: '123.456.789-06',
    status: 'active',
  },
  {
    id: '7',
    name: 'Gabriel Souza',
    classId: '3',
    birthDate: '2008-09-12',
    gender: 'M',
    enrollment: '2024007',
    censusId: 'C007',
    cpf: '123.456.789-07',
    status: 'active',
  },
];

export const INCIDENT_EPISODES: IncidentEpisode[] = [
  // Leves
  { id: 'leve-1', description: 'Conversa paralela durante aula', severity: 'leve', category: 'Disciplina' },
  { id: 'leve-2', description: 'Atraso para aula', severity: 'leve', category: 'Pontualidade' },
  { id: 'leve-3', description: 'Esquecimento de material escolar', severity: 'leve', category: 'Material' },
  { id: 'leve-4', description: 'Não realização de tarefa', severity: 'leve', category: 'Acadêmico' },
  { id: 'leve-5', description: 'Uniforme incompleto', severity: 'leve', category: 'Uniforme' },

  // Intermediárias
  { id: 'inter-1', description: 'Desrespeito a colegas', severity: 'intermediaria', category: 'Disciplina' },
  { id: 'inter-2', description: 'Uso de celular durante aula', severity: 'intermediaria', category: 'Disciplina' },
  { id: 'inter-3', description: 'Recusa em participar das atividades', severity: 'intermediaria', category: 'Acadêmico' },
  { id: 'inter-4', description: 'Linguagem inadequada', severity: 'intermediaria', category: 'Disciplina' },
  { id: 'inter-5', description: 'Saída da sala sem autorização', severity: 'intermediaria', category: 'Disciplina' },

  // Graves
  { id: 'grave-1', description: 'Agressão verbal a professor', severity: 'grave', category: 'Disciplina' },
  { id: 'grave-2', description: 'Dano ao patrimônio escolar', severity: 'grave', category: 'Patrimônio' },
  { id: 'grave-3', description: 'Desacato à autoridade', severity: 'grave', category: 'Disciplina' },
  { id: 'grave-4', description: 'Bullying comprovado', severity: 'grave', category: 'Convivência' },
  { id: 'grave-5', description: 'Falsificação de documento', severity: 'grave', category: 'Conduta' },

  // Gravíssimas
  { id: 'gravissima-1', description: 'Agressão física a colega', severity: 'gravissima', category: 'Convivência' },
  { id: 'gravissima-2', description: 'Agressão física a professor/funcionário', severity: 'gravissima', category: 'Disciplina' },
  { id: 'gravissima-3', description: 'Porte de substâncias ilícitas', severity: 'gravissima', category: 'Conduta' },
  { id: 'gravissima-4', description: 'Ameaças graves', severity: 'gravissima', category: 'Convivência' },
  { id: 'gravissima-5', description: 'Porte de arma branca', severity: 'gravissima', category: 'Segurança' },
];
