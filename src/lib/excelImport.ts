import * as XLSX from 'xlsx';
import { Student, Class } from '@/types';

const importDebug = import.meta.env.VITE_DEBUG_IMPORT === 'true';
const debugLog = (...args: unknown[]) => {
  if (importDebug) {
    console.log(...args);
  }
};

export interface ImportRow {
  rowNumber: number;
  data: Partial<Student>;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export interface ImportResult {
  rows: ImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}

// Limpar CPF (remover formatação)
const cleanCPF = (cpf: string): string => {
  return cpf.replace(/[^\d]/g, '');
};

// Validar CPF - DESABILITADO (apenas validação básica de formato)
const validateCPF = (cpf: string): boolean => {
  const cleaned = cleanCPF(cpf);
  // Apenas verificar se tem 11 dígitos - validação de dígitos verificadores desabilitada
  return cleaned.length === 11;
};

// Validar formato de data
const parseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  // Tentar formato DD/MM/AAAA
  const ddmmyyyy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Tentar formato AAAA-MM-DD
  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return dateStr;
    }
  }
  
  return null;
};

// Validar idade por série
const validateAgeBySeries = (birthDate: string, series: string): { valid: boolean; age: number; message?: string } => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  let minAge = 14, maxAge = 18;
  if (series === '2º') { minAge = 15; maxAge = 19; }
  if (series === '3º') { minAge = 16; maxAge = 20; }

  if (age < minAge || age > maxAge) {
    return {
      valid: false,
      age,
      message: `Idade (${age} anos) fora da faixa esperada para ${series} ano (${minAge}-${maxAge} anos)`
    };
  }

  return { valid: true, age };
};

const normalizeClassLabel = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

const buildLegacyClassNumber = (cls: Class): string | null => {
  const letter = cls.letter?.trim().toUpperCase();
  if (!letter) return null;

  if (typeof cls.startCalendarYear === 'number' && typeof cls.endCalendarYear === 'number') {
    return `${cls.startCalendarYear}-${cls.endCalendarYear}-${letter}`;
  }

  if (cls.startYearDate) {
    const startDate = new Date(cls.startYearDate);
    if (!Number.isNaN(startDate.getTime())) {
      const startYearValue = startDate.getFullYear();
      const startYearNumber = cls.startYear ?? 1;
      if (startYearNumber >= 1 && startYearNumber <= 3) {
        const endYearValue = startYearValue + (3 - startYearNumber);
        return `${startYearValue}-${endYearValue}-${letter}`;
      }
    }
  }

  return null;
};

// Ler arquivo Excel/CSV
export const readExcelFile = async (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        resolve(jsonData as any[][]);
      } catch (error) {
        reject(new Error('Erro ao ler o arquivo. Verifique se o formato está correto.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo.'));
    };
    
    reader.readAsBinaryString(file);
  });
};

// Validar e processar dados importados
export const validateImportData = (
  data: any[][],
  classes: Class[],
  existingStudents: Student[],
  selectedClassId?: string // ID da turma pré-selecionada
): ImportResult => {
  if (data.length < 2) {
    return {
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
    };
  }

  // Primeira linha são os cabeçalhos
  const headers = data[0].map((h: any) => String(h).trim().toLowerCase());
  
  // Mapear índices das colunas
  const nameIndex = headers.findIndex(h => h.includes('nome'));
  const classIndex = headers.findIndex(h => h.includes('turma'));
  const birthDateIndex = headers.findIndex(h => h.includes('data') && h.includes('nascimento'));
  const genderIndex = headers.findIndex(h => h.includes('sexo'));
  const enrollmentIndex = headers.findIndex(h => h.includes('matrícula') || h.includes('matricula'));
  const censusIndex = headers.findIndex(h => h.includes('censo') || h.includes('id censo'));
  const cpfIndex = headers.findIndex(h => h.includes('cpf'));
  const rgIndex = headers.findIndex(h => h.includes('rg'));

  // Validar se colunas obrigatórias existem
  const missingColumns: string[] = [];
  if (nameIndex === -1) missingColumns.push('Nome Completo');
  if (classIndex === -1) missingColumns.push('Nome da Turma');
  if (birthDateIndex === -1) missingColumns.push('Data de Nascimento');
  if (genderIndex === -1) missingColumns.push('Sexo');

  const rows: ImportRow[] = [];
  const existingCPFs = new Set(existingStudents.map(s => s.cpf).filter(Boolean).map(cleanCPF));

  // Processar cada linha (começando da linha 2, índice 1)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1; // Linha real na planilha (começa em 2)
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar se linha está vazia
    const isEmpty = row.every(cell => !cell || String(cell).trim() === '');
    if (isEmpty) continue;

    // Validar colunas obrigatórias
    if (missingColumns.length > 0) {
      errors.push(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
      rows.push({
        rowNumber,
        data: {},
        errors,
        warnings,
        isValid: false,
      });
      continue;
    }

    const name = String(row[nameIndex] || '').trim();
    const classNameStr = String(row[classIndex] || '').trim();
    const birthDateStr = String(row[birthDateIndex] || '').trim();
    const gender = String(row[genderIndex] || '').trim().toUpperCase();
    const enrollment = String(row[enrollmentIndex] || '').trim();
    const censusId = String(row[censusIndex] || '').trim();
    const cpf = String(row[cpfIndex] || '').trim();
    const rg = String(row[rgIndex] || '').trim();

    // Validações obrigatórias
    if (!name) errors.push('Nome Completo é obrigatório');
    if (!classNameStr) errors.push('Nome da Turma é obrigatório');
    if (!birthDateStr) errors.push('Data de Nascimento é obrigatória');
    if (!gender) errors.push('Sexo é obrigatório');

    // Validar formato de data
    const birthDate = parseDate(birthDateStr);
    if (!birthDate && birthDateStr) {
      errors.push('Data de Nascimento inválida. Use formato DD/MM/AAAA ou AAAA-MM-DD');
    }

    // Validar sexo
    const validGenders = ['M', 'F', 'O', 'N'];
    if (gender && !validGenders.includes(gender)) {
      errors.push(`Sexo inválido. Use M, F, O ou N. Valor encontrado: ${gender}`);
    }

    // Validar turma - usar nome da turma da planilha
    let classData: Class | undefined;
    
    debugLog(`[VALIDAÇÃO] Linha ${rowNumber}: Buscando turma pelo nome "${classNameStr}"`);
    debugLog(`[VALIDAÇÃO] Turmas disponíveis:`, classes.map(c => ({ id: c.id, name: c.name })));

    const normalizedLookup = normalizeClassLabel(classNameStr);
    classData = classes.find(c => normalizeClassLabel(c.name) === normalizedLookup);

    if (!classData && classNameStr) {
      const legacyLookup = classNameStr.toUpperCase().trim();
      const legacyMatch = classes.find(c => {
        const legacyNumber = buildLegacyClassNumber(c);
        return legacyNumber ? legacyNumber.toUpperCase() === legacyLookup : false;
      });
      if (legacyMatch) {
        classData = legacyMatch;
        warnings.push(`Identificação no formato antigo. Use o nome "${legacyMatch.name}".`);
      }
    }

    if (classData) {
      debugLog(`[VALIDAÇÃO] ✅ Turma encontrada:`, { id: classData.id, name: classData.name });
    }

    // Se não encontrou e há turma pré-selecionada, verificar se corresponde
    if (!classData && selectedClassId) {
      debugLog(`[VALIDAÇÃO] Turma não encontrada pelo nome, verificando turma pré-selecionada: ${selectedClassId}`);
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        const normalizedSelectedName = normalizeClassLabel(selectedClass.name);
        if (normalizedLookup === normalizedSelectedName) {
          classData = selectedClass;
          debugLog(`[VALIDAÇÃO] ✅ Usando turma pré-selecionada:`, { id: classData.id, name: classData.name });
        } else if (classNameStr) {
          const legacyNumber = buildLegacyClassNumber(selectedClass);
          if (legacyNumber && legacyNumber.toUpperCase() === classNameStr.toUpperCase().trim()) {
            classData = selectedClass;
            warnings.push(`Identificação no formato antigo. Use o nome "${selectedClass.name}".`);
            debugLog(`[VALIDAÇÃO] ⚠️ Formato antigo, usando turma pré-selecionada:`, { id: selectedClass.id, name: selectedClass.name });
          }
        }
      }
    }

    // Se ainda não encontrou, adicionar erro
    if (!classData && classNameStr) {
      const errorMsg = `Turma com nome "${classNameStr}" não encontrada no sistema. Turmas disponíveis: ${classes.map(c => c.name).join(', ')}`;
      console.error(`[VALIDAÇÃO] ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Validar idade por série
    if (birthDate && classData) {
      const ageValidation = validateAgeBySeries(birthDate, classData.series);
      if (!ageValidation.valid) {
        warnings.push(ageValidation.message || 'Idade fora da faixa esperada');
      }
    }

    // Validar CPF (apenas formato básico - validação de dígitos verificadores desabilitada)
    if (cpf) {
      const cleanedCPF = cleanCPF(cpf);
      if (cleanedCPF.length !== 11) {
        warnings.push('CPF deve ter 11 dígitos');
      } else if (existingCPFs.has(cleanedCPF)) {
        errors.push('CPF já cadastrado no sistema');
      }
    }

    // Verificar duplicatas na própria importação
    const currentRowCPF = cpf ? cleanCPF(cpf) : null;
    if (currentRowCPF) {
      const duplicateInImport = rows.some(r => {
        const rowCPF = r.data.cpf ? cleanCPF(r.data.cpf) : null;
        return rowCPF === currentRowCPF && r.rowNumber < rowNumber;
      });
      if (duplicateInImport) {
        errors.push('CPF duplicado nesta importação');
      }
    }

    // Determinar classId final - usar turma encontrada pelo número da planilha
    let finalClassId = '';
    let finalClassData: Class | undefined;
    
    if (classData) {
      // Usar turma encontrada pelo número da planilha
      finalClassId = classData.id;
      finalClassData = classData;
      debugLog(`[VALIDAÇÃO] Linha ${rowNumber}: finalClassId definido como "${finalClassId}" para turma "${classData.name}"`);
    } else {
      // Se não encontrou turma, classId fica vazio (será marcado como inválido)
      finalClassId = '';
      finalClassData = undefined;
      if (importDebug) {
        console.error(`[VALIDAÇÃO] Linha ${rowNumber}: ❌ finalClassId VAZIO - turma não encontrada!`);
      }
    }

    const isValid = errors.length === 0 && !!finalClassData && !!finalClassId;
    debugLog(`[VALIDAÇÃO] Linha ${rowNumber}: isValid = ${isValid}, errors = ${errors.length}, finalClassId = "${finalClassId}"`);

    rows.push({
      rowNumber,
      data: {
        name,
        classId: finalClassId,
        birthDate: birthDate || '',
        gender: gender as 'M' | 'F' | 'O' | 'N',
        enrollment: enrollment || undefined,
        censusId: censusId || undefined,
        cpf: cpf ? cleanCPF(cpf) : undefined,
        rg: rg || undefined,
        status: 'active',
      },
      errors,
      warnings,
      isValid,
    });
  }

  const validRows = rows.filter(r => r.isValid).length;
  const invalidRows = rows.filter(r => !r.isValid).length;
  const duplicateRows = rows.filter(r => 
    r.errors.some(e => e.includes('duplicado') || e.includes('já cadastrado'))
  ).length;

  return {
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicateRows,
  };
};
