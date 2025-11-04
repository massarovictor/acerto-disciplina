import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportSlideAsPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  } catch (error) {
    console.error('Error exporting PDF:', error);
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
