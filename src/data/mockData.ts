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
    email: 'professor2@escola.com',
    name: 'Pedro Costa',
    role: 'professor',
  },
  {
    id: '4',
    email: 'professor3@escola.com',
    name: 'Ana Oliveira',
    role: 'professor',
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
  { id: 'leve-1', description: 'Chegar à escola sem fardamento completo', severity: 'leve', category: 'Uniforme' },
  { id: 'leve-2', description: 'Atraso na chegada sem justificativa', severity: 'leve', category: 'Pontualidade' },
  { id: 'leve-3', description: 'Usar toalha fora do banheiro/vestiário', severity: 'leve', category: 'Conduta' },
  { id: 'leve-4', description: 'Usar casaco fora de sala de aula', severity: 'leve', category: 'Uniforme' },
  { id: 'leve-5', description: 'Esquecimento do material', severity: 'leve', category: 'Material' },
  { id: 'leve-6', description: 'Não esperar o professor sentado', severity: 'leve', category: 'Disciplina' },
  { id: 'leve-7', description: 'Não realizar atividade ou recusar-se a participar', severity: 'leve', category: 'Acadêmico' },
  { id: 'leve-8', description: 'Levar garrafas do colega para encher', severity: 'leve', category: 'Conduta' },

  // Intermediárias
  { id: 'inter-1', description: 'Atraso para chegar na sala (estando na escola)', severity: 'intermediaria', category: 'Pontualidade' },
  { id: 'inter-2', description: 'Buscar material no armário em horário de aula', severity: 'intermediaria', category: 'Disciplina' },
  { id: 'inter-3', description: 'Dormir em sala', severity: 'intermediaria', category: 'Conduta' },
  { id: 'inter-4', description: 'Comer em sala', severity: 'intermediaria', category: 'Conduta' },
  { id: 'inter-5', description: 'Riscar carteiras/cadeiras/mobiliário', severity: 'intermediaria', category: 'Patrimônio' },
  { id: 'inter-6', description: 'Estar fora do mapeamento (lugar marcado)', severity: 'intermediaria', category: 'Disciplina' },
  { id: 'inter-7', description: 'Baixar a cabeça durante a aula', severity: 'intermediaria', category: 'Conduta' },
  { id: 'inter-8', description: 'Usar materiais alheios à sala de aula', severity: 'intermediaria', category: 'Disciplina' },

  // Graves
  { id: 'grave-1', description: 'Colar/pescar em atividades avaliativas', severity: 'grave', category: 'Honestidade' },
  { id: 'grave-2', description: 'Portar/usar celular ou eletrônicos', severity: 'grave', category: 'Disciplina' },
  { id: 'grave-3', description: 'Ser encaminhado para ocorrência e não ir', severity: 'grave', category: 'Desobediência' },
  { id: 'grave-4', description: 'Gazear aula', severity: 'grave', category: 'Frequência' },

  // Gravíssimas
  { id: 'gravissima-1', description: 'Namorar na escola', severity: 'gravissima', category: 'Conduta' },
  { id: 'gravissima-2', description: 'Desacatar qualquer pessoa na escola', severity: 'gravissima', category: 'Respeito' },
  { id: 'gravissima-3', description: 'Beber ou fumar na escola', severity: 'gravissima', category: 'Proibidos' },
  { id: 'gravissima-4', description: 'Falar palavrão', severity: 'gravissima', category: 'Linguagem' },
  { id: 'gravissima-5', description: 'Dano ao patrimônio público escolar', severity: 'gravissima', category: 'Patrimônio' },
];
