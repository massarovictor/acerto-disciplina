import * as XLSX from 'xlsx';
import { Student, Class } from '@/types';

// Modelo de planilha para importação de alunos
export const generateStudentTemplate = (selectedClass?: Class) => {
  const workbook = XLSX.utils.book_new();
  
  // Cabeçalhos das colunas
  const headers = [
    'Nome Completo',
    'Número da Turma',
    'Data de Nascimento',
    'Sexo',
    'Matrícula SIGE',
    'ID Censo',
    'CPF',
    'RG'
  ];

  // Linha de exemplo - usar número da turma selecionada se disponível
  const exampleRow = [
    'João Silva Santos',
    selectedClass?.classNumber || 'TURMA-001',
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
      ? [`2. Número da Turma: PRÉ-PREENCHIDO - ${selectedClass.classNumber} (não altere este campo)`]
      : ['2. Número da Turma: Obrigatório - Número da turma (ex: TURMA-001)'],
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
      ? ['- O número da turma já está pré-selecionado - não altere este campo']
      : ['- Use o número da turma (ex: TURMA-001) - não use o nome da turma'],
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
    { wch: 18 }, // Número da Turma
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

