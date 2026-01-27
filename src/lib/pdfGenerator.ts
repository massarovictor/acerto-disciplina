/**
 * Motor de Geração de PDF com pdfmake
 * 
 * Sistema unificado para criação de relatórios profissionais
 * com suporte a tabelas complexas, estilos consistentes e layout avançado
 */

import type { TDocumentDefinitions, Content, StyleDictionary, TableCell, ContentTable, ContentText, ContentColumns } from 'pdfmake/interfaces';
import { getSchoolConfig, SchoolConfig, getDefaultConfig } from './schoolConfig';

// pdfMake será carregado dinamicamente
let pdfMakeInstance: any = null;

// Função exportada para uso em outros arquivos
export async function getPdfMake() {
  if (pdfMakeInstance) return pdfMakeInstance;

  try {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

    pdfMakeInstance = pdfMakeModule.default || pdfMakeModule;

    // Tentar diferentes formas de acesso ao vfs
    const vfs = (pdfFontsModule as any).pdfMake?.vfs
      || (pdfFontsModule as any).default?.pdfMake?.vfs
      || (pdfFontsModule as any).vfs
      || (pdfFontsModule as any).default?.vfs;

    if (vfs) {
      pdfMakeInstance.vfs = vfs;
    } else {
      console.warn('VFS Fonts não foram carregadas corretamente. O PDF pode ficar sem fontes.');
    }

    return pdfMakeInstance;
  } catch (error) {
    console.error('Erro crítico ao carregar pdfmake:', error);
    throw error;
  }
}

// ============================================
// PALETA DE CORES
// ============================================

export const PDF_COLORS = {
  primary: '#0F172A',      // Slate 900 - Títulos principais
  secondary: '#475569',    // Slate 600 - Texto secundário
  tertiary: '#94A3B8',     // Slate 400 - Texto terciário

  success: '#059669',      // Emerald 600
  warning: '#D97706',      // Amber 600
  danger: '#DC2626',       // Red 600
  info: '#2563EB',         // Blue 600

  background: {
    light: '#F8FAFC',      // Slate 50
    medium: '#E2E8F0',     // Slate 200
    dark: '#0F172A',       // Slate 900
  },

  border: '#CBD5E1',       // Slate 300

  // Cores para classificação de alunos (padronizado)
  // Crítico = Vermelho, Atenção = Amarelo, Aprovado = Verde, Excelência = Azul
  status: {
    critico: '#DC2626',        // Vermelho - 3+ disciplinas < 6
    atencao: '#F59E0B',        // Amarelo - 1-2 disciplinas < 6
    aprovado: '#10B981',       // Verde - todas >= 6, média < 8
    excelencia: '#2563EB',     // Azul - todas >= 6, média >= 8
  }
};

// ============================================
// ESTILOS BASE
// ============================================

export const PDF_STYLES: StyleDictionary = {
  // Headers
  h1: {
    fontSize: 18,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 0, 0, 8],
  },
  h2: {
    fontSize: 14,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 12, 0, 6],
  },
  h3: {
    fontSize: 12,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 8, 0, 4],
  },

  // Texto
  body: {
    fontSize: 10,
    color: PDF_COLORS.primary,
    lineHeight: 1.4,
  },
  bodySmall: {
    fontSize: 9,
    color: PDF_COLORS.secondary,
    lineHeight: 1.3,
  },
  caption: {
    fontSize: 8,
    color: PDF_COLORS.tertiary,
    italics: true,
  },

  // Tabelas
  tableHeader: {
    fontSize: 9,
    bold: true,
    color: '#FFFFFF',
    fillColor: PDF_COLORS.primary,
    alignment: 'center' as const,
  },
  tableCell: {
    fontSize: 9,
    color: PDF_COLORS.primary,
    alignment: 'center' as const,
  },
  tableCellLeft: {
    fontSize: 9,
    color: PDF_COLORS.primary,
    alignment: 'left' as const,
  },
  // V7: High Density Styles
  tableCompact: {
    fontSize: 8,
    color: PDF_COLORS.primary,
    margin: [0, 2, 0, 2],
  },
  headerGroup: {
    fontSize: 8,
    bold: true,
    color: '#FFFFFF',
    fillColor: PDF_COLORS.secondary,
    alignment: 'center' as const,
  },

  // Cards e Boxes
  cardTitle: {
    fontSize: 10,
    bold: true,
    color: PDF_COLORS.primary,
  },
  cardValue: {
    fontSize: 16,
    bold: true,
    color: PDF_COLORS.primary,
  },
  kpiValue: {
    fontSize: 24,
    bold: true,
    color: PDF_COLORS.primary,
  },
  kpiLabel: {
    fontSize: 8,
    bold: true,
    color: PDF_COLORS.secondary,
    characterSpacing: 0.5,
  },

  // Status
  statusExcelencia: {
    fontSize: 8,
    bold: true,
    color: '#FFFFFF',
    fillColor: PDF_COLORS.status.excelencia,
  },
  statusAprovado: {
    fontSize: 8,
    bold: true,
    color: '#FFFFFF',
    fillColor: PDF_COLORS.status.aprovado,
  },
  statusAtencao: {
    fontSize: 8,
    bold: true,
    color: '#FFFFFF',
    fillColor: PDF_COLORS.status.atencao,
  },
  statusCritico: {
    fontSize: 8,
    bold: true,
    color: '#FFFFFF',
    fillColor: PDF_COLORS.status.critico,
  },

  // Alertas
  alertDanger: {
    fontSize: 9,
    color: PDF_COLORS.danger,
    bold: true,
  },
  alertWarning: {
    fontSize: 9,
    color: PDF_COLORS.warning,
    bold: true,
  },
  alertSuccess: {
    fontSize: 9,
    color: PDF_COLORS.success,
    bold: true,
  },
};

// ============================================
// CLASSE PRINCIPAL DO GERADOR
// ============================================

export class PDFGenerator {
  protected config: SchoolConfig;
  protected content: Content[] = [];

  constructor(config?: SchoolConfig) {
    this.config = config || getDefaultConfig();
  }

  async loadConfig(): Promise<void> {
    if (!this.config || this.config.schoolName === 'INSTITUIÇÃO DE ENSINO') {
      this.config = await getSchoolConfig();
    }
  }

  // ============================================
  // HELPERS DE CONTEÚDO
  // ============================================

  /**
   * Cria o cabeçalho do documento com informações da escola
   */
  createHeader(title: string, subtitle?: string): Content[] {
    const header: Content[] = [];

    // Nome da escola
    header.push({
      text: this.config.schoolName,
      style: 'h1',
      margin: [0, 0, 0, 2],
    });

    // Informações da escola
    const schoolInfo: string[] = [];
    if (this.config.inep) schoolInfo.push(`INEP: ${this.config.inep}`);
    if (this.config.phone) schoolInfo.push(`Tel: ${this.config.phone}`);
    if (this.config.email) schoolInfo.push(this.config.email);

    if (schoolInfo.length > 0) {
      header.push({
        text: schoolInfo.join('  |  '),
        style: 'bodySmall',
        margin: [0, 0, 0, 2],
      });
    }

    if (this.config.address) {
      const addr = `${this.config.address}${this.config.city ? `, ${this.config.city}` : ''}${this.config.state ? ` - ${this.config.state}` : ''}`;
      header.push({
        text: addr,
        style: 'bodySmall',
        margin: [0, 0, 0, 8],
      });
    }

    // Linha divisória
    header.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: PDF_COLORS.primary,
        },
      ],
      margin: [0, 0, 0, 12],
    });

    // Título do relatório
    header.push({
      text: title,
      style: 'h1',
      alignment: 'center',
    });

    if (subtitle) {
      header.push({
        text: subtitle,
        style: 'body',
        alignment: 'center',
        margin: [0, 0, 0, 16],
      });
    }

    return header;
  }

  /**
   * Cria uma seção com título
   */
  createSection(title: string, content: Content[]): Content {
    return {
      stack: [
        { text: title, style: 'h2' },
        ...content,
      ],
      margin: [0, 8, 0, 8],
    };
  }

  /**
   * Cria uma tabela formatada
   */
  createTable(
    headers: string[],
    rows: (string | number | Content)[][],
    options: {
      widths?: (string | number)[];
      headerStyle?: string;
      cellStyle?: string;
      zebra?: boolean;
      layout?: 'lightHorizontalLines' | 'headerLineOnly' | 'noBorders' | object;
    } = {}
  ): ContentTable {
    const {
      widths = headers.map(() => '*'),
      headerStyle = 'tableHeader',
      cellStyle = 'tableCell',
      zebra = true,
      layout = 'lightHorizontalLines',
    } = options;

    const headerRow: TableCell[] = headers.map((h) => ({
      text: h,
      style: headerStyle,
      fillColor: PDF_COLORS.primary,
    }));

    const bodyRows: TableCell[][] = rows.map((row, rowIndex) =>
      row.map((cell) => {
        const isContent = typeof cell === 'object' && cell !== null;
        const baseCell: TableCell = isContent
          ? (cell as TableCell)
          : { text: String(cell), style: cellStyle };

        if (zebra && rowIndex % 2 === 0 && !isContent) {
          return { ...(baseCell as any), fillColor: PDF_COLORS.background.light };
        }
        return baseCell;
      })
    );

    return {
      table: {
        headerRows: 1,
        widths,
        body: [headerRow, ...bodyRows],
      },
      layout: typeof layout === 'string' ? layout : {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => PDF_COLORS.border,
        paddingTop: () => 4,
        paddingBottom: () => 4,
        paddingLeft: () => 6,
        paddingRight: () => 6,
      },
    };
  }

  /**
   * Cria cards de métricas em grid
   */
  createMetricCards(
    metrics: { label: string; value: string | number; color?: string }[],
    columns: number = 4
  ): Content {
    const columnWidth = 100 / columns;

    const cards: Content[] = metrics.map((metric) => ({
      stack: [
        {
          text: metric.label,
          style: 'bodySmall',
          alignment: 'center',
        },
        {
          text: String(metric.value),
          style: 'cardValue',
          alignment: 'center',
          color: metric.color || PDF_COLORS.primary,
        },
      ],
      width: `${columnWidth}%`,
      margin: [4, 4, 4, 4],
    }));

    // Agrupar em linhas
    const rows: Content[] = [];
    for (let i = 0; i < cards.length; i += columns) {
      rows.push({
        columns: cards.slice(i, i + columns),
        columnGap: 8,
      });
    }

    return {
      stack: rows,
      margin: [0, 8, 0, 8],
    };
  }

  /**
   * Cria um box de alerta/destaque
   */
  createAlertBox(
    title: string,
    content: string | string[],
    type: 'info' | 'warning' | 'danger' | 'success' = 'info'
  ): Content {
    const colors = {
      info: { bg: '#EFF6FF', border: PDF_COLORS.info, text: PDF_COLORS.info },
      warning: { bg: '#FFFBEB', border: PDF_COLORS.warning, text: PDF_COLORS.warning },
      danger: { bg: '#FEF2F2', border: PDF_COLORS.danger, text: PDF_COLORS.danger },
      success: { bg: '#F0FDF4', border: PDF_COLORS.success, text: PDF_COLORS.success },
    };

    const color = colors[type];
    const contentArray = Array.isArray(content) ? content : [content];

    return {
      table: {
        widths: [3, '*'],
        body: [[
          { text: '', fillColor: color.border },
          {
            stack: [
              { text: title, bold: true, color: color.text, fontSize: 10, margin: [0, 0, 0, 4] },
              ...contentArray.map((text) => ({ text, fontSize: 9, color: PDF_COLORS.primary })),
            ],
            fillColor: color.bg,
            margin: [8, 8, 8, 8],
          },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 8, 0, 8],
    };
  }

  /**
   * Cria badge de status
   */
  createStatusBadge(
    text: string,
    status: 'excelencia' | 'aprovado' | 'atencao' | 'critico'
  ): Content {
    return {
      text: ` ${text} `,
      style: `status${status.charAt(0).toUpperCase() + status.slice(1)}`,
      fontSize: 8,
      bold: true,
      color: '#FFFFFF',
      background: PDF_COLORS.status[status],
    };
  }

  /**
   * Cria um KPI Box estilo Dashboard (Slide)
   */
  createKPIBox(label: string, value: string | number, color: string, subtext?: string): Content {
    return {
      stack: [
        {
          table: {
            widths: ['*'],
            body: [[
              {
                stack: [
                  { text: label.toUpperCase(), style: 'kpiLabel', color: PDF_COLORS.secondary, margin: [0, 0, 0, 2] },
                  { text: String(value), style: 'kpiValue', color: color },
                  subtext ? { text: subtext, fontSize: 7, color: PDF_COLORS.tertiary, margin: [0, 2, 0, 0] } : '',
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              }
            ]]
          },
          layout: {
            hLineWidth: (i: number) => i === 0 || i === 1 ? 1 : 0,
            vLineWidth: (i: number) => i === 0 || i === 1 ? 1 : 0,
            hLineColor: () => '#E2E8F0',
            vLineColor: () => '#E2E8F0',
          }
        }
      ],
      margin: [0, 0, 0, 0]
    };
  }

  /**
   * Cria uma pílula de status horizontal
   */
  /**
   * Cria uma pílula de status horizontal
   */
  createStatusPill(text: string, color: string): Content {
    return {
      table: {
        body: [[
          {
            text: text.toUpperCase(),
            fontSize: 7,
            bold: true,
            color: '#FFFFFF',
            fillColor: color,
            margin: [6, 2, 6, 2],
          }
        ]]
      },
      layout: 'noBorders' as any,
      width: 'auto' as any,
    } as Content;
  }

  /**
   * Cria uma barra de progresso visual (V7)
   */
  createProgressBar(value: number, max: number = 10, color: string = PDF_COLORS.info): Content {
    const percentage = Math.min(Math.max(value / max, 0), 1) * 100;
    return {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 4,
          w: 50, // Largura total fixa
          h: 6,
          r: 2,
          color: '#E2E8F0', // Fundo
        },
        {
          type: 'rect',
          x: 0,
          y: 4,
          w: (percentage / 100) * 50, // Largura proporcional
          h: 6,
          r: 2,
          color: color,
        }
      ]
    };
  }

  /**
   * Cria uma linha de Dashboard com múltiplas colunas
   */
  createDashboardRow(items: Content[]): Content {
    return {
      columns: items.map(item => ({
        ...(item as any),
        width: '*'
      })),
      columnGap: 10,
      margin: [0, 0, 0, 15]
    } as Content;
  }

  /**
   * Cria lista com bullets
   */
  createBulletList(items: string[], style: string = 'body'): Content {
    return {
      ul: items,
      style,
      margin: [0, 4, 0, 4],
    };
  }

  /**
   * Cria uma linha pontilhada visual
   */
  createDottedLine(width: number = 100): Content {
    return {
      canvas: [{
        type: 'line',
        x1: 0, y1: 5,
        x2: width, y2: 5,
        lineWidth: 1,
        dash: { length: 1, space: 2 },
        lineColor: '#CBD5E1'
      }],
      width: width,
      margin: [0, 0, 0, 0]
    };
  }

  /**
   * Cria card de aluno individual
   */
  createStudentCard(
    name: string,
    status: 'excelencia' | 'aprovado' | 'atencao' | 'critico',
    metrics: { label: string; value: string }[],
    insights: string[],
    recommendation: string
  ): Content {
    const statusLabels = {
      excelencia: 'Excelência',
      aprovado: 'Aprovado',
      atencao: 'Atenção',
      critico: 'Crítico',
    };

    return {
      table: {
        widths: ['*'],
        body: [[
          {
            stack: [
              // Header do card
              {
                columns: [
                  { text: name, style: 'cardTitle', width: '*' },
                  {
                    text: ` ${statusLabels[status]} `,
                    fontSize: 8,
                    bold: true,
                    color: '#FFFFFF',
                    background: PDF_COLORS.status[status],
                    alignment: 'right',
                    width: 'auto',
                  },
                ],
                margin: [0, 0, 0, 6],
              },
              // Métricas
              {
                columns: metrics.map((m) => ({
                  stack: [
                    { text: m.label, style: 'caption', alignment: 'center' },
                    { text: m.value, style: 'body', bold: true, alignment: 'center' },
                  ],
                })),
                columnGap: 4,
                margin: [0, 0, 0, 6],
              },
              // Insights
              {
                ul: insights,
                fontSize: 8,
                color: PDF_COLORS.secondary,
                margin: [0, 0, 0, 4],
              },
              // Recomendação
              {
                text: `Recomendação: ${recommendation}`,
                fontSize: 8,
                bold: true,
                color: PDF_COLORS.info,
              },
            ],
            margin: [8, 8, 8, 8],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
      },
      margin: [0, 4, 0, 4],
    };
  }

  /**
   * Cria matriz de correlação visual
   */
  createCorrelationMatrix(
    labels: string[],
    matrix: number[][],
    title: string
  ): Content {
    const getColor = (value: number): string => {
      if (value >= 0.7) return '#059669';      // Verde forte
      if (value >= 0.5) return '#10B981';      // Verde
      if (value >= 0.3) return '#6EE7B7';      // Verde claro
      if (value >= -0.3) return '#F1F5F9';     // Cinza neutro
      if (value >= -0.5) return '#FCA5A5';     // Vermelho claro
      if (value >= -0.7) return '#EF4444';     // Vermelho
      return '#DC2626';                         // Vermelho forte
    };

    const headerRow: TableCell[] = [
      { text: '', fillColor: '#FFFFFF' },
      ...labels.map((l) => ({
        text: l.length > 8 ? l.substring(0, 8) + '...' : l,
        fontSize: 7,
        bold: true,
        alignment: 'center' as const,
        fillColor: PDF_COLORS.background.medium,
      })),
    ];

    const bodyRows: TableCell[][] = matrix.map((row, i) => [
      {
        text: labels[i].length > 10 ? labels[i].substring(0, 10) + '...' : labels[i],
        fontSize: 7,
        bold: true,
        fillColor: PDF_COLORS.background.medium,
      },
      ...row.map((value) => ({
        text: value.toFixed(2),
        fontSize: 7,
        alignment: 'center' as const,
        fillColor: getColor(value),
        color: Math.abs(value) > 0.5 ? '#FFFFFF' : PDF_COLORS.primary,
      })),
    ]);

    return {
      stack: [
        { text: title, style: 'h3' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', ...labels.map(() => '*')],
            body: [headerRow, ...bodyRows],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#FFFFFF',
            vLineColor: () => '#FFFFFF',
            paddingTop: () => 2,
            paddingBottom: () => 2,
            paddingLeft: () => 2,
            paddingRight: () => 2,
          },
        },
        {
          text: 'Legenda: Verde = correlação positiva | Vermelho = correlação negativa | Cinza = sem correlação',
          style: 'caption',
          margin: [0, 4, 0, 0],
        },
      ],
      margin: [0, 8, 0, 8],
    };
  }

  // ============================================
  // GERAÇÃO DO DOCUMENTO
  // ============================================

  /**
   * Gera e baixa o PDF
   */
  async generate(content: Content[], filename: string): Promise<void> {
    await this.loadConfig();

    const pdfMake = await getPdfMake();

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],

      styles: PDF_STYLES,
      defaultStyle: {
        fontSize: 10,
      },

      content,

      footer: (currentPage, pageCount) => ({
        columns: [
          {
            text: `Gerado por MAVIC - Sistema de Acompanhamento Escolar em ${new Date().toLocaleDateString('pt-BR')}`,
            style: 'caption',
            alignment: 'left',
            margin: [40, 0, 0, 0],
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            style: 'caption',
            alignment: 'right',
            margin: [0, 0, 40, 0],
          },
        ],
      }),
    };

    pdfMake.createPdf(docDefinition).download(filename);
  }
}

// ============================================
// INSTÂNCIA SINGLETON
// ============================================

let instance: PDFGenerator | null = null;

export function getPDFGenerator(): PDFGenerator {
  if (!instance) {
    instance = new PDFGenerator();
  }
  return instance;
}

export async function createPDFGenerator(): Promise<PDFGenerator> {
  const generator = new PDFGenerator();
  await generator.loadConfig();
  return generator;
}
