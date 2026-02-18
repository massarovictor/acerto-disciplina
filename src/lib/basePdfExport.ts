import jsPDF from 'jspdf';
import { getSchoolConfig, SchoolConfig, getDefaultConfig } from './schoolConfig';
import { REPORT_COLORS, REPORT_FONTS } from './reportDesignSystem';

/**
 * Motor de PDF Unificado - Base para todos os relatórios do sistema
 */

export interface PDFOptions {
  orientation?: 'portrait' | 'landscape';
  unit?: 'mm' | 'px' | 'pt';
  format?: string | number[];
}

export class BasePDFGenerator {
  protected pdf: jsPDF;
  protected y: number;
  protected margin: number = 15;
  protected pageWidth: number;
  protected pageHeight: number;
  protected contentWidth: number;
  protected pageCount: number = 1;
  protected config: SchoolConfig;

  constructor(options: PDFOptions = {}, config?: SchoolConfig) {
    this.pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: options.unit || 'mm',
      format: options.format || 'a4',
    });

    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.y = this.margin;
    // Se config não foi passado, usa default (será carregado assincronamente quando necessário)
    this.config = config || getDefaultConfig();
  }

  protected async loadConfig() {
    if (!this.config || this.config.schoolName === 'INSTITUIÇÃO DE ENSINO') {
      this.config = await getSchoolConfig();
    }
  }

  // --- Sistema de Grid ---

  /**
   * Retorna a largura de um número de colunas (baseado em 12 colunas)
   */
  protected colWidth(cols: number): number {
    return (this.contentWidth / 12) * cols;
  }

  /**
   * Retorna a posição x inicial de uma coluna
   */
  protected colX(col: number): number {
    return this.margin + (this.contentWidth / 12) * (col - 1);
  }

  // --- Gerenciamento de Páginas ---

  protected addPage() {
    this.renderFooter();
    this.pdf.addPage();
    this.pageCount++;
    this.y = this.margin;
    this.renderHeader(true); // Header simplificado em novas páginas
  }

  protected checkPageBreak(heightNeeded: number) {
    if (this.y + heightNeeded > this.pageHeight - 20) {
      this.addPage();
      return true;
    }
    return false;
  }

  // --- Utilitários de Texto e Desenho ---

  protected setFont(size: keyof typeof REPORT_FONTS.size, weight: keyof typeof REPORT_FONTS.weight = 'normal', color: string = REPORT_COLORS.text.primary) {
    const fontSize = (REPORT_FONTS.size[size] as number) || 10;
    this.pdf.setFont('helvetica', weight === 'bold' ? 'bold' : 'normal');
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(color);
    this.pdf.setLineHeightFactor(1.0);
  }

  protected drawText(text: string | string[], x: number, y: number, options: { align?: 'left' | 'center' | 'right'; maxWidth?: number } = {}) {
    try {
      this.pdf.text(text, x, y, {
        align: options.align || 'left',
        maxWidth: options.maxWidth,
      });
    } catch (e) {
      console.error('Erro ao desenhar texto no PDF:', e, text);
    }
  }

  protected drawLine(y: number, thickness: number = 0.1, color: string = REPORT_COLORS.border) {
    this.pdf.setDrawColor(color);
    this.pdf.setLineWidth(thickness);
    this.pdf.line(this.margin, y, this.pageWidth - this.margin, y);
  }

  protected drawRect(x: number, y: number, w: number, h: number, options: { fill?: string; stroke?: string; radius?: number } = {}) {
    if (options.fill) {
      this.pdf.setFillColor(options.fill);
      if (options.radius) {
        this.pdf.roundedRect(x, y, w, h, options.radius, options.radius, 'F');
      } else {
        this.pdf.rect(x, y, w, h, 'F');
      }
    }
    if (options.stroke) {
      this.pdf.setDrawColor(options.stroke);
      this.pdf.setLineWidth(0.1);
      if (options.radius) {
        this.pdf.roundedRect(x, y, w, h, options.radius, options.radius, 'S');
      } else {
        this.pdf.rect(x, y, w, h, 'S');
      }
    }
  }

  // --- Seções Fixas ---

  protected renderHeader(simplified: boolean = false) {
    // Cabeçalho compacto e profissional (preto e branco)
    
    // Nome da Escola - tamanho reduzido
    this.setFont('md', 'bold', '#000000');
    this.drawText(this.config.schoolName, this.margin, this.y + 4);
    
    if (!simplified) {
      // Info Escola - linha única compacta
      this.setFont('2xs', 'normal', '#666666');
      let infoLine = this.y + 7;
      
      const schoolDetails = [];
      if (this.config.inep) schoolDetails.push(`INEP: ${this.config.inep}`);
      if (this.config.phone) schoolDetails.push(`Tel: ${this.config.phone}`);
      if (this.config.email) schoolDetails.push(`Email: ${this.config.email}`);
      
      if (schoolDetails.length > 0) {
        this.drawText(schoolDetails.join('  |  '), this.margin, infoLine);
        infoLine += 3;
      }
      
      if (this.config.address) {
        const addr = `${this.config.address}${this.config.city ? `, ${this.config.city}` : ''}${this.config.state ? ` - ${this.config.state}` : ''}`;
        this.drawText(addr, this.margin, infoLine);
      }

      // Logo reduzido (se houver)
      if (this.config.logoBase64 && this.config.logoBase64.startsWith('data:image/')) {
        try {
          const format = this.config.logoBase64.split(';')[0].split('/')[1].toUpperCase();
          this.pdf.addImage(this.config.logoBase64, format, this.pageWidth - this.margin - 20, this.y, 20, 20);
        } catch (e) {
          console.error('Erro ao renderizar logo no PDF:', e);
        }
      }
      
      this.y += 15;
    } else {
      this.y += 8;
    }

    // Linha divisória fina
    this.drawLine(this.y, 0.2, '#000000');
    this.y += 8;
  }

  protected renderFooter() {
    const footerY = this.pageHeight - 10;
    this.drawLine(footerY - 5, 0.1, REPORT_COLORS.border);
    
    this.setFont('2xs', 'normal', REPORT_COLORS.text.tertiary);
    this.drawText(
      `Gerado por MAVIC - Sistema de Acompanhamento Escolar em ${new Date().toLocaleDateString('pt-BR')}`,
      this.margin,
      footerY
    );
    
    this.drawText(
      `Página ${this.pageCount}`,
      this.pageWidth - this.margin,
      footerY,
      { align: 'right' }
    );
  }

  protected renderSectionTitle(title: string) {
    this.checkPageBreak(15);
    
    // Linha separadora destacada antes do título
    this.y += 4;
    this.drawLine(this.y, 0.3, '#000000');
    this.y += 6;
    
    // Barra lateral preta mais espessa
    this.drawRect(this.margin, this.y, 2, 7, { fill: '#000000' });
    // Título em formato título (primeira letra maiúscula)
    const titleFormatted = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
    this.setFont('sm', 'bold', '#000000');
    this.drawText(titleFormatted, this.margin + 5, this.y + 5.5);
    
    this.y += 12;
  }

  /**
   * Renderiza um par de Label/Valor em um grid
   */
  protected renderField(label: string, value: string, x: number, y: number, width: number) {
    // Label em formato título (primeira letra maiúscula)
    const labelFormatted = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    this.setFont('xs', 'bold', '#000000');
    this.drawText(labelFormatted, x, y);
    
    this.setFont('xs', 'normal', '#000000');
    const lines = this.pdf.splitTextToSize(value || '-', width);
    this.drawText(lines, x, y + 4);
    
    return (lines.length * 5) + 2;
  }

  protected save(filename: string) {
    this.renderFooter();
    this.pdf.save(filename);
  }

  protected outputBlob(): Blob {
    this.renderFooter();
    return this.pdf.output('blob');
  }
}
