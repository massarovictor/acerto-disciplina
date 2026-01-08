/**
 * Configurações da Escola para PDFs e documentos
 */

import { supabase } from '@/services/supabase/client';

export interface SchoolConfig {
  schoolName: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  phone?: string;
  email?: string;
  directorName?: string;
  inep?: string; // Código INEP
  logoBase64?: string; // Logo em Base64
  signatureBase64?: string; // Assinatura digitalizada em Base64
  themeColor?: string; // Cor principal dos PDFs
  additionalInfo?: string; // Informações adicionais
}

const STORAGE_KEY = 'school_config';

export const getSchoolConfig = async (): Promise<SchoolConfig> => {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Fallback para localStorage se não estiver autenticado
      return getSchoolConfigFromLocalStorage();
    }

    // Busca a configuração global (única linha na tabela com ID fixo)
    const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase
      .from('school_config')
      .select('*')
      .eq('id', SINGLETON_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhum registro encontrado, retorna default
        return getDefaultConfig();
      }
      console.error('Erro ao buscar configurações da escola:', error);
      // Fallback para localStorage em caso de erro
      return getSchoolConfigFromLocalStorage();
    }

    if (data) {
      return mapFromDb(data);
    }

    return getDefaultConfig();
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return getSchoolConfigFromLocalStorage();
  }
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Fallback para localStorage se não estiver autenticado
      saveSchoolConfigToLocalStorage(config);
      return;
    }

    const dbData = mapToDb(config);

    const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';

    // Usa upsert com ID fixo para garantir que sempre existe apenas uma linha
    const { error } = await supabase
      .from('school_config')
      .upsert({
        id: SINGLETON_ID,
        ...dbData,
      }, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Erro ao salvar configurações da escola:', error);
      throw error;
    }

    // Também salva no localStorage como backup
    saveSchoolConfigToLocalStorage(config);
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    // Fallback para localStorage em caso de erro
    saveSchoolConfigToLocalStorage(config);
    throw error;
  }
};

// Funções auxiliares para localStorage (fallback)
const getSchoolConfigFromLocalStorage = (): SchoolConfig => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultConfig();
    }
  }
  return getDefaultConfig();
};

const saveSchoolConfigToLocalStorage = (config: SchoolConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

// Mapeamento entre interface TypeScript e banco de dados
const mapFromDb = (dbRow: any): SchoolConfig => ({
  schoolName: dbRow.school_name || 'INSTITUIÇÃO DE ENSINO',
  address: dbRow.address || '',
  city: dbRow.city || '',
  state: dbRow.state || '',
  cep: dbRow.cep || '',
  phone: dbRow.phone || '',
  email: dbRow.email || '',
  directorName: dbRow.director_name || '',
  inep: dbRow.inep || '',
  logoBase64: dbRow.logo_base64 || undefined,
  signatureBase64: dbRow.signature_base64 || undefined,
  themeColor: dbRow.theme_color || '#0F172A',
  additionalInfo: dbRow.additional_info || '',
});

const mapToDb = (config: SchoolConfig) => ({
  school_name: config.schoolName,
  address: config.address || null,
  city: config.city || null,
  state: config.state || null,
  cep: config.cep || null,
  phone: config.phone || null,
  email: config.email || null,
  director_name: config.directorName || null,
  inep: config.inep || null,
  logo_base64: config.logoBase64 || null,
  signature_base64: config.signatureBase64 || null,
  theme_color: config.themeColor || '#0F172A',
  additional_info: config.additionalInfo || null,
});

export const getDefaultConfig = (): SchoolConfig => ({
  schoolName: 'INSTITUIÇÃO DE ENSINO',
  address: '',
  city: '',
  state: '',
  cep: '',
  phone: '',
  email: '',
  directorName: '',
  inep: '',
  themeColor: '#0F172A',
  additionalInfo: '',
});
