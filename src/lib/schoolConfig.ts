/**
 * Configurações da Escola para PDFs e documentos
 */

import { supabase } from '@/services/supabase/client';
import { perfTimer } from '@/lib/perf';

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
let schoolConfigCache: SchoolConfig | null = null;
let schoolConfigInFlight: Promise<SchoolConfig> | null = null;

export const getSchoolConfig = async (): Promise<SchoolConfig> => {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  if (schoolConfigCache) {
    return schoolConfigCache;
  }

  if (schoolConfigInFlight) {
    return schoolConfigInFlight;
  }

  schoolConfigInFlight = (async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Fallback para localStorage se não estiver autenticado
      return getSchoolConfigFromLocalStorage();
    }

    // Busca a configuração global (única linha na tabela com ID fixo)
    const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';
    const done = perfTimer('school_config.fetch');
    const { data, error } = await supabase
      .from('school_config')
      .select('*')
      .eq('id', SINGLETON_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        done({ ok: true, source: 'default' });
        // Nenhum registro encontrado, retorna default
        return getDefaultConfig();
      }
      console.error('Erro ao buscar configurações da escola:', error);
      done({ ok: false, source: 'supabase' });
      // Fallback para localStorage em caso de erro
      return getSchoolConfigFromLocalStorage();
    }

    if (data) {
      done({ ok: true, source: 'supabase' });
      return mapFromDb(data);
    }

    done({ ok: true, source: 'default' });
    return getDefaultConfig();
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return getSchoolConfigFromLocalStorage();
  }
  })();

  try {
    const result = await schoolConfigInFlight;
    schoolConfigCache = result;
    return result;
  } finally {
    schoolConfigInFlight = null;
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
    const done = perfTimer('school_config.save');
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
      done({ ok: false });
      throw error;
    }

    done({ ok: true });
    // Também salva no localStorage como backup
    saveSchoolConfigToLocalStorage(config);
    schoolConfigCache = config;
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    // Fallback para localStorage em caso de erro
    saveSchoolConfigToLocalStorage(config);
    schoolConfigCache = config;
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
