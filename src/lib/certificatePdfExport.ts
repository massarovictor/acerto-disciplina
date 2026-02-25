import JSZip from 'jszip';
import QRCode from 'qrcode';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

import { type CertificateType } from '@/lib/certificateTypes';
import { formatBrasiliaDate, getBrasiliaISODate } from '@/lib/brasiliaDate';
import {
  buildCertificateTextPreview as buildCertificateTextPreviewWithLanguage,
  buildCertificateTextForPdf,
} from '@/lib/certificateLanguage';
import { PDF_COLORS, PDF_STYLES, getPdfMake } from '@/lib/pdfGenerator';
import { getDefaultConfig, getSchoolConfig } from '@/lib/schoolConfig';
import { type SignatureMode } from '@/types';

export type SidebarPattern = 'chevrons' | 'hexagons' | 'diagonal_lines';

export interface HighlightStudentMeta {
  status: 'confirmed' | 'pending';
  average: number | null;
}

export interface MonitoriaCertificateMeta {
  workloadHours: number;
  monitoriaPeriod: string;
  activity: string;
}

export interface EventCertificateMeta {
  eventName: string;
  eventDate: string;
  eventDateStart?: string;
  eventDateEnd?: string;
  workloadHours: number;
  role: string;
}

export interface CertificateExportClassSnapshot {
  id?: string;
  name: string;
}

export interface CertificateExportStudentSnapshot {
  id: string;
  name: string;
}

export interface ExportCertificatesPdfInput {
  certificateType: CertificateType;
  classData: CertificateExportClassSnapshot;
  schoolYear: 1 | 2 | 3;
  periodLabel: string;
  referenceLabel?: string;
  baseText: string;
  students: CertificateExportStudentSnapshot[];
  textOverrides?: Record<string, string>;
  teacherName?: string;
  directorName?: string;
  signatureMode?: SignatureMode;
  verificationCodesByStudentId?: Record<string, string>;
  verificationBaseUrl?: string;
  monitoriaMeta?: MonitoriaCertificateMeta;
  eventMeta?: EventCertificateMeta;
  highlightMetaByStudentId?: Record<string, HighlightStudentMeta>;
  sidebarPattern?: SidebarPattern;
}

export interface GeneratedCertificateFile {
  studentId: string;
  studentName: string;
  fileName: string;
  blob: Blob;
  folderPath?: string;
}

export interface DownloadCertificateFilesOptions {
  zipFileName?: string;
  forceZip?: boolean;
}

interface ResolvedExportCertificatesPdfInput extends ExportCertificatesPdfInput {
  schoolName: string;
  schoolCity?: string;
  schoolState?: string;
  schoolLogoBase64?: string;
  certificateFrameBase64?: string;
  directorSignatureBase64?: string;
  themeColor: string;
  verificationBaseUrl: string;
}

const CERTIFICATE_LAYOUT_SUBTITLE_BY_TYPE: Record<CertificateType, string> = {
  monitoria: 'MONITORIA',
  destaque: 'DESTAQUE ACADÊMICO',
  evento_participacao: 'PARTICIPAÇÃO',
  evento_organizacao: 'ORGANIZAÇÃO',
};

const CERTIFICATE_TOKEN_BY_TYPE: Record<CertificateType, string> = {
  monitoria: 'monitoria',
  destaque: 'destaque',
  evento_participacao: 'evento_participacao',
  evento_organizacao: 'evento_organizacao',
};

const SIGNATURE_LINE_WIDTH = 220;
const SHOW_HIGHLIGHT_BADGE = false;

let signatureFontLoadPromise: Promise<void> | null = null;

const sanitizeFileNamePart = (value: string, fallback = 'item') => {
  const sanitized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || fallback;
};

const sanitizeFolderPath = (value?: string) => {
  if (!value) return '';
  return value
    .split('/')
    .map((part) => sanitizeFileNamePart(part, 'item'))
    .filter(Boolean)
    .join('/');
};

const normalizeThemeColor = (rawColor?: string) => {
  const color = (rawColor || '').trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return PDF_COLORS.primary;
};

const getWindowBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';

  const rawBase = (import.meta.env.BASE_URL || '/').trim();
  const normalizedBase = rawBase === '/' ? '' : rawBase.replace(/\/+$/, '');
  return `${window.location.origin}${normalizedBase}`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getStudentCertificateText = (
  student: CertificateExportStudentSnapshot,
  input: ResolvedExportCertificatesPdfInput,
): string => {
  return buildCertificateTextForPdf({
    certificateType: input.certificateType,
    schoolName: input.schoolName,
    className: input.classData.name,
    schoolYear: input.schoolYear,
    periodLabel: input.periodLabel,
    referenceLabel: input.referenceLabel,
    baseText: input.textOverrides?.[student.id]?.trim() || input.baseText.trim(),
    studentName: student.name,
    monitoriaMeta: input.monitoriaMeta,
    eventMeta: input.eventMeta,
  });
};

export interface CertificateTextPreviewInput {
  certificateType: CertificateType;
  schoolName: string;
  className: string;
  schoolYear: 1 | 2 | 3;
  periodLabel: string;
  referenceLabel?: string;
  baseText: string;
  studentName: string;
  monitoriaMeta?: MonitoriaCertificateMeta;
  eventMeta?: EventCertificateMeta;
}

export const buildCertificateTextPreview = (
  input: CertificateTextPreviewInput,
): string =>
  buildCertificateTextPreviewWithLanguage({
    certificateType: input.certificateType,
    schoolName: input.schoolName,
    className: input.className,
    schoolYear: input.schoolYear,
    periodLabel: input.periodLabel,
    referenceLabel: input.referenceLabel,
    baseText: input.baseText,
    studentName: input.studentName,
    monitoriaMeta: input.monitoriaMeta,
    eventMeta: input.eventMeta,
  });

const studentHighlightBadge = (
  student: CertificateExportStudentSnapshot,
  input: ResolvedExportCertificatesPdfInput,
): Content | null => {
  if (!SHOW_HIGHLIGHT_BADGE) return null;
  if (input.certificateType !== 'destaque') return null;

  const meta = input.highlightMetaByStudentId?.[student.id];
  if (!meta) return null;

  const statusLabel = meta.status === 'confirmed' ? 'Confirmado' : 'Pendente';
  const averageLabel =
    meta.average === null ? '-' : meta.average.toFixed(2).replace('.', ',');

  return {
    columns: [
      {
        text: `Status da sugestão: ${statusLabel}`,
        style: 'bodySmall',
      },
      {
        text: `Média global: ${averageLabel}`,
        style: 'bodySmall',
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 8],
  };
};

interface CertificateLayoutProfile {
  studentNameSize: number;
  bodyTextSize: number;
  bodyLineHeight: number;
  bodyMarginBottom: number;
  signatureMarginTop: number;
}

const resolveLayoutProfile = ({
  studentNameLength,
  bodyLength,
  hasHighlightBadge,
}: {
  studentNameLength: number;
  bodyLength: number;
  hasHighlightBadge: boolean;
}): CertificateLayoutProfile => {
  let studentNameSize = 40;
  if (studentNameLength > 32) studentNameSize = 34;
  if (studentNameLength > 44) studentNameSize = 30;
  if (studentNameLength > 58) studentNameSize = 26;

  let bodyTextSize = 14.2;
  let bodyLineHeight = 1.22;
  let bodyMarginBottom = 12;
  let signatureMarginTop = hasHighlightBadge ? 8 : 12;

  if (bodyLength > 390) {
    bodyTextSize = 13.2;
    bodyLineHeight = 1.18;
    bodyMarginBottom = 8;
    signatureMarginTop = hasHighlightBadge ? 6 : 8;
  }

  if (bodyLength > 470) {
    bodyTextSize = 12.2;
    bodyLineHeight = 1.14;
    bodyMarginBottom = 6;
    signatureMarginTop = 4;
  }

  if (bodyLength > 600) {
    bodyTextSize = 11.4;
    bodyLineHeight = 1.1;
    bodyMarginBottom = 4;
    signatureMarginTop = 2;
  }

  return {
    studentNameSize,
    bodyTextSize,
    bodyLineHeight,
    bodyMarginBottom,
    signatureMarginTop,
  };
};

const ensureSignatureFontLoaded = async (): Promise<void> => {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  if (!signatureFontLoadPromise) {
    signatureFontLoadPromise = Promise.all([
      document.fonts.load('74px "Allura"'),
      document.fonts.load('72px "Great Vibes"'),
      document.fonts.load('58px "Dancing Script"'),
    ])
      .then(() => undefined)
      .catch(() => undefined);
  }

  await signatureFontLoadPromise;
};

const createDigitalSignatureDataUrl = async (name: string): Promise<string | null> => {
  if (typeof document === 'undefined') return null;

  try {
    await ensureSignatureFontLoaded();

    const fontSpec =
      '82px "Allura", "Great Vibes", "Dancing Script", "Segoe Script", "Snell Roundhand", cursive';

    // Medir largura real do texto para nomes longos
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    if (!measureCtx) return null;
    measureCtx.font = fontSpec;
    const textWidth = measureCtx.measureText(name).width;
    const padding = 60;
    const canvasWidth = Math.max(800, Math.ceil(textWidth + padding));
    const canvasHeight = 220;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2 + 25);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.rotate(((name.trim().length % 7) - 3) * 0.006);
    context.font = fontSpec;
    context.lineWidth = 1.25;
    context.strokeStyle = 'rgba(15, 30, 102, 0.35)';
    context.strokeText(name, 0, 0);
    context.fillStyle = '#0F1E66';
    context.fillText(name, 0, 0);
    context.restore();

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

const createQrDataUrl = async (value: string): Promise<string | null> => {
  try {
    return await QRCode.toDataURL(value, {
      margin: 2,
      width: 192,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.warn('Falha ao gerar QR Code de certificado:', error);
    return null;
  }
};

const resolveVerificationUrl = (
  input: ResolvedExportCertificatesPdfInput,
  verificationCode?: string,
): string | null => {
  const code = verificationCode?.trim();
  if (!code) return null;

  const base = input.verificationBaseUrl.trim().replace(/\/+$/, '');
  if (!base) return null;

  return `${base}/certificados/verificar?codigo=${encodeURIComponent(code)}`;
};

// ─── SVG Pattern Builders ───────────────────────────────────────────────────
// Cada padrão retorna o SVG completo (com camadas) para a faixa lateral.
// Camadas: 1) Padrão geométrico  2) Gradiente de profundidade  3) Texto rotacionado

const buildChevronsSvg = (w: number, h: number, _subtitleLabel: string): string => {
  const cellSize = 28;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`,
    `  <defs>`,
    `    <pattern id="chevron" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">`,
    `      <path d="M0 ${cellSize * 0.75} L${cellSize / 2} ${cellSize * 0.25} L${cellSize} ${cellSize * 0.75}" stroke="#fff" stroke-width="1" fill="none" opacity="0.20"/>`,
    `    </pattern>`,
    `    <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">`,
    `      <stop offset="0%" stop-color="#000" stop-opacity="0.25"/>`,
    `      <stop offset="50%" stop-color="#000" stop-opacity="0.08"/>`,
    `      <stop offset="100%" stop-color="#000" stop-opacity="0.18"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="${w}" height="${h}" fill="url(#chevron)"/>`,
    `  <rect width="${w}" height="${h}" fill="url(#depth)"/>`,
    `</svg>`,
  ].join('');
};

const buildHexagonsSvg = (w: number, h: number, _subtitleLabel: string): string => {
  const size = 24;
  const hexH = size * Math.sqrt(3);
  const hexPath = [
    `M${size} 0`,
    `L${size * 2} ${hexH / 2}`,
    `L${size * 2} ${hexH * 1.5}`,
    `L${size} ${hexH * 2}`,
    `L0 ${hexH * 1.5}`,
    `L0 ${hexH / 2}`,
    'Z',
  ].join(' ');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`,
    `  <defs>`,
    `    <pattern id="hex" width="${size * 3}" height="${Math.round(hexH * 2)}" patternUnits="userSpaceOnUse">`,
    `      <path d="${hexPath}" stroke="#fff" stroke-width="0.7" fill="none" opacity="0.18" transform="translate(${size / 2}, 0)"/>`,
    `    </pattern>`,
    `    <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">`,
    `      <stop offset="0%" stop-color="#000" stop-opacity="0.22"/>`,
    `      <stop offset="50%" stop-color="#000" stop-opacity="0.06"/>`,
    `      <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="${w}" height="${h}" fill="url(#hex)"/>`,
    `  <rect width="${w}" height="${h}" fill="url(#depth)"/>`,
    `</svg>`,
  ].join('');
};

const buildDiagonalLinesSvg = (w: number, h: number, _subtitleLabel: string): string => {
  const spacing = 16;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`,
    `  <defs>`,
    `    <pattern id="diag" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`,
    `      <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="#fff" stroke-width="0.8" opacity="0.20"/>`,
    `    </pattern>`,
    `    <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">`,
    `      <stop offset="0%" stop-color="#000" stop-opacity="0.23"/>`,
    `      <stop offset="45%" stop-color="#000" stop-opacity="0.07"/>`,
    `      <stop offset="100%" stop-color="#000" stop-opacity="0.16"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="${w}" height="${h}" fill="url(#diag)"/>`,
    `  <rect width="${w}" height="${h}" fill="url(#depth)"/>`,
    `</svg>`,
  ].join('');
};

const SIDEBAR_PATTERN_BUILDERS: Record<SidebarPattern, (w: number, h: number, label: string) => string> = {
  chevrons: buildChevronsSvg,
  hexagons: buildHexagonsSvg,
  diagonal_lines: buildDiagonalLinesSvg,
};

// ─── Background principal ───────────────────────────────────────────────────

const buildLandscapeBackground = (input: ResolvedExportCertificatesPdfInput) => (
  _currentPage: number,
  pageSize: { width: number; height: number },
): Content => {
  const sidebarWidth = 140;
  const subtitleLabel = CERTIFICATE_LAYOUT_SUBTITLE_BY_TYPE[input.certificateType];
  const pattern = input.sidebarPattern || 'chevrons';
  const patternSvg = SIDEBAR_PATTERN_BUILDERS[pattern](
    sidebarWidth,
    pageSize.height,
    subtitleLabel,
  );
  const hasFrameImage = Boolean(input.certificateFrameBase64?.trim());

  const layers: Content[] = [
    {
      canvas: [
        // Fundo branco sólido geral
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: pageSize.width,
          h: pageSize.height,
          color: '#F8FAFC',
        },
        // Faixa Lateral — cor sólida da instituição
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: sidebarWidth,
          h: pageSize.height,
          color: input.themeColor,
        },
      ],
    },
  ];

  if (hasFrameImage) {
    layers.push({
      image: input.certificateFrameBase64 as string,
      cover: {
        width: sidebarWidth,
        height: pageSize.height,
        align: 'center',
        valign: 'middle',
      },
      absolutePosition: { x: 0, y: 0 },
    } as unknown as Content);
  } else {
    layers.push({
      svg: patternSvg,
      absolutePosition: { x: 0, y: 0 },
    });
  }

  return layers;
};

const buildHeader = (
  input: ResolvedExportCertificatesPdfInput,
  verificationSealContext?: Content
): Content => {
  const subtitleLabel = CERTIFICATE_LAYOUT_SUBTITLE_BY_TYPE[input.certificateType];

  return {
    stack: [
      {
        columns: [
          // Logo da escola ao lado do título
          ...(input.schoolLogoBase64
            ? [
              {
                width: 84,
                image: input.schoolLogoBase64,
                fit: [78, 78] as [number, number],
                margin: [0, 0, 14, 0] as [number, number, number, number],
              },
            ]
            : []),
          {
            width: '*',
            stack: [
              {
                text: 'CERTIFICADO DE',
                fontSize: 24,
                color: input.themeColor,
                margin: [0, 0, 0, 4]
              },
              {
                text: subtitleLabel,
                fontSize: 32,
                bold: true,
                color: input.themeColor,
                margin: [0, 0, 0, 24]
              }
            ]
          },
          ...(verificationSealContext
            ? [
              {
                width: 'auto',
                stack: [verificationSealContext],
                alignment: 'right' as const,
              } as Content,
            ]
            : [])
        ]
      }
    ],
    margin: [0, 0, 0, 8]
  };
};

const buildVerificationSeal = async (
  input: ResolvedExportCertificatesPdfInput,
  student: CertificateExportStudentSnapshot,
  issuedLine: string,
): Promise<Content> => {
  const verificationCode = input.verificationCodesByStudentId?.[student.id]?.trim();
  const verificationUrl = resolveVerificationUrl(input, verificationCode);
  const qrDataUrl = verificationUrl ? await createQrDataUrl(verificationUrl) : null;

  return {
    width: 120,
    stack: [
      {
        text: issuedLine,
        fontSize: 7,
        color: '#94A3B8',
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      qrDataUrl
        ? {
          image: qrDataUrl,
          width: 70,
          alignment: 'center',
          margin: [0, 0, 0, 4],
        }
        : {
          canvas: [
            {
              type: 'rect',
              x: 25,
              y: 0,
              w: 70,
              h: 70,
              lineColor: input.themeColor,
              lineWidth: 1,
            },
          ],
          margin: [0, 0, 0, 4],
        },
      {
        text: verificationCode || 'Código indisponível',
        fontSize: 7,
        color: '#94A3B8',
        alignment: 'center',
        margin: [0, 0, 0, 1],
      },
      {
        text: verificationUrl ? 'Validação por QR' : 'Validação indisponível',
        fontSize: 7,
        color: '#CBD5E1',
        alignment: 'center',
      },
    ],
  };
};

const assertVerificationCodesForExport = (
  input: ResolvedExportCertificatesPdfInput,
): void => {
  const verificationMap = input.verificationCodesByStudentId || {};
  const missing = input.students
    .filter((student) => !verificationMap[student.id]?.trim())
    .map((student) => student.name);

  if (missing.length === 0) return;

  const sampleName = missing[0] || 'aluno';
  throw new Error(
    `Código de verificação ausente para ${missing.length} aluno(s). Exemplo: ${sampleName}. Reabra e salve o evento para regenerar os códigos.`,
  );
};

const buildSignatureColumn = ({
  displayName,
  subtitle,
  signatureMode,
  imageDataUrl,
}: {
  displayName?: string;
  subtitle: string;
  signatureMode: SignatureMode;
  imageDataUrl?: string | null;
}): Content => {
  const normalizedDisplayName = displayName?.trim();
  const hasDistinctName =
    Boolean(normalizedDisplayName) &&
    normalizedDisplayName?.localeCompare(subtitle, 'pt-BR', {
      sensitivity: 'base',
    }) !== 0;

  const signatureImageBlock = (imageDataUrl
    ? {
      image: imageDataUrl,
      fit: [SIGNATURE_LINE_WIDTH, 46],
      alignment: 'center' as const,
      margin: [0, 0, 0, -10],
    }
    : {
      text: signatureMode === 'physical_print' ? 'Assinar no documento impresso' : '',
      style: 'caption',
      alignment: 'center' as const,
      margin: [0, 8, 0, -2],
    }) as Content;

  return {
    stack: [
      signatureImageBlock,
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: SIGNATURE_LINE_WIDTH,
            y2: 0,
            lineWidth: 0.8,
            lineColor: '#1E293B',
          },
        ],
      },
      ...(hasDistinctName
        ? [
          {
            text: normalizedDisplayName as string,
            style: 'bodySmall',
            alignment: 'center' as const,
            margin: [0, 1, 0, 0],
          } as Content,
        ]
        : []),
      {
        text: subtitle,
        style: 'caption',
        alignment: 'center',
        margin: [0, 0, 0, 0],
      } as Content,
    ],
  };
};

const buildDirectorSignature = async (
  input: ResolvedExportCertificatesPdfInput,
): Promise<Content> => {
  const signatureMode = input.signatureMode || 'digital_cursive';
  const directorName = input.directorName?.trim();

  const directorSignatureImage =
    signatureMode === 'physical_print'
      ? null
      : input.directorSignatureBase64 ||
      (directorName ? await createDigitalSignatureDataUrl(directorName) : null);

  return buildSignatureColumn({
    displayName: directorName,
    subtitle: 'Direção',
    signatureMode,
    imageDataUrl: directorSignatureImage,
  });
};

const buildCertificateBody = async (
  student: CertificateExportStudentSnapshot,
  input: ResolvedExportCertificatesPdfInput,
): Promise<Content[]> => {
  const certificateText = getStudentCertificateText(student, input);
  const highlightBadge = studentHighlightBadge(student, input);
  const layoutProfile = resolveLayoutProfile({
    studentNameLength: student.name.trim().length,
    bodyLength: certificateText.length,
    hasHighlightBadge: Boolean(highlightBadge),
  });
  const directorSignature = await buildDirectorSignature(input);
  const teacherName = input.teacherName?.trim();
  const teacherSignatureImage =
    input.signatureMode === 'physical_print'
      ? null
      : teacherName
        ? await createDigitalSignatureDataUrl(teacherName)
        : null;
  const teacherSignature = buildSignatureColumn({
    displayName: teacherName,
    subtitle: 'Professor(a)',
    signatureMode: input.signatureMode || 'digital_cursive',
    imageDataUrl: teacherSignatureImage,
  });
  const issuedAtLabel = formatBrasiliaDate(new Date(), { dateStyle: 'long' });
  const placePrefix = [input.schoolCity?.trim(), input.schoolState?.trim()]
    .filter(Boolean)
    .join(' - ');
  const issuedLine = placePrefix ? `${placePrefix}, ${issuedAtLabel}` : `Emitido em ${issuedAtLabel}`;
  const verificationSeal = await buildVerificationSeal(input, student, issuedLine);

  return [
    buildHeader(input, verificationSeal),
    {
      text: 'Este certificado é concedido a',
      fontSize: 14,
      color: '#475569', // Slate 600
      margin: [0, 0, 0, 4],
    },
    {
      text: student.name,
      fontSize: layoutProfile.studentNameSize + 4, // Aumenta ainda mais a fonte baseada no layoutProfile
      bold: true,
      color: '#0F172A', // Slate 900 intenso para o nome
      lineHeight: 1.05,
      margin: [0, 0, 0, 16],
    },
    ...(highlightBadge ? [highlightBadge] : []),
    {
      text: certificateText,
      fontSize: layoutProfile.bodyTextSize,
      color: '#334155', // Slate 700 para leitura limpa
      alignment: 'justify',
      lineHeight: layoutProfile.bodyLineHeight + 0.1, // Texto mais arejado
      margin: [0, 0, 0, layoutProfile.bodyMarginBottom + 8],
    },
    // Opcional: Uma linha separadora super fina antes das assinaturas para criar a "base" visual
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 620, // Ocupa a largura total da base livre
          y2: 0,
          lineWidth: 1,
          lineColor: '#E2E8F0',
        },
      ],
      margin: [0, 20, 0, 20],
    },
    {
      // Rodapé linear com selo e assinaturas (Logo agora movida para a faixa esquerda)
      margin: [0, 0, 0, 0],
      columnGap: 16,
      columns: [
        { width: '*', text: '' },
        {
          width: SIGNATURE_LINE_WIDTH,
          stack: [directorSignature],
        },
        { width: '*', text: '' },
        {
          width: SIGNATURE_LINE_WIDTH,
          stack: [teacherSignature],
        },
        { width: '*', text: '' },
      ],
    },
  ];
};

const createBaseDocDefinition = (
  input: ResolvedExportCertificatesPdfInput,
  content: Content[],
): TDocumentDefinitions => ({
  pageSize: 'A4',
  pageOrientation: 'landscape',
  // Margens: [Esquerda (afastada da faixa), Cima, Direita, Baixo]
  pageMargins: [180, 50, 40, 40],
  background: buildLandscapeBackground(input),
  content,
  styles: {
    ...PDF_STYLES,
    h1: {
      ...(PDF_STYLES.h1 || {}),
      color: input.themeColor,
      fontSize: 23,
      bold: true,
      characterSpacing: 1,
    },
    h2: {
      ...(PDF_STYLES.h2 || {}),
      color: input.themeColor,
      fontSize: 14,
      bold: true,
    },
  },
  defaultStyle: {
    fontSize: 10,
  },
});

const createCertificateDocDefinition = async (
  student: CertificateExportStudentSnapshot,
  input: ResolvedExportCertificatesPdfInput,
): Promise<TDocumentDefinitions> => {
  const content = await buildCertificateBody(student, input);
  return createBaseDocDefinition(input, content);
};

const createCombinedDocDefinition = async (
  input: ResolvedExportCertificatesPdfInput,
): Promise<TDocumentDefinitions> => {
  const content: Content[] = [];

  for (let index = 0; index < input.students.length; index += 1) {
    const student = input.students[index];
    const studentContent = await buildCertificateBody(student, input);
    content.push(...studentContent);

    if (index < input.students.length - 1) {
      const lastElement = studentContent[studentContent.length - 1];
      if (lastElement && typeof lastElement === 'object' && !Array.isArray(lastElement)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lastElement as any).pageBreak = 'after';
      }
    }
  }

  return createBaseDocDefinition(input, content);
};

const createPdfBlob = async (docDefinition: TDocumentDefinitions): Promise<Blob> => {
  const pdfMake = await getPdfMake();
  const pdfDocument = pdfMake.createPdf(docDefinition);

  // pdfmake 0.3.x: getBlob() returns Promise<Blob>
  if (typeof pdfDocument.getBlob === 'function' && pdfDocument.getBlob.length === 0) {
    const blob = await pdfDocument.getBlob();
    return blob as Blob;
  }

  // Compatibilidade com pdfmake 0.1/0.2: getBlob(callback)
  return new Promise<Blob>((resolve, reject) => {
    try {
      pdfDocument.getBlob((blob: Blob) => resolve(blob));
    } catch (error) {
      reject(error);
    }
  });
};

const getStudentCertificateFileName = (
  student: CertificateExportStudentSnapshot,
  input: ResolvedExportCertificatesPdfInput,
): string => {
  const classToken = sanitizeFileNamePart(input.classData.name || 'turma', 'turma');
  const studentToken = sanitizeFileNamePart(student.name || 'aluno', 'aluno');
  const studentIdToken = sanitizeFileNamePart(student.id || 'aluno', 'aluno').slice(-8);
  const typeToken = CERTIFICATE_TOKEN_BY_TYPE[input.certificateType];
  const dateToken = getBrasiliaISODate(new Date());

  return `Certificado_${typeToken}_${classToken}_${studentToken}_${studentIdToken}_${dateToken}.pdf`;
};

const getTypeZipFileName = (input: ExportCertificatesPdfInput): string => {
  const classToken = sanitizeFileNamePart(input.classData.name || 'turma', 'turma');
  const typeToken = CERTIFICATE_TOKEN_BY_TYPE[input.certificateType];
  const dateToken = getBrasiliaISODate(new Date());
  return `Certificados_${typeToken}_${classToken}_${dateToken}.zip`;
};

const getCombinedPdfFileName = (input: ExportCertificatesPdfInput): string => {
  const classToken = sanitizeFileNamePart(input.classData.name || 'turma', 'turma');
  const typeToken = CERTIFICATE_TOKEN_BY_TYPE[input.certificateType];
  const dateToken = getBrasiliaISODate(new Date());
  return `Certificados_${typeToken}_${classToken}_${dateToken}.pdf`;
};

const resolveInput = async (
  input: ExportCertificatesPdfInput,
): Promise<ResolvedExportCertificatesPdfInput> => {
  const schoolConfig = await getSchoolConfig().catch(() => getDefaultConfig());
  const fallbackConfig = getDefaultConfig();
  const resolvedSchoolName =
    schoolConfig.schoolName?.trim() || fallbackConfig.schoolName;
  const resolvedDirectorName =
    input.directorName?.trim() || schoolConfig.directorName?.trim();

  const origin =
    getWindowBaseUrl();
  const envVerificationBase = String(
    import.meta.env.VITE_CERTIFICATE_VERIFICATION_BASE_URL || '',
  ).trim();

  return {
    ...input,
    schoolName: resolvedSchoolName,
    schoolCity: schoolConfig.city?.trim() || undefined,
    schoolState: schoolConfig.state?.trim() || undefined,
    directorName: resolvedDirectorName,
    signatureMode: input.signatureMode || 'digital_cursive',
    schoolLogoBase64: schoolConfig.logoBase64,
    certificateFrameBase64: schoolConfig.certificateFrameBase64,
    directorSignatureBase64: schoolConfig.signatureBase64,
    themeColor: normalizeThemeColor(schoolConfig.themeColor),
    verificationBaseUrl:
      input.verificationBaseUrl?.trim() ||
      envVerificationBase ||
      origin,
  };
};

export const generateCertificateFiles = async (
  input: ExportCertificatesPdfInput,
): Promise<GeneratedCertificateFile[]> => {
  if (input.students.length === 0) return [];

  const resolvedInput = await resolveInput(input);
  assertVerificationCodesForExport(resolvedInput);

  const generatedFiles: GeneratedCertificateFile[] = [];
  for (const student of resolvedInput.students) {
    const blob = await createPdfBlob(
      await createCertificateDocDefinition(student, resolvedInput),
    );

    generatedFiles.push({
      studentId: student.id,
      studentName: student.name,
      fileName: getStudentCertificateFileName(student, resolvedInput),
      blob,
    });
  }

  return generatedFiles;
};

export const generateCombinedCertificatePdf = async (
  input: ExportCertificatesPdfInput,
): Promise<{ blob: Blob; fileName: string } | null> => {
  if (input.students.length === 0) return null;

  const resolvedInput = await resolveInput(input);
  assertVerificationCodesForExport(resolvedInput);
  const docDefinition = await createCombinedDocDefinition(resolvedInput);
  const blob = await createPdfBlob(docDefinition);

  return {
    blob,
    fileName: getCombinedPdfFileName(input),
  };
};

export const downloadCertificateFiles = async (
  files: GeneratedCertificateFile[],
  options: DownloadCertificateFilesOptions = {},
): Promise<void> => {
  if (files.length === 0) return;

  if (files.length === 1 && !options.forceZip) {
    const file = files[0];
    downloadBlob(file.blob, file.fileName);
    return;
  }

  const zip = new JSZip();

  files.forEach((file) => {
    const folderPath = sanitizeFolderPath(file.folderPath);
    const filePath = folderPath ? `${folderPath}/${file.fileName}` : file.fileName;
    zip.file(filePath, file.blob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const dateToken = getBrasiliaISODate(new Date());
  downloadBlob(zipBlob, options.zipFileName || `Certificados_${dateToken}.zip`);
};

export const downloadCombinedCertificatePdf = async (
  input: ExportCertificatesPdfInput,
): Promise<void> => {
  const generated = await generateCombinedCertificatePdf(input);
  if (!generated) return;

  downloadBlob(generated.blob, generated.fileName);
};

export const exportCertificatesPdfBundle = async (
  input: ExportCertificatesPdfInput,
): Promise<void> => {
  const files = await generateCertificateFiles(input);

  await downloadCertificateFiles(files, {
    zipFileName: getTypeZipFileName(input),
  });
};

export const buildVerificationUrlForCode = (
  verificationCode: string,
  baseUrl?: string,
): string => {
  const normalizedCode = verificationCode.trim();
  if (!normalizedCode) return '';

  const origin =
    baseUrl?.trim() || getWindowBaseUrl();

  if (!origin) return '';

  const normalizedOrigin = origin.replace(/\/+$/, '');
  return `${normalizedOrigin}/certificados/verificar?codigo=${encodeURIComponent(normalizedCode)}`;
};
