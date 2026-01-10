import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportSlideAsPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, { scale: 1, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  } catch (error) {
    console.error('Error exporting PDF:', error);
  }
};

/**
 * Sequential PDF Export to avoid browser freezing
 */
let currentPDF: jsPDF | null = null;

export const startSequentialPDF = () => {
  currentPDF = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
  });
  return currentPDF;
};

export const addSlideToPDF = async (elementId: string, isFirst: boolean) => {
  if (!currentPDF) return false;

  const element = document.getElementById(elementId);
  if (!element) return false;

  try {
    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.6); // Slightly more compression

    if (isFirst) {
      (currentPDF as any).internal.pageSize.width = canvas.width;
      (currentPDF as any).internal.pageSize.height = canvas.height;
    } else {
      currentPDF.addPage([canvas.width, canvas.height], 'landscape');
    }

    currentPDF.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
    return true;
  } catch (error) {
    console.error('Error adding slide to PDF:', error);
    return false;
  }
};

export const finishSequentialPDF = (fileName: string) => {
  if (currentPDF) {
    currentPDF.save(fileName);
    currentPDF = null;
  }
};

export const generateReportPDF = (
  title: string,
  sections: { title: string; content: string }[]
) => {
  const pdf = new jsPDF();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.text(title, 20, yPosition);
  yPosition += 15;

  // Date
  pdf.setFontSize(10);
  pdf.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    20,
    yPosition
  );
  yPosition += 20;

  // Sections
  sections.forEach((section) => {
    if (yPosition > 270) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.text(section.title, 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(section.content, 170);
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, 20, yPosition);
      yPosition += 7;
    });

    yPosition += 10;
  });

  return pdf;
};
