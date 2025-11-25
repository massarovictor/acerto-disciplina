// Advanced Mathematical Calculations for Reports

/**
 * Calcula a média aritmética de um conjunto de valores
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calcula a mediana de um conjunto de valores
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

/**
 * Calcula o desvio padrão de um conjunto de valores
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  
  return Math.sqrt(variance);
}

/**
 * Calcula os quartis Q1, Q2 (mediana), Q3 de um conjunto de valores
 */
export function calculateQuartiles(values: number[]): { q1: number; q2: number; q3: number } {
  if (values.length === 0) return { q1: 0, q2: 0, q3: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const q2 = calculateMedian(sorted);
  
  const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const upperHalf = sorted.slice(Math.ceil(sorted.length / 2));
  
  const q1 = calculateMedian(lowerHalf);
  const q3 = calculateMedian(upperHalf);
  
  return { q1, q2, q3 };
}

/**
 * Calcula a tendência linear usando regressão simples
 */
export function calculateTrend(
  data: { x: number; y: number }[]
): {
  direction: 'up' | 'down' | 'stable';
  slope: number;
  intercept: number;
  rSquared: number;
} {
  if (data.length < 2) {
    return { direction: 'stable', slope: 0, intercept: 0, rSquared: 0 };
  }

  const n = data.length;
  const sumX = data.reduce((sum, point) => sum + point.x, 0);
  const sumY = data.reduce((sum, point) => sum + point.y, 0);
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);
  const sumYY = data.reduce((sum, point) => sum + point.y * point.y, 0);

  // Calcular slope (coeficiente angular)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calcular intercept (coeficiente linear)
  const intercept = (sumY - slope * sumX) / n;

  // Calcular R² (coeficiente de determinação)
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, point) => {
    const predicted = slope * point.x + intercept;
    return sum + Math.pow(point.y - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  // Determinar direção
  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(slope) < 0.1) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return { direction, slope, intercept, rSquared };
}

/**
 * Calcula a correlação de Pearson entre dois conjuntos de dados
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calcula o percentil de um valor no conjunto
 */
export function calculatePercentile(values: number[], value: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const countBelow = sorted.filter(v => v < value).length;

  return (countBelow / values.length) * 100;
}

/**
 * Calcula o coeficiente de variação (CV)
 */
export function calculateVariationCoefficient(values: number[]): number {
  const mean = calculateMean(values);
  if (mean === 0) return 0;

  const stdDev = calculateStandardDeviation(values);
  return (stdDev / mean) * 100;
}

/**
 * Calcula estatísticas resumidas de um conjunto de valores
 */
export function calculateSummaryStatistics(values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  q1: number;
  q3: number;
} {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0, q1: 0, q3: 0 };
  }

  const quartiles = calculateQuartiles(values);

  return {
    mean: calculateMean(values),
    median: quartiles.q2,
    stdDev: calculateStandardDeviation(values),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
    q1: quartiles.q1,
    q3: quartiles.q3,
  };
}







