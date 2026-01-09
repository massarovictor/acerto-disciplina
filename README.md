# MAVIC - Sistema de Acompanhamento Escolar

O **MAVIC** (Monitoramento, Avaliação e Visão Integrada de Classes) é um sistema completo para gestão acadêmica e disciplinar, focado em escolas técnicas e regulares.

## 🚀 Funcionalidades Principais

- **Gestão de Turmas e Alunos**:
  - Cadastro completo com suporte a importação em lote (Excel).
  - Suporte a templates de curso técnico (Disciplinas Profissionais).
  - Organização por série e ano letivo.
  
- **Notas e Frequência**:
  - Lançamento ágil de notas por aluno ou turma.
  - Controle de faltas com justificativas.
  - Cálculo automático de médias e status (Aprovado, Recuperação, Reprovado).
  
- **Gestão de Ocorrências**:
  - Registro de incidentes disciplinares com níveis de severidade.
  - Geração automática de documentos de convocação de pais.
  - Histórico comportamental do aluno.

- **Relatórios e Analytics**:
  - **Boletins Individuais**: PDF gerado automaticamente com notas, ocorrências e análise.
  - **Relatórios de Turma / Atas**: Visão consolidada para conselhos de classe.
  - **Dashboard Analytics**: Gráficos de desempenho, tendências comportamentais e identificação de alunos em risco.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, TypeScript, Vite.
- **UI**: Shadcn/ui (Tailwind CSS), Lucide Icons.
- **Dados**: Supabase (Auth & Database).
- **Visualização**: Recharts para gráficos de analytics.
- **Exportação**: PDFMake e HTML2Canvas para relatórios.

## 📦 Instalação e Execução

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/acerto-disciplina.git
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (`.env`):
```env
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

4. Execute o projeto:
```bash
npm run dev
```

## 📄 Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento.
- `npm run build`: Gera a build de produção.
- `npm run preview`: Visualiza a build geradagetLocalmente.

---
Desenvolvido para otimizar a gestão escolar e promover o sucesso do aluno.
