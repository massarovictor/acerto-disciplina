const COURSE_CODE_MAP: Record<string, string> = {
  'redes de computadores': 'RDC',
  'desenvolvimento de sistemas': 'DS',
  'administracao financas': 'ADF',
  'administracao e financas': 'ADF',
  'administracao de financas': 'ADF',
  'administracao financeira': 'ADF',
  'comercio': 'COM',
  'agronegocio': 'AGR',
  'fruticultura': 'FRU',
};

const normalizeCourseName = (course: string): string =>
  course
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const getCourseCode = (course?: string): string | undefined => {
  if (!course) return undefined;
  const normalized = normalizeCourseName(course);
  return COURSE_CODE_MAP[normalized];
};

type BuildClassNumberInput = {
  course?: string;
  startYearDate?: string;
  startYear?: number;
};

export const buildClassNumber = ({
  course,
  startYearDate,
  startYear,
}: BuildClassNumberInput): string | null => {
  if (!course || !startYearDate) return null;

  const startDate = new Date(startYearDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const courseCode = getCourseCode(course);
  if (!courseCode) return null;

  const startYearNumber = typeof startYear === 'number' ? startYear : 1;
  if (startYearNumber < 1 || startYearNumber > 3) return null;

  const startYearValue = startDate.getFullYear();
  const endYearValue = startYearValue + (3 - startYearNumber);

  return `${startYearValue}-${endYearValue}-${courseCode}`;
};
