// PDF Chart Generation Utilities
// Generates chart images for PDF reports using Canvas API

/**
 * Gera imagem de gráfico de barras
 */
export function generateBarChartImage(
  data: { label: string; value: number }[],
  options: {
    width?: number;
    height?: number;
    maxValue?: number;
    title?: string;
  } = {}
): string {
  const { width = 600, height = 400, maxValue = 10, title = '' } = options;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(title, 20, 30);
  }

  const chartTop = title ? 50 : 20;
  const chartHeight = height - chartTop - 60;
  const chartLeft = 150;
  const chartWidth = width - chartLeft - 40;
  const barHeight = chartHeight / data.length - 10;

  data.forEach((item, index) => {
    const y = chartTop + (index * (barHeight + 10));
    const barWidth = (item.value / maxValue) * chartWidth;

    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(item.label, chartLeft - 10, y + barHeight / 2 + 4);

    // Bar color based on value
    if (item.value >= 7) {
      ctx.fillStyle = '#22c55e'; // green
    } else if (item.value >= 6) {
      ctx.fillStyle = '#eab308'; // yellow
    } else {
      ctx.fillStyle = '#ef4444'; // red
    }

    ctx.fillRect(chartLeft, y, barWidth, barHeight);

    // Value
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(item.value.toFixed(1), chartLeft + barWidth + 5, y + barHeight / 2 + 4);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera imagem de gráfico de linha
 */
export function generateLineChartImage(
  data: { label: string; value: number }[],
  options: {
    width?: number;
    height?: number;
    title?: string;
    color?: string;
  } = {}
): string {
  const { width = 600, height = 300, title = '', color = '#3b82f6' } = options;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx || data.length === 0) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(title, 20, 30);
  }

  const chartTop = title ? 50 : 20;
  const chartHeight = height - chartTop - 50;
  const chartLeft = 50;
  const chartWidth = width - chartLeft - 50;

  const values = data.map(d => d.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 10);
  const range = maxValue - minValue || 1;

  // Grid lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = chartTop + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartLeft + chartWidth, y);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartTop);
  ctx.lineTo(chartLeft, chartTop + chartHeight);
  ctx.lineTo(chartLeft + chartWidth, chartTop + chartHeight);
  ctx.stroke();

  // Line
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x = chartLeft + (index / (data.length - 1)) * chartWidth;
    const y = chartTop + chartHeight - ((point.value - minValue) / range) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Points
  ctx.fillStyle = color;
  data.forEach((point, index) => {
    const x = chartLeft + (index / (data.length - 1)) * chartWidth;
    const y = chartTop + chartHeight - ((point.value - minValue) / range) * chartHeight;
    
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(point.label, x, chartTop + chartHeight + 20);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera imagem de gráfico de pizza
 */
export function generatePieChartImage(
  data: { label: string; value: number; color: string }[],
  options: {
    width?: number;
    height?: number;
    title?: string;
  } = {}
): string {
  const { width = 400, height = 400, title = '' } = options;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
  }

  const centerX = width / 2;
  const centerY = title ? height / 2 + 20 : height / 2;
  const radius = Math.min(width, height) / 3;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2; // Start at top

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;

    // Slice
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += sliceAngle;
  });

  // Legend
  let legendY = title ? 60 : 20;
  data.forEach((item) => {
    const percentage = ((item.value / total) * 100).toFixed(0);
    
    // Color box
    ctx.fillStyle = item.color;
    ctx.fillRect(20, legendY, 15, 15);
    
    // Text
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.label}: ${item.value} (${percentage}%)`, 40, legendY + 12);
    
    legendY += 25;
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera imagem de gráfico de radar
 */
export function generateRadarChartImage(
  data: { label: string; value: number }[],
  options: {
    width?: number;
    height?: number;
    title?: string;
    maxValue?: number;
  } = {}
): string {
  const { width = 400, height = 400, title = '', maxValue = 10 } = options;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx || data.length < 3) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
  }

  const centerX = width / 2;
  const centerY = title ? height / 2 + 20 : height / 2;
  const radius = Math.min(width, height) / 3;
  const angleStep = (2 * Math.PI) / data.length;

  // Draw grid
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let level = 1; level <= 5; level++) {
    const levelRadius = (radius / 5) * level;
    ctx.beginPath();
    data.forEach((_, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const x = centerX + levelRadius * Math.cos(angle);
      const y = centerY + levelRadius * Math.sin(angle);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  // Draw axes
  data.forEach((_, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  // Draw data polygon
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((point, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const pointRadius = (point.value / maxValue) * radius;
    const x = centerX + pointRadius * Math.cos(angle);
    const y = centerY + pointRadius * Math.sin(angle);
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  data.forEach((point, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const labelRadius = radius + 30;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    
    ctx.textAlign = 'center';
    ctx.fillText(point.label, x, y);
  });

  return canvas.toDataURL('image/png');
}







