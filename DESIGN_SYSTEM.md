# Acerto Disciplina Design System (v2.0)

> "Um sistema de design não é apenas um conjunto de componentes, é a linguagem com a qual comunicamos valor aos nossos usuários."

Este documento serve como a **Fonte da Verdade** para o desenvolvimento e design do **Acerto Disciplina**. Ele define os padrões visuais, comportamentais e técnicos para garantir uma experiência de usuário (UX) coesa, acessível e de alta performance.

---

## 1. Princípios Fundamentais

### 1.1. Filosofia "Clean Premium"
Nossa estética busca transmitir profissionalismo, clareza e modernidade.
- **Redução de Ruído**: Cada elemento na tela deve ter um propósito. Se não ajuda o usuário a decidir, remova.
- **Hierarquia Clara**: Tamanho, cor e posição indicam importância. O usuário nunca deve adivinhar onde clicar.
- **Micro-interações**: Hover, focus e transições suaves (200ms-300ms) trazem vida à interface ("app feel").

### 1.2. Foco Operacional vs. Estratégico
Distinguimos claramente dois modos de uso:
1.  **Operacional (Dashboard)**: "O que está acontecendo *agora*?". Foco em alertas, listas de pendências e ações rápidas.
2.  **Estratégico (Analytics)**: "Qual a tendência?". Foco em gráficos, comparações históricas e filtros densos.

---

## 2. Fundamentos Visuais (Foundations)

### 2.1. Sistema de Cores (OKLCH)
Adotamos o espaço de cor **OKLCH** para garantir consistência perceptiva e acessibilidade automática.

#### **Por que OKLCH?**
Diferente do RGB/HSL, o OKLCH separa a *Luminosidade (L)* da *Croma (C)* e *Matiz (H)*. Isso significa que mudar o tema de `Light` para `Dark` é frequentemente apenas uma inversão matemática da Luminosidade, mantendo a percepção correta das cores.

#### **Paleta Semântica (Semantic Tokens)**
Não use cores "hardcoded" (`bg-blue-500`). Use tokens semânticos que se adaptam ao tema.

| Token | Dark Mode (L C H) | Light Mode (L C H) | Função | Exemplo de Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `0.51 0.16 267` | `0.51 0.16 267` | Ação principal, Marca | Botões "Salvar", Links ativos |
| **Background** | `0.13 0.00 000` | `0.98 0.00 000` | Fundo da página | `<body>`, Fundo geral |
| **Surface (Card)** | `0.16 0.00 000` | `1.00 0.00 000` | Elementos elevados | Cards, Modais, Popovers |
| **Muted** | `0.25 0.00 000` | `0.97 0.00 000` | Fundo secundário | Itens hover, áreas desabilitadas |
| **Border** | `0.34 0.00 000` | `0.92 0.00 000` | Divisores sutis | Bordas de inputs, linhas HR |

#### **Paleta de Severidade (Severity Scale)**
Crítica para o contexto escolar. Define a urgência de ocorrências e notas.

| Nível | Cor Base | Token Tailwind | Significado | Do's & Don'ts |
| :--- | :--- | :--- | :--- | :--- |
| **Normal** | `Blue` | `info` | Informativo, sem risco. | ✅ Avisos gerais. ❌ Erros de sistema. |
| **Atenção** | `Green` | `success` | Monitoramento (Nota 6-7). | ✅ Aprovação, Ocorrência leve. ❌ Falha crítica. |
| **Grave** | `Amber` | `warning` | Risco médio (Nota <6). | ✅ Alerta de nota baixa, Ocorrência média. |
| **Crítico** | `Red` | `destructive` | Ação imediata necessária. | ✅ Reprovação, Expulsão, Erro grave. |

#### **Paleta de Dados (Data Viz)**
Sequência de cores para gráficos, otimizada para contraste em fundo claro e escuro.
1.  🔵 `chart-1`: Azul Suave
2.  🟣 `chart-2`: Indigo
3.  🌑 `chart-3`: Navy/Dark Blue
4.  🔘 `chart-4`: Slate Blue
5.  ⚪ `chart-5`: Ice Blue

---

### 2.2. Tipografia
Família tipográfica: **Inter** (ou Geist). Otimizada para UI, legível em tamanhos pequenos.

| Estilo | Tamanho (px) | Peso | Line Height | Aplicação |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 30px | Bold | 1.1 | Títulos de Dashboard, KPIs grandes |
| **H1** | 24px | Semibold | 1.2 | Títulos de Página |
| **H2** | 20px | Semibold | 1.3 | Títulos de Seção |
| **H3** | 16px | Medium | 1.4 | Títulos de Card |
| **Body** | 14px | Regular | 1.5 | Texto padrão, Tabelas |
| **Small** | 12px | Regular | 1.5 | Legendas, Metadados (Datas) |
| **Tiny** | 10px | Medium | 1.0 | Badges ultra-compactas |

---

### 2.3. Espaçamento e Layout
Utilizamos um **Grid de 4pt**. Todos os espaçamentos devem ser múltiplos de 4.

- **Paddings**:
  - `p-2` (8px): Elementos compactos.
  - `p-4` (16px): Padrão para Cards.
  - `p-6` (24px): Padrão para Containers principais.
- **Gaps**:
  - `gap-2` (8px): Entre ícone e texto.
  - `gap-4` (16px): Entre inputs de formulário.
  - `gap-6` (24px): Entre colunas do Dashboard.

---

## 3. Componentes (UI Kit)

### 3.1. Cards
O bloco de construção fundamental.
- **Padrão**: Fundo `bg-card`, Borda `border-border`, Sombra `shadow-sm`.
- **Interativo**: Se clicável, adicione `hover:shadow-md hover:border-primary/50 transition-all`.
- **Anatomia**:
  1.  Header (Título + Ação opcional)
  2.  Content (Dados)
  3.  Footer (Links secundários)

### 3.2. Badges & Tags
Indicadores visuais de estado.
- **Variante Solid**: Apenas para notificações críticas (ex: contador de erros).
- **Variante Soft/Outline**: Preferida para status (ex: `bg-green-100 text-green-700 border-green-200`). É mais leve visualmente e não compete com botões de ação.

### 3.3. Botões
- **Primary**: Ação principal da página (1 por tela, geralmente). `bg-primary text-primary-foreground`.
- **Secondary/Outline**: Ações alternativas. `border border-input hover:bg-accent`.
- **Ghost**: Ações repetitivas ou em tabelas. `hover:bg-accent hover:text-accent-foreground`.

---

## 4. Padrões de Interface (Patterns)

### 4.1. Dashboard (Bento Grid)
- Use um grid assimétrico para quebrar a monotonia.
- **Hierarquia Visual**:
  1.  **Topo/Esquerda**: Informação mais urgente (ex: Ocorrências hoje).
  2.  **Direita**: Informação de suporte (ex: Aniversariantes).
  3.  **Abaixo**: Navegação ou histórico.

### 4.2. Formulários (Dialogs vs Drawers)
- **Dialog (Modal)**: Para ações rápidas que exigem foco total e pouco input (ex: Confirmar exclusão).
- **Sheet (Drawer Lateral)**: Para formulários complexos ou edição de detalhes, mantendo o contexto da página de fundo visível.

### 4.3. Listas de Dados
- Sempre use `ScrollArea` se a lista puder crescer indefinidamente.
- Mostre "Empty States" (estados vazios) amigáveis quando não houver dados ("Nenhuma ocorrência registrada hoje" + Ícone).

### 4.4. Padrão de Filtros (Obrigatório)
Para páginas com busca/filtro (ex: **Turmas**, **Alunos**, **Certificados**), usar sempre o mesmo bloco:

1. Card de filtro com estrutura:
   - `CardHeader` com fundo suave: `bg-muted/20`, borda inferior e título curto.
   - Título fixo: **"Filtrar e Buscar"** com ícone `Search` (`h-4 w-4`).
   - `CardContent` com inputs/filtros.
2. Layout responsivo:
   - Mobile: coluna (`flex-col`), Desktop: linha (`md:flex-row`).
   - Gap padrão: `gap-4`.
3. Campo de busca:
   - Ícone dentro do input, alinhado à esquerda.
   - Classe recomendada: input com `pl-10`.
4. Selects:
   - Largura consistente: `w-full md:w-64`.
5. Ações auxiliares (ex: exportar):
   - Botão `outline` no mesmo bloco de filtros, à direita no desktop.

Objetivo: previsibilidade de UX entre módulos operacionais.

### 4.5. Padrão de Lista Operacional em Cards
Para listagens operacionais (ex: **Acompanhamentos Resolvidos** e **Certificados Emitidos**):

1. Item em card clicável com:
   - borda + `shadow-sm`
   - hover: `hover:border-primary/30 hover:bg-muted/30`
   - estrutura: marcador visual + conteúdo + ações.
2. Hierarquia de conteúdo:
   - Linha 1: título principal + badges de contexto (tipo/status/período).
   - Linha 2: metadados compactos separados por `•` (ex: turma, quantidade, data).
   - Linha 3 (opcional): descrição curta com `line-clamp-2`.
3. Ações por ícone (padrão):
   - Botões `ghost`, tamanho `h-8 w-8 p-0`.
   - Sem texto visível; usar `title` + `sr-only` para acessibilidade.
   - Ordem recomendada: abrir/editar, baixar, excluir.
4. Header da seção:
   - Título da listagem + subtítulo curto orientado à ação.

### 4.6. Segmentação de Convivência no Analytics
Para evitar distorção de métricas após introdução de novos tipos de acompanhamento:

1. **Convivência Disciplinar**:
   - Usa apenas registros `incident_type = disciplinar`.
   - Alimenta indicadores de comportamento escolar, risco e correlação acadêmica.
2. **Convivência Familiar**:
   - Usa apenas registros `incident_type = acompanhamento_familiar`.
   - Exibida em aba própria no Analytics.
3. **Regra obrigatória de produto**:
   - Nunca misturar disciplinar e familiar em KPIs analíticos principais.
   - Cada trilha possui card, ranking, tendência mensal e insights próprios.
4. **Tendência Mensal (6 meses)**:
   - Usar rótulo único por eixo (`MMM/AA`, ex.: `Fev/26`) para evitar colisão visual na virada de ano.
5. **Insights (contrato obrigatório)**:
   - Cada aba exibe **um único bloco** de insights (sem duplicação entre painel e rodapé).
   - Insights devem ser **acionáveis**: conter situação observada, impacto e ação sugerida.
   - Insights são ordenados por prioridade e deduplicados por chave semântica.
   - Métricas cosméticas (ex.: texto genérico de média por aluno sem contexto) não devem gerar insight.
6. **Dashboard - Destaques Importantes**:
   - Mostrar highlights de crescimento/queda apenas com evidência mínima:
     - pelo menos 3 pontos temporais válidos
     - variação absoluta mínima relevante
     - base mínima de estudantes/notas
   - Sem evidência suficiente, o bloco pode ficar vazio (sem mensagem fraca).

---

## 5. Acessibilidade (A11y)

1.  **Contraste**: Textos pequenos devem ter contraste mínimo de 4.5:1. O uso de tokens como `text-muted-foreground` já garante isso sobre `bg-card`.
2.  **Foco**: Nunca remova o `outline` de foco dos inputs sem fornecer uma alternativa visual clara.
3.  **Semântica**: Use headers (`h1`-`h6`) na ordem correta. Não pule níveis apenas para mudar o tamanho da fonte.

## 6. Glossário Técnico

- **Shadcn/UI**: Nossa biblioteca de componentes base. "Possuímos" o código (fica em `/components/ui`).
- **Lucide React**: Biblioteca de ícones padrão. Use `stroke-width={2}` para ícones pequenos e `{1.5}` para ícones grandes decorativos.
- **Tailwind Config**: A fonte da verdade para tokens. Se não está no `tailwind.config.ts`, não deve existir no CSS.
