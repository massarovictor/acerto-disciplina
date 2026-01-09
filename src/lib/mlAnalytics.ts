/**
 * Módulo de Machine Learning Simplificado
 * 
 * Implementação de algoritmos estatísticos para análise preditiva:
 * - Correlação de Pearson
 * - Regressão Linear (simples e multivariada)
 * - K-Means Clustering
 * - Detecção de Anomalias
 */

// ============================================
// TIPOS
// ============================================

export interface CorrelationResult {
  coefficient: number;      // -1 a 1
  pValue: number;           // Significância estatística
  strength: 'forte' | 'moderada' | 'fraca' | 'insignificante';
  direction: 'positiva' | 'negativa' | 'nenhuma';
}

export interface RegressionResult {
  slope: number;            // Inclinação da linha
  intercept: number;        // Intercepto Y
  rSquared: number;         // Coeficiente de determinação
  predict: (x: number) => number;
  confidence: number;       // 0-100%
}

export interface MultivariateRegressionResult {
  coefficients: number[];   // Coeficientes para cada variável
  intercept: number;
  rSquared: number;
  predict: (x: number[]) => number;
  featureImportance: { feature: string; importance: number }[];
}

export interface ClusterResult {
  clusterId: number;
  centroid: number[];
  members: number[];        // Índices dos membros
  size: number;
  characteristics: string[];
}

export interface AnomalyResult {
  index: number;
  value: number;
  zScore: number;
  isAnomaly: boolean;
  severity: 'leve' | 'moderada' | 'grave';
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function variance(arr: number[]): number {
  const std = standardDeviation(arr);
  return std * std;
}

function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = mean(x);
  const yMean = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - xMean) * (y[i] - yMean);
  }
  return sum / (x.length - 1);
}

// ============================================
// CORRELAÇÃO DE PEARSON
// ============================================

/**
 * Calcula o coeficiente de correlação de Pearson entre dois conjuntos de dados
 */
export function pearsonCorrelation(x: number[], y: number[]): CorrelationResult {
  if (x.length !== y.length || x.length < 3) {
    return {
      coefficient: 0,
      pValue: 1,
      strength: 'insignificante',
      direction: 'nenhuma',
    };
  }
  
  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);
  const xStd = standardDeviation(x);
  const yStd = standardDeviation(y);
  
  if (xStd === 0 || yStd === 0) {
    return {
      coefficient: 0,
      pValue: 1,
      strength: 'insignificante',
      direction: 'nenhuma',
    };
  }
  
  let sumXY = 0;
  for (let i = 0; i < n; i++) {
    sumXY += (x[i] - xMean) * (y[i] - yMean);
  }
  
  const r = sumXY / ((n - 1) * xStd * yStd);
  
  // Calcular p-value aproximado usando t-distribution
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  // Aproximação simplificada do p-value
  const pValue = Math.min(1, 2 * Math.exp(-0.5 * Math.abs(t) * Math.sqrt(df / (df + t * t))));
  
  // Determinar força e direção
  const absR = Math.abs(r);
  let strength: CorrelationResult['strength'];
  if (absR >= 0.7) strength = 'forte';
  else if (absR >= 0.5) strength = 'moderada';
  else if (absR >= 0.3) strength = 'fraca';
  else strength = 'insignificante';
  
  const direction: CorrelationResult['direction'] = 
    absR < 0.1 ? 'nenhuma' : r > 0 ? 'positiva' : 'negativa';
  
  return {
    coefficient: r,
    pValue,
    strength,
    direction,
  };
}

/**
 * Calcula matriz de correlação entre múltiplas variáveis
 */
export function correlationMatrix(
  data: number[][],
  labels: string[]
): { matrix: number[][]; labels: string[]; significant: [string, string, number][] } {
  const n = data.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const significant: [string, string, number][] = [];
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j > i) {
        const result = pearsonCorrelation(data[i], data[j]);
        matrix[i][j] = result.coefficient;
        matrix[j][i] = result.coefficient;
        
        if (result.strength !== 'insignificante' && result.pValue < 0.05) {
          significant.push([labels[i], labels[j], result.coefficient]);
        }
      }
    }
  }
  
  // Ordenar correlações significativas por força
  significant.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
  
  return { matrix, labels, significant };
}

// ============================================
// REGRESSÃO LINEAR
// ============================================

/**
 * Regressão linear simples (uma variável independente)
 */
export function linearRegression(x: number[], y: number[]): RegressionResult {
  if (x.length !== y.length || x.length < 2) {
    return {
      slope: 0,
      intercept: mean(y),
      rSquared: 0,
      predict: () => mean(y),
      confidence: 0,
    };
  }
  
  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);
  
  let sumXY = 0;
  let sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumXY += (x[i] - xMean) * (y[i] - yMean);
    sumXX += (x[i] - xMean) * (x[i] - xMean);
  }
  
  const slope = sumXX === 0 ? 0 : sumXY / sumXX;
  const intercept = yMean - slope * xMean;
  
  // Calcular R²
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - yMean, 2);
  }
  
  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  const confidence = Math.min(100, Math.max(0, rSquared * 100 * Math.min(1, n / 10)));
  
  return {
    slope,
    intercept,
    rSquared,
    predict: (xVal: number) => slope * xVal + intercept,
    confidence,
  };
}

/**
 * Regressão linear multivariada (múltiplas variáveis independentes)
 * Implementação simplificada usando método dos mínimos quadrados
 */
export function multivariateRegression(
  X: number[][],  // Matriz de features (cada linha = uma observação)
  y: number[],    // Valores alvo
  featureNames: string[]
): MultivariateRegressionResult {
  const n = X.length;
  const m = X[0]?.length || 0;
  
  if (n < m + 1 || n !== y.length) {
    return {
      coefficients: Array(m).fill(0),
      intercept: mean(y),
      rSquared: 0,
      predict: () => mean(y),
      featureImportance: featureNames.map(f => ({ feature: f, importance: 0 })),
    };
  }
  
  // Adicionar coluna de 1s para o intercepto
  const XWithIntercept = X.map(row => [1, ...row]);
  
  // Calcular (X'X)^-1 * X' * y usando método simplificado
  // Para simplificar, usamos regressão simples iterativa com ajuste
  
  const yMean = mean(y);
  const coefficients: number[] = [];
  let residuals = [...y];
  
  // Calcular coeficientes iterativamente
  for (let j = 0; j < m; j++) {
    const feature = X.map(row => row[j]);
    const reg = linearRegression(feature, residuals);
    coefficients.push(reg.slope);
    
    // Atualizar resíduos
    for (let i = 0; i < n; i++) {
      residuals[i] -= reg.slope * X[i][j];
    }
  }
  
  const intercept = mean(residuals);
  
  // Calcular R²
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    let predicted = intercept;
    for (let j = 0; j < m; j++) {
      predicted += coefficients[j] * X[i][j];
    }
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - yMean, 2);
  }
  
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - (ssRes / ssTot));
  
  // Calcular importância das features (baseado no valor absoluto dos coeficientes normalizados)
  const featureStds = X[0].map((_, j) => standardDeviation(X.map(row => row[j])));
  const normalizedCoefs = coefficients.map((c, j) => Math.abs(c * featureStds[j]));
  const totalImportance = normalizedCoefs.reduce((a, b) => a + b, 0) || 1;
  
  const featureImportance = featureNames.map((name, j) => ({
    feature: name,
    importance: normalizedCoefs[j] / totalImportance,
  })).sort((a, b) => b.importance - a.importance);
  
  return {
    coefficients,
    intercept,
    rSquared,
    predict: (xVals: number[]) => {
      let result = intercept;
      for (let j = 0; j < Math.min(xVals.length, coefficients.length); j++) {
        result += coefficients[j] * xVals[j];
      }
      return result;
    },
    featureImportance,
  };
}

// ============================================
// K-MEANS CLUSTERING
// ============================================

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow((a[i] || 0) - (b[i] || 0), 2);
  }
  return Math.sqrt(sum);
}

/**
 * Algoritmo K-Means para clustering
 */
export function kMeansClustering(
  data: number[][],
  k: number,
  maxIterations: number = 100
): ClusterResult[] {
  if (data.length < k || k < 1) {
    return [];
  }
  
  const n = data.length;
  const dimensions = data[0]?.length || 1;
  
  // Inicializar centroides aleatoriamente (usando primeiros k pontos)
  let centroids: number[][] = data.slice(0, k).map(row => [...row]);
  let assignments: number[] = Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Atribuir pontos ao centroide mais próximo
    const newAssignments: number[] = [];
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let minCluster = 0;
      for (let j = 0; j < k; j++) {
        const dist = euclideanDistance(data[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          minCluster = j;
        }
      }
      newAssignments.push(minCluster);
    }
    
    // Verificar convergência
    const converged = assignments.every((a, i) => a === newAssignments[i]);
    assignments = newAssignments;
    
    if (converged) break;
    
    // Recalcular centroides
    for (let j = 0; j < k; j++) {
      const members = data.filter((_, i) => assignments[i] === j);
      if (members.length > 0) {
        for (let d = 0; d < dimensions; d++) {
          centroids[j][d] = mean(members.map(m => m[d]));
        }
      }
    }
  }
  
  // Construir resultados
  const results: ClusterResult[] = [];
  for (let j = 0; j < k; j++) {
    const members = assignments
      .map((a, i) => a === j ? i : -1)
      .filter(i => i !== -1);
    
    if (members.length > 0) {
      results.push({
        clusterId: j,
        centroid: centroids[j],
        members,
        size: members.length,
        characteristics: [], // Será preenchido pelo chamador
      });
    }
  }
  
  return results;
}

/**
 * Determina o número ideal de clusters usando método do cotovelo simplificado
 */
export function findOptimalClusters(data: number[][], maxK: number = 5): number {
  if (data.length < 3) return 1;
  
  const inertias: number[] = [];
  
  for (let k = 1; k <= Math.min(maxK, data.length); k++) {
    const clusters = kMeansClustering(data, k);
    let inertia = 0;
    
    for (const cluster of clusters) {
      for (const memberIdx of cluster.members) {
        inertia += Math.pow(euclideanDistance(data[memberIdx], cluster.centroid), 2);
      }
    }
    
    inertias.push(inertia);
  }
  
  // Encontrar "cotovelo" - ponto onde a redução de inércia diminui significativamente
  let maxReduction = 0;
  let optimalK = 1;
  
  for (let i = 1; i < inertias.length; i++) {
    const reduction = (inertias[i - 1] - inertias[i]) / (inertias[0] || 1);
    if (reduction > maxReduction && reduction > 0.1) {
      maxReduction = reduction;
      optimalK = i + 1;
    }
  }
  
  return Math.min(optimalK, 4); // Limitar a 4 clusters para simplicidade
}

// ============================================
// DETECÇÃO DE ANOMALIAS
// ============================================

/**
 * Detecta anomalias usando Z-Score
 */
export function detectAnomalies(
  data: number[],
  threshold: number = 2.0
): AnomalyResult[] {
  if (data.length < 3) return [];
  
  const avg = mean(data);
  const std = standardDeviation(data);
  
  if (std === 0) return [];
  
  return data.map((value, index) => {
    const zScore = Math.abs((value - avg) / std);
    const isAnomaly = zScore > threshold;
    
    let severity: AnomalyResult['severity'];
    if (zScore > 3) severity = 'grave';
    else if (zScore > 2.5) severity = 'moderada';
    else severity = 'leve';
    
    return {
      index,
      value,
      zScore,
      isAnomaly,
      severity,
    };
  }).filter(r => r.isAnomaly);
}

/**
 * Detecta pontos de inflexão em uma série temporal
 */
export function detectInflectionPoints(
  values: number[],
  windowSize: number = 2
): { index: number; type: 'pico' | 'vale' | 'mudanca_tendencia'; value: number }[] {
  if (values.length < 3) return [];
  
  const points: { index: number; type: 'pico' | 'vale' | 'mudanca_tendencia'; value: number }[] = [];
  
  for (let i = windowSize; i < values.length - windowSize; i++) {
    const before = mean(values.slice(i - windowSize, i));
    const current = values[i];
    const after = mean(values.slice(i + 1, i + 1 + windowSize));
    
    // Detectar pico (máximo local)
    if (current > before && current > after) {
      points.push({ index: i, type: 'pico', value: current });
    }
    // Detectar vale (mínimo local)
    else if (current < before && current < after) {
      points.push({ index: i, type: 'vale', value: current });
    }
    // Detectar mudança de tendência
    else if ((before < current && after < current) || (before > current && after > current)) {
      const trend1 = current - before;
      const trend2 = after - current;
      if (Math.sign(trend1) !== Math.sign(trend2) && Math.abs(trend1) > 0.5) {
        points.push({ index: i, type: 'mudanca_tendencia', value: current });
      }
    }
  }
  
  return points;
}

// ============================================
// ANÁLISE DE TENDÊNCIAS
// ============================================

export interface TrendAnalysisResult {
  direction: 'crescente' | 'decrescente' | 'estavel' | 'irregular';
  slope: number;
  confidence: number;
  prediction: number;
  volatility: number;
  inflectionPoints: { index: number; type: string; value: number }[];
}

/**
 * Analisa tendência de uma série temporal
 */
export function analyzeTrend(values: number[]): TrendAnalysisResult {
  if (values.length < 2) {
    return {
      direction: 'estavel',
      slope: 0,
      confidence: 0,
      prediction: values[0] || 0,
      volatility: 0,
      inflectionPoints: [],
    };
  }
  
  const x = values.map((_, i) => i);
  const regression = linearRegression(x, values);
  
  // Determinar direção
  let direction: TrendAnalysisResult['direction'];
  if (regression.rSquared < 0.2) {
    direction = 'irregular';
  } else if (Math.abs(regression.slope) < 0.1) {
    direction = 'estavel';
  } else {
    direction = regression.slope > 0 ? 'crescente' : 'decrescente';
  }
  
  // Calcular volatilidade (coeficiente de variação)
  const std = standardDeviation(values);
  const avg = mean(values);
  const volatility = avg === 0 ? 0 : std / Math.abs(avg);
  
  // Detectar pontos de inflexão
  const inflectionPoints = detectInflectionPoints(values);
  
  // Predição para próximo período
  const prediction = regression.predict(values.length);
  
  return {
    direction,
    slope: regression.slope,
    confidence: regression.confidence,
    prediction: Math.max(0, Math.min(10, prediction)), // Limitar entre 0 e 10 para notas
    volatility,
    inflectionPoints,
  };
}
