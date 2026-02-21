/**
 * Configurações da Escola para PDFs e documentos
 */

import { supabase } from '@/services/supabase/client';
import { perfTimer } from '@/lib/perf';

export const SCHOOL_ASSETS_BUCKET = 'school-assets';
export const SCHOOL_ASSET_MAX_BYTES = 5 * 1024 * 1024;
export const SCHOOL_ASSET_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export type SchoolAssetType = 'logo' | 'certificate_frame';

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
  logoStoragePath?: string; // Logo no Supabase Storage
  certificateFrameStoragePath?: string; // Moldura lateral no Supabase Storage
  certificateFrameBase64?: string; // Moldura resolvida para renderização
  signatureBase64?: string; // Assinatura digitalizada em Base64
  themeColor?: string; // Cor principal dos PDFs
  additionalInfo?: string; // Informações adicionais
}

const STORAGE_KEY = 'school_config';
let schoolConfigCache: SchoolConfig | null = null;
let schoolConfigInFlight: Promise<SchoolConfig> | null = null;

const sanitizeFileName = (value: string): string => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'asset';
};

const ensureAuthenticatedUserId = async (): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error('Usuário não autenticado para gerenciar arquivos.');
  }

  return user.id;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao converter arquivo para Data URL.'));
    reader.readAsDataURL(blob);
  });

const validateSchoolAssetFile = (file: File) => {
  if (file.size > SCHOOL_ASSET_MAX_BYTES) {
    throw new Error('Arquivo excede o limite de 5MB.');
  }

  if (!SCHOOL_ASSET_ALLOWED_MIME_TYPES.includes(file.type as (typeof SCHOOL_ASSET_ALLOWED_MIME_TYPES)[number])) {
    throw new Error('Formato de arquivo inválido. Use PNG, JPG, WEBP ou SVG.');
  }
};

export const uploadSchoolAsset = async (
  type: SchoolAssetType,
  file: File,
): Promise<string> => {
  validateSchoolAssetFile(file);
  const userId = await ensureAuthenticatedUserId();

  const now = Date.now();
  const randomToken = Math.random().toString(36).slice(2, 10);
  const fileName = sanitizeFileName(file.name);
  const path = `${userId}/${type}/${now}_${randomToken}_${fileName}`;

  const { error } = await supabase.storage
    .from(SCHOOL_ASSETS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(error.message || 'Falha ao enviar arquivo para o Supabase Storage.');
  }

  return path;
};

export const removeSchoolAsset = async (path: string): Promise<void> => {
  const normalizedPath = path.trim();
  if (!normalizedPath) return;

  await ensureAuthenticatedUserId();

  const { error } = await supabase.storage
    .from(SCHOOL_ASSETS_BUCKET)
    .remove([normalizedPath]);

  if (error) {
    throw new Error(error.message || 'Falha ao remover arquivo do Supabase Storage.');
  }
};

export const downloadSchoolAssetAsDataUrl = async (
  path: string,
): Promise<string | undefined> => {
  const normalizedPath = path.trim();
  if (!normalizedPath) return undefined;

  await ensureAuthenticatedUserId();

  const { data, error } = await supabase.storage
    .from(SCHOOL_ASSETS_BUCKET)
    .download(normalizedPath);

  if (error || !data) {
    return undefined;
  }

  try {
    return await blobToDataUrl(data);
  } catch {
    return undefined;
  }
};

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
      const mapped = mapFromDb(data);
      const [logoBase64FromStorage, frameBase64FromStorage] = await Promise.all([
        mapped.logoStoragePath
          ? downloadSchoolAssetAsDataUrl(mapped.logoStoragePath)
          : Promise.resolve(undefined),
        mapped.certificateFrameStoragePath
          ? downloadSchoolAssetAsDataUrl(mapped.certificateFrameStoragePath)
          : Promise.resolve(undefined),
      ]);

      return {
        ...mapped,
        logoBase64: logoBase64FromStorage || mapped.logoBase64,
        certificateFrameBase64: frameBase64FromStorage || mapped.certificateFrameBase64,
      };
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
type SchoolConfigDbRow = {
  school_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  phone?: string | null;
  email?: string | null;
  director_name?: string | null;
  inep?: string | null;
  logo_storage_path?: string | null;
  certificate_frame_storage_path?: string | null;
  logo_base64?: string | null;
  signature_base64?: string | null;
  theme_color?: string | null;
  additional_info?: string | null;
};

const mapFromDb = (dbRow: SchoolConfigDbRow): SchoolConfig => ({
  schoolName: dbRow.school_name || 'INSTITUIÇÃO DE ENSINO',
  address: dbRow.address || '',
  city: dbRow.city || '',
  state: dbRow.state || '',
  cep: dbRow.cep || '',
  phone: dbRow.phone || '',
  email: dbRow.email || '',
  directorName: dbRow.director_name || '',
  inep: dbRow.inep || '',
  logoStoragePath: dbRow.logo_storage_path || undefined,
  certificateFrameStoragePath: dbRow.certificate_frame_storage_path || undefined,
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
  logo_storage_path: config.logoStoragePath || null,
  certificate_frame_storage_path: config.certificateFrameStoragePath || null,
  logo_base64: config.logoStoragePath ? null : (config.logoBase64 || null),
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
