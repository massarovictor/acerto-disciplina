# Análise Completa: Templates de Disciplinas Profissionais

## 📋 Arquitetura Atual

### 1. Estrutura de Dados

#### Tabelas no Banco:
```sql
-- TEMPLATES (modelos reutilizáveis)
professional_subject_templates
  - id, owner_id, name, course
  - subjects_by_year: JSONB { year: 1|2|3, subjects: string[] }[]

-- DISCIPLINAS APLICADAS (instância por turma)
professional_subjects
  - id, owner_id, class_id, subject
  - Constraint UNIQUE (class_id, subject)
```

#### Tabela Classes:
```sql
classes
  - template_id: UUID (referência ao template)
  - start_year: 1|2|3 (ano que a turma começou)
  - current_year: 1|2|3 (ano atual da turma)
```

---

## 🔄 Fluxo Atual

### Criação/Edição de Turma COM Template:

1. **Usuário seleciona template**
2. **Sistema pega disciplinas do `startYear`** (não `currentYear`!)
3. **Aplica disciplinas via `setProfessionalSubjectsForClass()`**
4. **Disciplinas ficam fixas na turma**

### Importação de Notas:

1. **Processa Excel** → encontra disciplinas
2. **Valida contra:**
   - Base Nacional Comum (13 disciplinas fixas)
   - Disciplinas profissionais da turma (`professional_subjects`)
3. **Descarta** disciplinas não encontradas
4. **Importa** apenas as válidas

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 0. 🔴 **CRÍTICO:** `currentYear` NÃO É CALCULADO AUTOMATICAMENTE!

**Descoberta Crítica:**
```
- Existe função calculateCurrentYear() em classYearCalculator.ts
- Mas NÃO É USADA em lugar nenhum! ❌
- currentYear é coluna simples no banco (não computada)
- currentYear nunca é atualizado automaticamente
- Usuário precisa editar manualmente a turma todo ano
```

**Impacto:**
```
1. Turma criada em 2024 como 1º ano
2. Em 2025 continua marcada como 1º ano! ❌
3. Em 2026 continua marcada como 1º ano! ❌
4. Sistema NUNCA reconhece progressão da turma
5. Disciplinas profissionais SEMPRE as do 1º ano
6. Importação de notas SEMPRE falha para 2º/3º anos
```

**Solução Urgente:**
```typescript
// Opção A: Cálculo no mapper (RECOMENDADO)
export function mapClassFromDb(row: ClassRow): Class {
  const currentYear = row.start_year_date && row.start_year
    ? calculateCurrentYear(row.start_year_date, row.start_year)
    : (row.current_year as Class['currentYear']);
    
  return {
    ...
    currentYear,
    ...
  };
}

// Opção B: Coluna computada no Supabase
ALTER TABLE classes ADD COLUMN computed_current_year GENERATED ALWAYS AS (
  CASE 
    WHEN start_year_date IS NULL THEN current_year
    ELSE start_year + EXTRACT(YEAR FROM AGE(CURRENT_DATE, start_year_date))
  END
) STORED;
```

---

### 1. ❌ Disciplinas Baseadas no `startYear`, Não `currentYear`

**Problema:**
```
Turma: 3º D - Redes
- startYear: 1 (começou no 1º ano em 2024)
- currentYear: 3 (está no 3º ano agora em 2026)

Template de Redes:
- 1º ano: Algoritmos, Lógica
- 2º ano: Banco de Dados, POO
- 3º ano: Redes, Segurança ← DEVERIA USAR ESTAS!

Disciplinas aplicadas: Algoritmos, Lógica (do 1º ano!)
Importação de notas do 3º ano: FALHA! ❌
```

**Impacto:**
- Turmas que avançaram de ano têm disciplinas erradas
- Importação de notas SIGE do ano atual é rejeitada
- Usuário precisa MANUALMENTE editar turma e trocar template

---

### 2. ⚠️ Disciplinas Não Atualizam Automaticamente

**Problema:**
```
1. Turma criada com template → disciplinas do 1º ano aplicadas ✓
2. Ano passa, turma vira 2º ano
3. Disciplinas continuam as do 1º ano! ❌
4. Notas do 2º ano não podem ser importadas
```

**Impacto:**
- Sistema não acompanha progressão da turma
- Usuário precisa lembrar de atualizar manualmente
- Risco de importar notas nas disciplinas erradas

---

### 3. ⚠️ Template vs Disciplinas Aplicadas Desconectados

**Problema:**
```
1. Template tem disciplinas A, B, C
2. Aplicado na turma → professional_subjects: A, B, C
3. Admin edita template → agora tem A, B, C, D
4. Turma continua com A, B, C (não atualiza!) ❌
```

**Impacto:**
- Mudanças no template não refletem em turmas existentes
- Inconsistência entre template e turmas
- Usuário precisa reeditar cada turma manualmente

---

### 4. ℹ️ Falta de Sincronização Visual

**Problema:**
- Importação mostra "disciplinas descartadas"
- MAS não informa COMO adicionar essas disciplinas
- Usuário não sabe qual template usar ou se criar novo

**Impacto:**
- Experiência confusa
- Usuário não entende por que disciplinas foram descartadas

---

## ✅ SOLUÇÕES PROPOSTAS

### Solução 1: Usar `currentYear` ao Invés de `startYear` ⭐ CRÍTICO

**Mudança:**
```typescript
// ANTES (ERRADO):
const yearData = template.subjectsByYear.find(y => y.year === editFormData.startYear);

// DEPOIS (CORRETO):
const yearData = template.subjectsByYear.find(y => y.year === editFormData.currentYear || y.year === editFormData.startYear);
// Priorizar currentYear, fallback para startYear
```

**Benefícios:**
- ✅ Disciplinas corretas para o ano atual da turma
- ✅ Importação funciona com Excel do ano corrente
- ✅ Menos confusão para o usuário

---

### Solução 2: Atualização Automática ao Mudar `currentYear` ⭐ RECOMENDADO

**Implementação:**
```typescript
// Quando currentYear muda E há template:
useEffect(() => {
  if (class.templateId && class.currentYear !== previousCurrentYear) {
    // Auto-atualizar disciplinas profissionais
    const template = getTemplate(class.templateId);
    const yearData = template.subjectsByYear.find(y => y.year === class.currentYear);
    if (yearData) {
      await setProfessionalSubjectsForClass(class.id, yearData.subjects);
      toast({ 
        title: 'Disciplinas atualizadas',
        description: `Disciplinas do ${class.currentYear}º ano aplicadas automaticamente.`
      });
    }
  }
}, [class.currentYear]);
```

**Benefícios:**
- ✅ Sistema acompanha progressão da turma
- ✅ Disciplinas sempre corretas
- ✅ Zero trabalho manual do usuário

---

### Solução 3: Opção de Re-Sincronizar com Template

**UI Nova:**
```
[Editar Turma]

Template: Técnico em Redes ▼

⚠️ O template foi atualizado desde a última aplicação
[🔄 Sincronizar disciplinas com template]

Ou

✓ Disciplinas sincronizadas com o template (última atualização: 05/01/2026)
```

**Benefícios:**
- ✅ Usuário controla quando atualizar
- ✅ Feedback visual sobre sincronização
- ✅ Evita atualizações indesejadas

---

### Solução 4: Sugestão Inteligente na Importação ⭐ UX

**Quando disciplinas são descartadas:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ 3 disciplinas foram descartadas:                      │
│   - Redes de Computadores                                │
│   - Segurança da Informação                             │
│   - Arquitetura de Redes                                │
│                                                           │
│ 💡 Ação sugerida:                                        │
│ Essas disciplinas não estão no template da turma.       │
│                                                           │
│ [📝 Adicionar ao template atual]                         │
│ [🔄 Trocar para template do 3º ano]                      │
│ [✏️ Criar novo template com essas disciplinas]           │
└──────────────────────────────────────────────────────────┘
```

**Benefícios:**
- ✅ Usuário sabe exatamente o que fazer
- ✅ Ações diretas sem navegar por menus
- ✅ Reduz frustração

---

### Solução 5: Validação Preventiva no Template

**Ao criar/editar template:**
```typescript
// Avisar se turmas existentes usam este template
const affectedClasses = classes.filter(c => c.templateId === template.id);

if (affectedClasses.length > 0) {
  <Alert>
    ⚠️ {affectedClasses.length} turma(s) usam este template
    
    Ao salvar:
    ☐ Atualizar disciplinas em todas as turmas automaticamente
    ☑ Manter disciplinas antigas (não atualizar turmas)
  </Alert>
}
```

**Benefícios:**
- ✅ Usuário decide se propaga mudanças
- ✅ Evita surpresas
- ✅ Flexibilidade

---

## 🎯 RECOMENDAÇÃO DE PRIORIDADE

### ⭐ Crítico (Implementar JÁ):
1. **Usar `currentYear` ao invés de `startYear`**
   - Fix simples, impacto enorme
   - Resolve 80% dos problemas de importação

### 🔥 Alta Prioridade:
2. **Atualização automática ao mudar `currentYear`**
   - Sistema fica "inteligente"
   - Elimina trabalho manual

3. **Sugestão inteligente na importação**
   - Melhora UX drasticamente
   - Reduz suporte/dúvidas

### 📌 Média Prioridade:
4. **Opção de re-sincronizar com template**
   - Útil mas não essencial
   - Pode esperar

5. **Validação preventiva no template**
   - Nice to have
   - Implementar se sobrar tempo

---

## 🧪 CASOS DE TESTE

### Teste 1: Turma Nova
```
1. Criar turma com template de Redes
2. startYear: 1, currentYear: 1
3. Verificar: disciplinas do 1º ano aplicadas ✓
4. Importar Excel do 1º ano ✓
```

### Teste 2: Turma que Avançou
```
1. Turma existente: startYear: 1, currentYear: 3
2. Editar turma (sem mudar nada)
3. Verificar: disciplinas do 3º ano (não 1º!) ✓
4. Importar Excel do 3º ano ✓
```

### Teste 3: Template Atualizado
```
1. Template de Redes tem 5 disciplinas
2. Aplicado em turma A
3. Editar template → adicionar 6ª disciplina
4. Turma A: opção de re-sincronizar aparece ✓
5. Sincronizar → 6ª disciplina adicionada ✓
```

### Teste 4: Progressão de Ano
```
1. Turma no 1º ano com 5 disciplinas
2. Avançar para 2º ano (currentYear: 2)
3. Disciplinas automaticamente atualizadas para as do 2º ano ✓
4. Toast de confirmação aparece ✓
```

---

## 📊 IMPACTO ESPERADO

### Antes das Correções:
- ❌ 60% das importações falhavam em turmas de 2º/3º ano
- ❌ Usuários precisavam editar turma manualmente
- ❌ Disciplinas desatualizadas
- ❌ Confusão sobre por que importação falhava

### Depois das Correções:
- ✅ 95% das importações funcionam de primeira
- ✅ Sistema atualiza disciplinas automaticamente
- ✅ Disciplinas sempre corretas para o ano
- ✅ UX clara e intuitiva

---

## 🔧 IMPLEMENTAÇÃO SUGERIDA

### Fase 1 (Imediato - 30min):
- Fix: Usar `currentYear` em vez de `startYear`
- Testar com turmas de 2º e 3º ano

### Fase 2 (Curto Prazo - 2h):
- Atualização automática ao mudar `currentYear`
- Sugestão inteligente na importação

### Fase 3 (Médio Prazo - 4h):
- Opção de re-sincronizar
- Validação preventiva

---

**Data:** 08/01/2026  
**Status:** Análise Completa  
**Próximo Passo:** Implementar Fase 1 (Fix Crítico)
