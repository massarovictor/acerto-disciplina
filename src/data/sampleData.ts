import { AttendanceRecord, Class, Grade, Incident, Student } from '@/types';
import { INCIDENT_EPISODES } from './mockData';

const SUBJECTS = [
  'Língua Portuguesa',
  'Matemática',
  'História',
  'Geografia',
  'Biologia',
  'Química',
  'Física',
  'Inglês',
];

const QUARTERS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

const FIRST_NAMES = [
  'Ana',
  'Bruno',
  'Carlos',
  'Daniela',
  'Eduardo',
  'Fernanda',
  'Gabriel',
  'Helena',
  'Isabela',
  'João',
  'Larissa',
  'Marcos',
  'Natália',
  'Otávio',
  'Patrícia',
  'Rafael',
  'Sofia',
  'Tiago',
  'Valentina',
  'Yuri',
];

const LAST_NAMES = [
  'Almeida',
  'Barbosa',
  'Carvalho',
  'Dias',
  'Esteves',
  'Ferraz',
  'Gomes',
  'Hernandes',
  'Ibrahim',
  'Jesus',
  'Klein',
  'Lima',
  'Mendes',
  'Novaes',
  'Oliveira',
  'Pereira',
  'Queiroz',
  'Ramos',
  'Silva',
  'Teixeira',
  'Uchoa',
  'Vieira',
];

const CLASS_BASE = [
  { id: 'c-1', name: '1º A - Informática', series: '1º', course: 'Técnico em Informática' },
  { id: 'c-2', name: '2º B - Administração', series: '2º', course: 'Técnico em Administração' },
  { id: 'c-3', name: '3º C - Enfermagem', series: '3º', course: 'Técnico em Enfermagem' },
  { id: 'c-4', name: '1º D - Ensino Médio', series: '1º', course: 'Ensino Médio Regular' },
];

const randomBetween = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface SampleData {
  classes: Class[];
  students: Student[];
  grades: Grade[];
  attendance: AttendanceRecord[];
  incidents: Incident[];
}

export const generateSampleData = (): SampleData => {
  const classes: Class[] = CLASS_BASE.map((cls, index) => ({
    ...cls,
    classNumber: `TURMA-${String(index + 1).padStart(3, '0')}`,
    directorId: '2',
    active: true,
    startYear: cls.series === '1º' ? 1 : cls.series === '2º' ? 2 : 3,
    currentYear: cls.series === '1º' ? 1 : cls.series === '2º' ? 2 : 3,
    startYearDate: '2023-02-05',
  }));

  const students: Student[] = [];
  const grades: Grade[] = [];
  const attendance: AttendanceRecord[] = [];
  const incidents: Incident[] = [];

  classes.forEach((cls, classIndex) => {
    for (let i = 0; i < 40; i++) {
      const first = pickRandom(FIRST_NAMES);
      const last = pickRandom(LAST_NAMES);
      const id = `${cls.id}-stu-${i + 1}`;
      const student: Student = {
        id,
        name: `${first} ${last}`,
        classId: cls.id,
        birthDate: `200${randomBetween(2, 8)}-${String(randomBetween(1, 12)).padStart(2, '0')}-${String(
          randomBetween(1, 28)
        ).padStart(2, '0')}`,
        gender: i % 2 === 0 ? 'M' : 'F',
        enrollment: `${2024 + classIndex}${String(i + 1).padStart(3, '0')}`,
        censusId: `C-${cls.id}-${i + 1}`,
        cpf: undefined,
        rg: undefined,
        status: 'active',
      };
      students.push(student);

      SUBJECTS.forEach((subject) => {
        QUARTERS.forEach((quarter, quarterIndex) => {
          const gradeValue = Math.min(10, Math.max(3, randomBetween(55, 95) / 10));
          grades.push({
            id: `grade-${id}-${subject}-${quarter}`,
            studentId: id,
            classId: cls.id,
            subject,
            quarter,
            grade: parseFloat(gradeValue.toFixed(1)),
            recordedAt: new Date(2024, quarterIndex * 3, randomBetween(1, 28)).toISOString(),
          });
        });
      });

      const attendanceEntries = randomBetween(2, 5);
      for (let j = 0; j < attendanceEntries; j++) {
        const statusPool: AttendanceRecord['status'][] = [
          'presente',
          'falta',
          'falta_justificada',
          'atestado',
        ];
        const status = pickRandom(statusPool);
        const date = new Date(2024, randomBetween(0, 8), randomBetween(1, 25)).toISOString();
        attendance.push({
          id: `att-${id}-${j}`,
          studentId: id,
          classId: cls.id,
          date,
          status,
          recordedBy: 'professor-demo',
          recordedAt: date,
        });
      }
    }

    const incidentsPerClass = 6;
    for (let k = 0; k < incidentsPerClass; k++) {
      const involved = pickRandom(students.filter((s) => s.classId === cls.id));
      const severityOptions: Incident['finalSeverity'][] = ['leve', 'intermediaria', 'grave'];
      const severity = pickRandom(severityOptions);
      const statusOptions: Incident['status'][] = ['aberta', 'acompanhamento', 'resolvida'];
      const status = pickRandom(statusOptions);
      const episode = pickRandom(INCIDENT_EPISODES);
      const created = new Date(2024, randomBetween(0, 9), randomBetween(1, 25)).toISOString();

      incidents.push({
        id: `inc-${cls.id}-${k}`,
        date: created,
        classId: cls.id,
        studentIds: [involved.id],
        episodes: [episode.id],
        calculatedSeverity: severity,
        finalSeverity: severity,
        description: `${episode.description} envolvendo ${involved.name}`,
        actions: undefined,
        suggestedAction: undefined,
        status,
        createdBy: 'system',
        createdAt: created,
        updatedAt: created,
        followUps: [],
        comments: [],
      });
    }
  });

  return {
    classes,
    students,
    grades,
    attendance,
    incidents,
  };
};
