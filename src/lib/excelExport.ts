import * as XLSX from 'xlsx';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { Student, Class, Grade, Incident } from '@/types';
import { getPdfMake, PDF_COLORS, PDF_STYLES } from './pdfGenerator';

// Modelo de planilha para importação de alunos
export const generateStudentTemplate = (selectedClass?: Class) => {
  const workbook = XLSX.utils.book_new();
  
  // Cabeçalhos das colunas
  const headers = [
    'Nome Completo',
    'Nome da Turma',
    'Data de Nascimento',
    'Sexo',
    'Matrícula SIGE',
    'ID Censo',
    'CPF',
    'RG'
  ];

  // Linha de exemplo - usar nome da turma selecionada se disponível
  const exampleRow = [
    'João Silva Santos',
    selectedClass?.name || '2024-2026 Informática A',
    '15/05/2009',
    'M',
    '2024001',
    'C001',
    '123.456.789-01',
    '12.345.678-9'
  ];

  // Instruções
  const instructions = [
    ['INSTRUÇÕES PARA PREENCHIMENTO:'],
    [''],
    ['1. Nome Completo: Obrigatório - Nome completo do aluno'],
    selectedClass 
      ? [`2. Nome da Turma: PRÉ-PREENCHIDO - ${selectedClass.name} (não altere este campo)`]
      : ['2. Nome da Turma: Obrigatório - Nome da turma (ex: 2024-2026 Informática A)'],
    ['3. Data de Nascimento: Obrigatório - Formato DD/MM/AAAA ou AAAA-MM-DD'],
    ['4. Sexo: Obrigatório - Use M (Masculino), F (Feminino), O (Outro) ou N (Prefiro não informar)'],
    ['5. Matrícula SIGE: Opcional - Número de matrícula no sistema SIGE'],
    ['6. ID Censo: Opcional - Identificador do Censo Escolar'],
    ['7. CPF: Opcional - CPF do aluno (com ou sem formatação)'],
    ['8. RG: Opcional - RG do aluno'],
    [''],
    ['IMPORTANTE:'],
    ['- Não altere os nomes das colunas'],
    ['- Preencha todos os campos obrigatórios'],
    selectedClass 
      ? ['- O nome da turma já está pré-selecionado - não altere este campo']
      : ['- Use o nome da turma exatamente como está no sistema'],
    ['- Verifique se o CPF não está duplicado'],
    [''],
  ];

  // Criar planilha com dados
  const data = [headers, exampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Criar planilha de instruções
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);

  // Definir largura das colunas
  worksheet['!cols'] = [
    { wch: 25 }, // Nome
    { wch: 32 }, // Nome da Turma
    { wch: 18 }, // Data
    { wch: 8 },  // Sexo
    { wch: 15 }, // Matrícula
    { wch: 12 }, // ID Censo
    { wch: 15 }, // CPF
    { wch: 15 }, // RG
  ];

  // Adicionar planilhas ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instruções');

  // Gerar arquivo
  XLSX.writeFile(workbook, 'Modelo_Importacao_Alunos.xlsx');
};

// Exportar lista de alunos
export const exportStudentsList = (students: Student[], classes: Class[]) => {
  const workbook = XLSX.utils.book_new();

  // Cabeçalhos
  const headers = [
    'Nome Completo',
    'Turma',
    'Data de Nascimento',
    'Idade',
    'Sexo',
    'Matrícula SIGE',
    'ID Censo',
    'CPF',
    'RG',
    'Status'
  ];

  // Preparar dados
  const data = students.map(student => {
    const classData = classes.find(c => c.id === student.classId);
    const birthDate = new Date(student.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return [
      student.name,
      classData?.name || 'N/A',
      new Date(student.birthDate).toLocaleDateString('pt-BR'),
      age,
      student.gender === 'M' ? 'Masculino' :
      student.gender === 'F' ? 'Feminino' :
      student.gender === 'O' ? 'Outro' : 'Prefiro não informar',
      student.enrollment || '',
      student.censusId || '',
      student.cpf || '',
      student.rg || '',
      student.status === 'active' ? 'Ativo' :
      student.status === 'inactive' ? 'Inativo' : 'Transferido'
    ];
  });

  // Criar planilha
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Definir largura das colunas
  worksheet['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 30 }, // Turma
    { wch: 18 }, // Data
    { wch: 8 },  // Idade
    { wch: 12 }, // Sexo
    { wch: 15 }, // Matrícula
    { wch: 12 }, // ID Censo
    { wch: 15 }, // CPF
    { wch: 15 }, // RG
    { wch: 12 }, // Status
  ];

  // Adicionar planilha ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');

  // Gerar arquivo
  const fileName = `Lista_Alunos_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

type CourseYear = 1 | 2 | 3;
export type RankingType = 'general' | 'common' | 'technical';

interface RankingIncidentsInput {
  includeIncidents: boolean;
  incidents: Incident[];
}

interface ClassRankingBaseInput {
  schoolName: string;
  classData: Class;
  students: Student[];
  grades: Grade[];
  selectedSchoolYears: CourseYear[];
  technicalSubjects: string[];
  rankingType: RankingType;
  rankingIncidents?: RankingIncidentsInput;
}

type ExportClassRankingsWorkbookInput = ClassRankingBaseInput;
type ExportClassRankingsPdfInput = ClassRankingBaseInput;
type ExportClassRankingByAreaInput = Omit<ClassRankingBaseInput, 'rankingType'>;

interface RankingRow {
  studentName: string;
  commonAverage: number | null;
  technicalAverage: number | null;
  generalAverage: number | null;
  incidentCount: number;
}

interface RankingIncidentsResolved {
  includeIncidents: boolean;
  filteredIncidents: Incident[];
}

interface PreparedRankingData {
  years: CourseYear[];
  selectedYearsLabel: string;
  rankingRows: RankingRow[];
  rankingType: RankingType;
  resolvedIncidents: RankingIncidentsResolved;
}

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const safeMean = (values: number[]): number | null => {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sortableValue = (value: number | null): number =>
  value === null ? Number.NEGATIVE_INFINITY : value;

const formatNullableAverage = (value: number | null): number | string =>
  value === null ? '' : Number(value.toFixed(2));

const formatNullableAveragePdf = (value: number | null): string =>
  value === null ? '-' : value.toFixed(2).replace('.', ',');

const rankingTypeConfig: Record<
  RankingType,
  { sheetName: string; fileToken: string; metricHeader: string }
> = {
  general: {
    sheetName: 'Ranking Geral',
    fileToken: 'geral',
    metricHeader: 'Média Geral',
  },
  common: {
    sheetName: 'Ranking Base Comum',
    fileToken: 'base_comum',
    metricHeader: 'Média Base Comum',
  },
  technical: {
    sheetName: 'Ranking Base Tecnica',
    fileToken: 'base_tecnica',
    metricHeader: 'Média Base Técnica',
  },
};

const calculateStudentRankingRow = (
  student: Student,
  grades: Grade[],
  technicalSubjectKeys: Set<string>,
  incidentCountByStudent: Map<string, number>,
): RankingRow => {
  const studentGrades = grades.filter((grade) => grade.studentId === student.id);
  const subjectMap = new Map<string, { sum: number; count: number; isTechnical: boolean }>();

  studentGrades.forEach((grade) => {
    const subjectKey = normalizeText(grade.subject);
    if (!subjectKey) return;
    if (!Number.isFinite(grade.grade)) return;

    const current = subjectMap.get(subjectKey);
    const isTechnical = technicalSubjectKeys.has(subjectKey);
    if (current) {
      current.sum += grade.grade;
      current.count += 1;
      return;
    }

    subjectMap.set(subjectKey, {
      sum: grade.grade,
      count: 1,
      isTechnical,
    });
  });

  const commonSubjectAverages: number[] = [];
  const technicalSubjectAverages: number[] = [];
  subjectMap.forEach((subjectStats) => {
    const subjectAverage = subjectStats.sum / subjectStats.count;
    if (subjectStats.isTechnical) {
      technicalSubjectAverages.push(subjectAverage);
      return;
    }
    commonSubjectAverages.push(subjectAverage);
  });

  const commonAverage = safeMean(commonSubjectAverages);
  const technicalAverage = safeMean(technicalSubjectAverages);
  const generalAverage = safeMean(
    [commonAverage, technicalAverage].filter((value): value is number => value !== null),
  );

  return {
    studentName: student.name,
    commonAverage,
    technicalAverage,
    generalAverage,
    incidentCount: incidentCountByStudent.get(student.id) ?? 0,
  };
};

const sortRankingRows = (rows: RankingRow[], rankingType: RankingType): RankingRow[] =>
  [...rows].sort((a, b) => {
    if (rankingType === 'common') {
      const commonDiff = sortableValue(b.commonAverage) - sortableValue(a.commonAverage);
      if (commonDiff !== 0) return commonDiff;
      return a.studentName.localeCompare(b.studentName, 'pt-BR');
    }

    if (rankingType === 'technical') {
      const technicalDiff =
        sortableValue(b.technicalAverage) - sortableValue(a.technicalAverage);
      if (technicalDiff !== 0) return technicalDiff;
      return a.studentName.localeCompare(b.studentName, 'pt-BR');
    }

    const generalDiff = sortableValue(b.generalAverage) - sortableValue(a.generalAverage);
    if (generalDiff !== 0) return generalDiff;

    const technicalDiff =
      sortableValue(b.technicalAverage) - sortableValue(a.technicalAverage);
    if (technicalDiff !== 0) return technicalDiff;

    const commonDiff = sortableValue(b.commonAverage) - sortableValue(a.commonAverage);
    if (commonDiff !== 0) return commonDiff;

    return a.studentName.localeCompare(b.studentName, 'pt-BR');
  });

const resolveRankingIncidents = (
  rankingIncidents?: RankingIncidentsInput,
): RankingIncidentsResolved => {
  if (!rankingIncidents?.includeIncidents) {
    return {
      includeIncidents: false,
      filteredIncidents: [],
    };
  }

  return {
    includeIncidents: true,
    filteredIncidents: rankingIncidents.incidents,
  };
};

const buildIncidentCountByStudent = (incidents: Incident[]): Map<string, number> => {
  const countByStudent = new Map<string, number>();
  incidents.forEach((incident) => {
    const uniqueStudentIds = new Set(incident.studentIds);
    uniqueStudentIds.forEach((studentId) => {
      countByStudent.set(studentId, (countByStudent.get(studentId) ?? 0) + 1);
    });
  });
  return countByStudent;
};

const buildIncidentsContextLabel = (resolvedIncidents: RankingIncidentsResolved): string | null =>
  resolvedIncidents.includeIncidents
    ? `Acompanhamentos no período: ${resolvedIncidents.filteredIncidents.length}`
    : null;

const getXlsHeaders = (
  rankingType: RankingType,
  includeIncidents: boolean,
): string[] => {
  const baseHeaders = ['Posição', 'Aluno'];

  if (rankingType === 'general') {
    return includeIncidents
      ? [...baseHeaders, 'Media Base Comum', 'Media Disciplinas Tecnicas', 'Media Geral', 'Acompanhamentos']
      : [...baseHeaders, 'Media Base Comum', 'Media Disciplinas Tecnicas', 'Media Geral'];
  }

  const metricHeader =
    rankingType === 'common' ? 'Media Base Comum' : 'Media Disciplinas Tecnicas';
  return includeIncidents
    ? [...baseHeaders, metricHeader, 'Acompanhamentos']
    : [...baseHeaders, metricHeader];
};

const getXlsRow = (
  row: RankingRow,
  index: number,
  rankingType: RankingType,
  includeIncidents: boolean,
): Array<number | string> => {
  const prefix: Array<number | string> = [index + 1, row.studentName];

  if (rankingType === 'general') {
    return [
      ...prefix,
      formatNullableAverage(row.commonAverage),
      formatNullableAverage(row.technicalAverage),
      formatNullableAverage(row.generalAverage),
      ...(includeIncidents ? [row.incidentCount] : []),
    ];
  }

  const metricValue =
    rankingType === 'common'
      ? formatNullableAverage(row.commonAverage)
      : formatNullableAverage(row.technicalAverage);
  return [...prefix, metricValue, ...(includeIncidents ? [row.incidentCount] : [])];
};

const getPdfHeaders = (
  rankingType: RankingType,
  includeIncidents: boolean,
): TableCell[] => {
  const baseHeaders: TableCell[] = [
    { text: '#', style: 'tableHeader' },
    { text: 'Aluno', style: 'tableHeader' },
  ];

  if (rankingType === 'general') {
    return [
      ...baseHeaders,
      { text: 'Média Base Comum', style: 'tableHeader' },
      { text: 'Média Técnica', style: 'tableHeader' },
      { text: 'Média Geral', style: 'tableHeader' },
      ...(includeIncidents ? [{ text: 'Acompanhamentos', style: 'tableHeader' }] : []),
    ];
  }

  const metricHeader =
    rankingType === 'common' ? 'Média Base Comum' : 'Média Base Técnica';
  return [
    ...baseHeaders,
    { text: metricHeader, style: 'tableHeader' },
    ...(includeIncidents ? [{ text: 'Acompanhamentos', style: 'tableHeader' }] : []),
  ];
};

const getPdfRow = (
  row: RankingRow,
  index: number,
  rankingType: RankingType,
  includeIncidents: boolean,
): TableCell[] => {
  const prefix: TableCell[] = [
    { text: String(index + 1), style: 'tableCell' },
    { text: row.studentName, style: 'tableCellLeft' },
  ];

  if (rankingType === 'general') {
    return [
      ...prefix,
      { text: formatNullableAveragePdf(row.commonAverage), style: 'tableCell' },
      { text: formatNullableAveragePdf(row.technicalAverage), style: 'tableCell' },
      { text: formatNullableAveragePdf(row.generalAverage), style: 'tableCell' },
      ...(includeIncidents ? [{ text: String(row.incidentCount), style: 'tableCell' }] : []),
    ];
  }

  const metricValue =
    rankingType === 'common'
      ? formatNullableAveragePdf(row.commonAverage)
      : formatNullableAveragePdf(row.technicalAverage);
  return [
    ...prefix,
    { text: metricValue, style: 'tableCell' },
    ...(includeIncidents ? [{ text: String(row.incidentCount), style: 'tableCell' }] : []),
  ];
};

const prepareRankingData = (input: ClassRankingBaseInput): PreparedRankingData => {
  const years = [...input.selectedSchoolYears].sort((a, b) => a - b);
  const selectedYearsSet = new Set(years);
  const technicalSubjectKeys = new Set(input.technicalSubjects.map(normalizeText));
  const resolvedIncidents = resolveRankingIncidents(input.rankingIncidents);
  const scopedGrades = input.grades.filter((grade) =>
    selectedYearsSet.has((grade.schoolYear ?? 1) as CourseYear),
  );
  const incidentCountByStudent = buildIncidentCountByStudent(resolvedIncidents.filteredIncidents);

  const baseRankingRows = input.students.map((student) =>
    calculateStudentRankingRow(student, scopedGrades, technicalSubjectKeys, incidentCountByStudent),
  );

  return {
    years,
    selectedYearsLabel: years.map((year) => `${year}º ano`).join(', '),
    rankingRows: sortRankingRows(baseRankingRows, input.rankingType),
    rankingType: input.rankingType,
    resolvedIncidents,
  };
};

const createRankingWorksheet = (
  schoolName: string,
  classData: Class,
  prepared: PreparedRankingData,
) => {
  const includeIncidentsColumn = prepared.resolvedIncidents.includeIncidents;
  const incidentsContextLabel = buildIncidentsContextLabel(prepared.resolvedIncidents);
  const metadataRows: string[][] = [
    [schoolName || 'INSTITUIÇÃO DE ENSINO'],
    [`Turma: ${classData.name}`],
    [`Anos considerados: ${prepared.selectedYearsLabel}`],
  ];
  if (incidentsContextLabel) metadataRows.push([incidentsContextLabel]);
  metadataRows.push([]);

  const headers = getXlsHeaders(prepared.rankingType, includeIncidentsColumn);
  const rows = prepared.rankingRows.map((row, index) =>
    getXlsRow(row, index, prepared.rankingType, includeIncidentsColumn),
  );
  const worksheet = XLSX.utils.aoa_to_sheet([...metadataRows, headers, ...rows]);

  if (prepared.rankingType === 'general') {
    worksheet['!cols'] = includeIncidentsColumn
      ? [{ wch: 10 }, { wch: 36 }, { wch: 23 }, { wch: 28 }, { wch: 15 }, { wch: 14 }]
      : [{ wch: 10 }, { wch: 40 }, { wch: 23 }, { wch: 28 }, { wch: 15 }];
  } else {
    worksheet['!cols'] = includeIncidentsColumn
      ? [{ wch: 10 }, { wch: 42 }, { wch: 22 }, { wch: 14 }]
      : [{ wch: 10 }, { wch: 46 }, { wch: 24 }];
  }

  const lastColumn = headers.length - 1;
  const mergedInfoRows = metadataRows.length - 1;
  worksheet['!merges'] = Array.from({ length: mergedInfoRows }, (_, rowIndex) => ({
    s: { r: rowIndex, c: 0 },
    e: { r: rowIndex, c: lastColumn },
  }));

  return worksheet;
};

export const exportClassRankingsWorkbook = ({
  schoolName,
  classData,
  students,
  grades,
  selectedSchoolYears,
  technicalSubjects,
  rankingIncidents,
  rankingType,
}: ExportClassRankingsWorkbookInput) => {
  const workbook = XLSX.utils.book_new();
  const prepared = prepareRankingData({
    schoolName,
    classData,
    students,
    grades,
    selectedSchoolYears,
    technicalSubjects,
    rankingIncidents,
    rankingType,
  });

  XLSX.utils.book_append_sheet(
    workbook,
    createRankingWorksheet(schoolName, classData, prepared),
    rankingTypeConfig[prepared.rankingType].sheetName,
  );

  const yearsSuffix = prepared.years.join('-');
  const rankingTypeSuffix = rankingTypeConfig[prepared.rankingType].fileToken;
  const incidentsSuffix = prepared.resolvedIncidents.includeIncidents ? 'com_ocorrencias' : 'sem_ocorrencias';
  const sanitizedClassName = classData.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const dateSuffix = new Date().toISOString().split('T')[0];
  XLSX.writeFile(
    workbook,
    `Ranking_Turma_${sanitizedClassName}_Anos_${yearsSuffix}_Tipo_${rankingTypeSuffix}_${incidentsSuffix}_${dateSuffix}.xlsx`,
  );
};

export const exportClassRankingsPdf = async ({
  schoolName,
  classData,
  students,
  grades,
  selectedSchoolYears,
  technicalSubjects,
  rankingIncidents,
  rankingType,
}: ExportClassRankingsPdfInput): Promise<void> => {
  const prepared = prepareRankingData({
    schoolName,
    classData,
    students,
    grades,
    selectedSchoolYears,
    technicalSubjects,
    rankingIncidents,
    rankingType,
  });

  const includeIncidentsColumn = prepared.resolvedIncidents.includeIncidents;
  const incidentContextLabel = buildIncidentsContextLabel(prepared.resolvedIncidents);
  const headers = getPdfHeaders(prepared.rankingType, includeIncidentsColumn);
  const rows = prepared.rankingRows.map((row, index) =>
    getPdfRow(row, index, prepared.rankingType, includeIncidentsColumn),
  );

  const content: Content[] = [
    {
      text: schoolName || 'INSTITUIÇÃO DE ENSINO',
      style: 'h1',
      alignment: 'center',
      margin: [0, 0, 0, 4],
    },
    {
      text: `Ranking de Turma - ${classData.name}`,
      style: 'h2',
      alignment: 'center',
      margin: [0, 0, 0, 4],
    },
    {
      text: `Anos considerados: ${prepared.selectedYearsLabel}`,
      style: 'bodySmall',
      alignment: 'center',
      margin: [0, 0, 0, incidentContextLabel ? 2 : 8],
    },
    ...(incidentContextLabel
      ? [
          {
            text: incidentContextLabel,
            style: 'bodySmall',
            alignment: 'center',
            margin: [0, 0, 0, 10],
          } as Content,
        ]
      : []),
    {
      text: rankingTypeConfig[prepared.rankingType].sheetName,
      style: 'h3',
      margin: [0, 6, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths:
          prepared.rankingType === 'general'
            ? includeIncidentsColumn
              ? [28, '*', 82, 82, 74, 62]
              : [28, '*', 92, 92, 84]
            : includeIncidentsColumn
              ? [28, '*', 92, 62]
              : [28, '*', 108],
        body: [headers, ...rows],
      },
      layout: 'lightHorizontalLines',
    },
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 32, 24, 28],
    content,
    styles: {
      ...PDF_STYLES,
      tableHeader: {
        ...(PDF_STYLES.tableHeader || {}),
        fillColor: PDF_COLORS.primary,
      },
    },
    defaultStyle: {
      fontSize: 9,
    },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [24, 0, 24, 10],
      columns: [
        {
          text: `Gerado por MAVIC - Sistema de Acompanhamento Escolar em ${new Date().toLocaleDateString('pt-BR')}`,
          style: 'caption',
          alignment: 'left',
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          style: 'caption',
          alignment: 'right',
        },
      ],
    }),
  };

  const yearsSuffix = prepared.years.join('-');
  const rankingTypeSuffix = rankingTypeConfig[prepared.rankingType].fileToken;
  const incidentsSuffix = prepared.resolvedIncidents.includeIncidents ? 'com_ocorrencias' : 'sem_ocorrencias';
  const sanitizedClassName = classData.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const dateSuffix = new Date().toISOString().split('T')[0];
  const pdfMake = await getPdfMake();
  pdfMake.createPdf(docDefinition).download(
    `Ranking_Turma_${sanitizedClassName}_Anos_${yearsSuffix}_Tipo_${rankingTypeSuffix}_${incidentsSuffix}_${dateSuffix}.pdf`,
  );
};

export const exportClassRankingByArea = ({
  schoolName,
  classData,
  students,
  grades,
  selectedSchoolYears,
  technicalSubjects,
}: ExportClassRankingByAreaInput) => {
  exportClassRankingsWorkbook({
    schoolName,
    classData,
    students,
    grades,
    selectedSchoolYears,
    technicalSubjects,
    rankingType: 'general',
    rankingIncidents: {
      includeIncidents: false,
      incidents: [],
    },
  });
};
