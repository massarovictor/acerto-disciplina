-- ============================================
-- TRAJETÓRIA ACADÊMICA - DATABASE SETUP (v2)
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Tabela de Notas Históricas (6º ao 9º ano do Fundamental)
-- ============================================

CREATE TABLE IF NOT EXISTS historical_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_level TEXT NOT NULL DEFAULT 'fundamental', -- 'fundamental' ou 'medio'
  grade_year INTEGER NOT NULL, -- 6, 7, 8, 9 para fundamental
  subject TEXT NOT NULL,
  quarter TEXT NOT NULL, -- '1º Bimestre', '2º Bimestre', etc.
  grade DECIMAL(4,2) NOT NULL CHECK (grade >= 0 AND grade <= 10),
  school_name TEXT, -- Escola onde cursou (se transferido)
  calendar_year INTEGER NOT NULL, -- Ano calendário (ex: 2022)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir unicidade por aluno/serie/disciplina/bimestre/ano
  UNIQUE(student_id, school_level, grade_year, subject, quarter, calendar_year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historical_grades_student ON historical_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_historical_grades_year ON historical_grades(grade_year, calendar_year);

-- RLS
ALTER TABLE historical_grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON historical_grades;
CREATE POLICY "Allow all for authenticated" ON historical_grades 
  FOR ALL USING (auth.role() = 'authenticated');


-- 2. Tabela de Avaliações Externas (SAEB, SIGE, Diagnósticas, Simulados)
-- ============================================

CREATE TABLE IF NOT EXISTS external_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Tipo e identificação
  assessment_type TEXT NOT NULL, -- 'SAEB', 'SIGE', 'Diagnóstica', 'Simulado', 'Outro'
  assessment_name TEXT NOT NULL, 
  subject TEXT, -- Disciplina (opcional, algumas são gerais)
  
  -- Pontuação
  score DECIMAL(6,2) NOT NULL,
  max_score DECIMAL(6,2) NOT NULL DEFAULT 100,
  proficiency_level TEXT, -- Nível de proficiência (ex: Básico, Adequado, Proficiente)
  
  -- Posicionamento temporal explícito
  school_level TEXT NOT NULL, -- 'fundamental' ou 'medio'
  grade_year INTEGER NOT NULL, -- 6-9 ou 1-3
  quarter TEXT, -- '1º Bimestre', etc (opcional se for anual)
  
  applied_date DATE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_external_assessments_student ON external_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_external_assessments_pos ON external_assessments(school_level, grade_year);

-- RLS
ALTER TABLE external_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON external_assessments;
CREATE POLICY "Allow all for authenticated" ON external_assessments 
  FOR ALL USING (auth.role() = 'authenticated');
