import {
  buildCertificateTextPreview,
  type CertificateTextPreviewInput,
} from '../src/lib/certificateLanguage';
import { getCertificateTemplate } from '../src/lib/certificateTemplates';
import { type CertificateType } from '../src/lib/certificateTypes';

type Scenario = {
  id: string;
  category: CertificateType;
  description: string;
  input: CertificateTextPreviewInput;
  includes?: string[];
  notIncludes?: string[];
  regexIncludes?: RegExp[];
  regexNotIncludes?: RegExp[];
};

const SCHOOL_NAME = 'EEEP Professora Maria Célia Pinheiro Falcão';
const CLASS_NAME = '2024-2026 Técnico em Administração A';
const STUDENT_NAME = 'ALESSANDRA FREIRE DIÓGENES';

const baseInput = (category: CertificateType): CertificateTextPreviewInput => ({
  certificateType: category,
  schoolName: SCHOOL_NAME,
  className: CLASS_NAME,
  schoolYear: 2,
  periodLabel: '1º ao 4º bimestre de 2026',
  baseText: getCertificateTemplate(category),
  studentName: STUDENT_NAME,
});

const scenarios: Scenario[] = [
  {
    id: 'MON-01',
    category: 'monitoria',
    description: 'Monitoria com referência de área',
    input: {
      ...baseInput('monitoria'),
      referenceLabel: 'Área: Formação Técnica e Profissional',
      monitoriaMeta: {
        workloadHours: 40,
        monitoriaPeriod: 'durante o ano letivo de 2026',
        activity: 'Apoio ao Laboratório de Informática',
      },
    },
    includes: [
      'atuou como monitor(a), na área de Formação Técnica e Profissional',
      'realizando apoio ao laboratório de informática durante o ano letivo de 2026',
      'totalizando 40 horas.',
    ],
  },
  {
    id: 'MON-02',
    category: 'monitoria',
    description: 'Monitoria com referência de disciplina',
    input: {
      ...baseInput('monitoria'),
      referenceLabel: 'Disciplina: Matemática',
      monitoriaMeta: {
        workloadHours: 20,
        monitoriaPeriod: 'no período relativo a 1º bimestre de 2026',
        activity: 'Apoio Pedagógico',
      },
    },
    includes: ['atuou como monitor(a), na disciplina de Matemática'],
    regexIncludes: [/no período relativo ao\s+1º bimestre de 2026/i],
    notIncludes: ['na área de Matemática'],
  },
  {
    id: 'MON-03',
    category: 'monitoria',
    description: 'Monitoria sem referência opcional',
    input: {
      ...baseInput('monitoria'),
      monitoriaMeta: {
        workloadHours: 12,
        monitoriaPeriod: 'durante o ano letivo de 2026',
        activity: 'Monitoria de exercícios',
      },
    },
    includes: ['atuou como monitor(a), realizando monitoria de exercícios'],
    notIncludes: ['na área de', 'na disciplina de'],
  },
  {
    id: 'MON-04',
    category: 'monitoria',
    description: 'Compatibilidade legado com pontuação ruim',
    input: {
      ...baseInput('monitoria'),
      baseText:
        'Certificamos que {{aluno}}, da turma {{turma}}, atuou como monitor(a). na área de Matemática Realizando {{atividade}} {{periodoMonitoria}}, totalizando {{cargaHoraria}} horas.',
      monitoriaMeta: {
        workloadHours: 40,
        monitoriaPeriod: 'durante o ano letivo de 2026',
        activity: 'Apoio Pedagógico',
      },
    },
    includes: [
      `A ${SCHOOL_NAME} certifica que o(a) aluno(a) ${STUDENT_NAME}`,
      'atuou como monitor(a), na área de Matemática, realizando apoio pedagógico durante o ano letivo de 2026',
    ],
    notIncludes: ['. na área', ' Realizando', 'monitoriaem'],
  },
  {
    id: 'MON-05',
    category: 'monitoria',
    description: 'Monitoria legado com dois bimestres e preposição incorreta',
    input: {
      ...baseInput('monitoria'),
      baseText:
        'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, atuou como monitor(a), na área de Matemática, realizando {{atividade}} no período relativo a 1º bimestre e 2º bimestre de 2026, totalizando {{cargaHoraria}} horas.',
      monitoriaMeta: {
        workloadHours: 16,
        monitoriaPeriod: 'no período relativo a 1º bimestre e 2º bimestre de 2026',
        activity: 'Apoio Pedagógico',
      },
    },
    includes: ['no período relativo aos 1º e 2º bimestres de 2026'],
    notIncludes: ['no período relativo a 1º bimestre e 2º bimestre'],
  },
  {
    id: 'DES-01',
    category: 'destaque',
    description: 'Destaque anual com linguagem natural',
    input: {
      ...baseInput('destaque'),
      periodLabel: '1º ao 4º bimestre de 2026',
    },
    includes: ['pelo excelente desempenho durante o ano letivo de 2026'],
    notIncludes: ['em 1º ao 4º bimestre de 2026'],
  },
  {
    id: 'DES-02',
    category: 'destaque',
    description: 'Destaque anual legado com travessão',
    input: {
      ...baseInput('destaque'),
      periodLabel: 'Anual (1º ao 4º bimestre) — 2026',
    },
    includes: ['pelo excelente desempenho durante o ano letivo de 2026'],
  },
  {
    id: 'DES-03',
    category: 'destaque',
    description: 'Destaque bimestral com dois bimestres',
    input: {
      ...baseInput('destaque'),
      periodLabel: '1º bimestre e 2º bimestre de 2026',
    },
    includes: ['pelo excelente desempenho nos bimestres 1º e 2º de 2026'],
  },
  {
    id: 'DES-04',
    category: 'destaque',
    description: 'Destaque bimestral com um bimestre',
    input: {
      ...baseInput('destaque'),
      periodLabel: '3º bimestre de 2026',
    },
    includes: ['pelo excelente desempenho no 3º bimestre de 2026'],
  },
  {
    id: 'DES-05',
    category: 'destaque',
    description: 'Destaque com referência de disciplina',
    input: {
      ...baseInput('destaque'),
      periodLabel: '2º bimestre de 2026',
      referenceLabel: 'Disciplina: Biologia',
    },
    includes: [', na disciplina de Biologia'],
  },
  {
    id: 'DES-06',
    category: 'destaque',
    description: 'Destaque legado com lista e travessão no texto-base',
    input: {
      ...baseInput('destaque'),
      baseText:
        'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, foi reconhecido(a) pelo excelente desempenho no período de 1º Bimestre, 2º Bimestre — 2026, demonstrando compromisso exemplar com os estudos.',
    },
    includes: ['pelo excelente desempenho nos bimestres 1º e 2º de 2026'],
  },
  {
    id: 'PAR-01',
    category: 'evento_participacao',
    description: 'Participação com papel participante (sem redundância)',
    input: {
      ...baseInput('evento_participacao'),
      eventMeta: {
        eventName: 'Feira de Ciências',
        eventDate: '2026-05-15',
        workloadHours: 12,
        role: 'participante',
      },
    },
    includes: ['participou do evento "Feira de Ciências"'],
    notIncludes: ['na condição de participante'],
  },
  {
    id: 'PAR-02',
    category: 'evento_participacao',
    description: 'Participação com papel livre',
    input: {
      ...baseInput('evento_participacao'),
      eventMeta: {
        eventName: 'Semana de Tecnologia',
        eventDate: '2026-09-10',
        workloadHours: 8,
        role: 'ouvinte',
      },
    },
    includes: [', na condição de ouvinte'],
  },
  {
    id: 'PAR-03',
    category: 'evento_participacao',
    description: 'Participação com papel já contextualizado',
    input: {
      ...baseInput('evento_participacao'),
      eventMeta: {
        eventName: 'Encontro Técnico',
        eventDate: '2026-04-18',
        workloadHours: 6,
        role: 'como palestrante convidado',
      },
    },
    includes: [', como palestrante convidado'],
    notIncludes: ['na condição de como palestrante convidado'],
  },
  {
    id: 'PAR-04',
    category: 'evento_participacao',
    description: 'Participação com referência de disciplina',
    input: {
      ...baseInput('evento_participacao'),
      referenceLabel: 'Disciplina: Matemática',
      eventMeta: {
        eventName: 'Gincana de Números',
        eventDate: '2026-03-22',
        workloadHours: 4,
        role: 'participante',
      },
    },
    includes: [', com referência na disciplina de Matemática'],
  },
  {
    id: 'PAR-05',
    category: 'evento_participacao',
    description: 'Participação legado com expressão vínculo',
    input: {
      ...baseInput('evento_participacao'),
      baseText:
        'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, participou do evento "{{eventoNome}}", realizado em {{eventoData}}, com carga horária de {{cargaHoraria}} horas, com vínculo em Matemática.',
      eventMeta: {
        eventName: 'Mostra de Projetos',
        eventDate: '2026-06-11',
        workloadHours: 10,
        role: 'participante',
      },
    },
    includes: [', com referência em Matemática'],
    notIncludes: ['com vínculo em'],
  },
  {
    id: 'PAR-06',
    category: 'evento_participacao',
    description: 'Participação legado com referência no final da frase',
    input: {
      ...baseInput('evento_participacao'),
      baseText:
        'A {{escola}} certifica que o(a) aluno(a) {{aluno}}, da turma {{turma}}, participou do evento "{{eventoNome}}", realizado em {{eventoData}}, com carga horária de {{cargaHoraria}} horas, com referência na área de Formação Técnica e Profissional.',
      eventMeta: {
        eventName: 'ERETEC',
        eventDate: '2026-02-11',
        eventDateStart: '2026-02-11',
        eventDateEnd: '2026-02-18',
        workloadHours: 8,
        role: 'participante',
      },
    },
    includes: [
      'participou do evento "ERETEC", com referência na área de Formação Técnica e Profissional, realizado em 11/02/2026 a 18/02/2026, com carga horária de 8 horas.',
    ],
    notIncludes: [
      'com carga horária de 8 horas, com referência na área de Formação Técnica e Profissional.',
    ],
  },
  {
    id: 'ORG-01',
    category: 'evento_organizacao',
    description: 'Organização com papel comissão organizadora',
    input: {
      ...baseInput('evento_organizacao'),
      eventMeta: {
        eventName: 'Semana Cultural',
        eventDate: '2026-08-14',
        workloadHours: 24,
        role: 'comissão organizadora',
      },
    },
    notIncludes: ['como membro da comissão organizadora', 'comissão organizadora'],
  },
  {
    id: 'ORG-02',
    category: 'evento_organizacao',
    description: 'Organização com papel livre',
    input: {
      ...baseInput('evento_organizacao'),
      eventMeta: {
        eventName: 'Feira de Empreendedorismo',
        eventDate: '2026-11-05',
        workloadHours: 16,
        role: 'coordenador geral',
      },
    },
    includes: [', como coordenador geral'],
  },
  {
    id: 'ORG-03',
    category: 'evento_organizacao',
    description: 'Organização com papel já contextualizado',
    input: {
      ...baseInput('evento_organizacao'),
      eventMeta: {
        eventName: 'Hackathon Escolar',
        eventDate: '2026-07-02',
        workloadHours: 18,
        role: 'atuando como líder de equipe',
      },
    },
    includes: [', atuando como líder de equipe'],
    notIncludes: ['como atuando como líder de equipe'],
  },
  {
    id: 'ORG-04',
    category: 'evento_organizacao',
    description: 'Organização com referência de área',
    input: {
      ...baseInput('evento_organizacao'),
      referenceLabel: 'Área: Gestão',
      eventMeta: {
        eventName: 'Mostra Profissional',
        eventDate: '2026-10-20',
        workloadHours: 14,
        role: 'coordenador',
      },
    },
    includes: [', com referência na área de Gestão'],
  },
];

const globalRegexNotIncludes = [
  /\s{2,}/g,
  /,\s*,/g,
  /,\s*\./g,
  /\.\s*,/g,
  /monitoriaem/gi,
  /atuou como monitor\(a\)\.\s*na\s+(área|area|disciplina)\s+de/gi,
];

const run = () => {
  let failed = 0;

  scenarios.forEach((scenario) => {
    const text = buildCertificateTextPreview(scenario.input);
    const missing = (scenario.includes || []).filter((value) => !text.includes(value));
    const unexpected = (scenario.notIncludes || []).filter((value) =>
      text.includes(value),
    );
    const missingRegex = (scenario.regexIncludes || []).filter(
      (regex) => !regex.test(text),
    );
    const unexpectedRegex = [
      ...globalRegexNotIncludes,
      ...(scenario.regexNotIncludes || []),
    ].filter((regex) => regex.test(text));

    const hasFailure =
      missing.length > 0 ||
      unexpected.length > 0 ||
      missingRegex.length > 0 ||
      unexpectedRegex.length > 0;

    if (hasFailure) {
      failed += 1;
      console.error(`\n[FAIL] ${scenario.id} (${scenario.category}) - ${scenario.description}`);
      if (missing.length > 0) {
        console.error(`  Missing: ${missing.join(' | ')}`);
      }
      if (unexpected.length > 0) {
        console.error(`  Unexpected: ${unexpected.join(' | ')}`);
      }
      if (missingRegex.length > 0) {
        console.error(
          `  Missing regex: ${missingRegex.map((item) => item.toString()).join(' | ')}`,
        );
      }
      if (unexpectedRegex.length > 0) {
        console.error(
          `  Unexpected regex: ${unexpectedRegex.map((item) => item.toString()).join(' | ')}`,
        );
      }
      console.error(`  Output: ${text}`);
      return;
    }

    console.log(`[PASS] ${scenario.id} (${scenario.category})`);
  });

  const passed = scenarios.length - failed;
  console.log(`\nResumo: ${passed}/${scenarios.length} cenários aprovados.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run();
