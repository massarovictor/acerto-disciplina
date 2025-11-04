// Mock data for the system - initial data for demonstration
import { Class, Student, IncidentEpisode } from '@/types';

export const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    name: '1º A - Informática',
    year: 1,
    type: 'tecnico',
    directorId: '2',
    shift: 'morning',
  },
  {
    id: '2',
    name: '2º A - Administração',
    year: 2,
    type: 'tecnico',
    directorId: '2',
    shift: 'morning',
  },
  {
    id: '3',
    name: '3º A - Ensino Médio',
    year: 3,
    type: 'regular',
    shift: 'afternoon',
  },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: '1',
    name: 'João Silva',
    cpf: '12345678901',
    birthDate: '2009-05-15',
    classId: '1',
    guardianName: 'Maria Silva',
    guardianPhone: '(11) 98765-4321',
    guardianEmail: 'maria.silva@email.com',
    enrollmentDate: '2024-02-01',
    status: 'active',
  },
  {
    id: '2',
    name: 'Maria Santos',
    cpf: '98765432100',
    birthDate: '2008-08-22',
    classId: '2',
    guardianName: 'José Santos',
    guardianPhone: '(11) 98765-4322',
    guardianEmail: 'jose.santos@email.com',
    enrollmentDate: '2023-02-01',
    status: 'active',
  },
  {
    id: '3',
    name: 'Pedro Costa',
    cpf: '45678912300',
    birthDate: '2007-03-10',
    classId: '3',
    guardianName: 'Ana Costa',
    guardianPhone: '(11) 98765-4323',
    guardianEmail: 'ana.costa@email.com',
    enrollmentDate: '2022-02-01',
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
