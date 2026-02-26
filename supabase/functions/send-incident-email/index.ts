import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

interface EmailPayload {
  type: 'new_incident' | 'incident_followup' | 'incident_resolved';
  incident: {
    id: string;
    date: string;
    incidentType?: 'disciplinar' | 'acompanhamento_familiar';
    description: string;
    finalSeverity: string;
    suggestedAction?: string;
  };
  className: string;
  studentNames: string[];
  teacherName?: string;
}

interface IncidentRow {
  id: string;
  owner_id: string;
  created_by: string | null;
  class_id: string;
  date: string;
  updated_at: string | null;
  status: string | null;
  incident_type: 'disciplinar' | 'acompanhamento_familiar' | null;
  description: string | null;
  final_severity: string;
  suggested_action: string | null;
  student_ids: string[] | null;
}

interface ClassRow {
  id: string;
  name: string;
  director_email: string | null;
  director_id: string | null;
}

interface StudentRow {
  id: string;
  name: string;
}

type RoleLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { role?: unknown } | null }>;
      };
    };
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEVERITY_LABELS: Record<string, string> = {
  leve: 'Leve',
  intermediaria: 'Intermediaria',
  grave: 'Grave',
  gravissima: 'Gravissima',
};

const FAMILY_ATTENTION_LABELS: Record<string, string> = {
  leve: 'Baixa',
  intermediaria: 'Media',
  grave: 'Alta',
  gravissima: 'Critica',
};

const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

function parseDateForEmail(dateStr: string): Date | null {
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateStr: string): string {
  const date = parseDateForEmail(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function normalizeAppUrl(appUrlRaw: string | undefined): string | null {
  if (!appUrlRaw) return null;
  const trimmed = appUrlRaw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function buildIncidentUrl(appUrl: string | null): string | null {
  if (!appUrl) return null;
  return `${appUrl}/acompanhamentos`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ctaTextSection(incidentUrl: string | null): string {
  if (!incidentUrl) return '';

  return `

Abrir ocorrencia: ${incidentUrl}

Se o botao nao funcionar, copie e cole este link:
${incidentUrl}`;
}

function ctaHtmlSection(incidentUrl: string | null): string {
  if (!incidentUrl) return '';

  const safeUrl = escapeHtml(incidentUrl);
  return `
  <div style="margin:20px 0;">
    <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
      Acessar MAVIC
    </a>
  </div>
  <p style="margin:0 0 6px 0;font-size:14px;color:#334155;">
    Se o botao nao funcionar, copie e cole este link:
  </p>
  <p style="margin:0;font-size:13px;word-break:break-all;">
    <a href="${safeUrl}" style="color:#0f766e;">${safeUrl}</a>
  </p>`;
}

function buildEmailContent(
  payload: EmailPayload,
  incidentUrl: string | null,
): { subject: string; text: string; html: string | null } {
  const { type, incident, className, studentNames, teacherName } = payload;
  const dateFormatted = formatDate(incident.date);
  const isFamilyIncident = incident.incidentType === 'acompanhamento_familiar';
  const severityLabel = isFamilyIncident
    ? (FAMILY_ATTENTION_LABELS[incident.finalSeverity] || incident.finalSeverity)
    : (SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity);
  const studentsText = studentNames.join(', ');
  const greeting = teacherName ? `Prezado(a) ${teacherName},` : 'Prezado(a) Professor(a),';
  const flowLabel = isFamilyIncident ? 'Acompanhamento Familiar' : 'Ocorrencia Disciplinar';

  switch (type) {
    case 'new_incident': {
      const subject = isFamilyIncident
        ? `[NOVO] Acompanhamento Familiar - ${className} - ${dateFormatted}`
        : `[NOVA] Ocorrencia - ${className} - ${dateFormatted}`;
      const text = `${greeting}

Um novo registro foi lancado para sua turma:

Data: ${dateFormatted}
Turma: ${className}
Aluno(s): ${studentsText}
Tipo: ${flowLabel}
${isFamilyIncident ? 'Nivel de atencao' : 'Gravidade'}: ${severityLabel}

Descricao:
${incident.description}

${isFamilyIncident ? 'Plano sugerido' : 'Acao sugerida'}:
${incident.suggestedAction || 'Avaliar situacao e definir acao'}${ctaTextSection(incidentUrl)}

Atenciosamente,
MAVIC - Sistema de Gestao Escolar`;
      const html = incidentUrl
        ? `
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">
  <p>${escapeHtml(greeting)}</p>
  <p>Um novo registro foi lancado para sua turma:</p>
  <ul>
    <li><strong>Data:</strong> ${escapeHtml(dateFormatted)}</li>
    <li><strong>Turma:</strong> ${escapeHtml(className)}</li>
    <li><strong>Aluno(s):</strong> ${escapeHtml(studentsText)}</li>
    <li><strong>Tipo:</strong> ${escapeHtml(flowLabel)}</li>
    <li><strong>${isFamilyIncident ? 'Nivel de atencao' : 'Gravidade'}:</strong> ${escapeHtml(severityLabel)}</li>
  </ul>
  <p><strong>Descricao:</strong><br>${escapeHtml(incident.description)}</p>
  <p><strong>${isFamilyIncident ? 'Plano sugerido' : 'Acao sugerida'}:</strong><br>${escapeHtml(
            incident.suggestedAction || 'Avaliar situacao e definir acao',
          )}</p>
  ${ctaHtmlSection(incidentUrl)}
  <p style="margin-top:20px;">Atenciosamente,<br>MAVIC - Sistema de Gestao Escolar</p>
</div>`
        : null;
      return { subject, text, html };
    }

    case 'incident_followup': {
      const subject = isFamilyIncident
        ? `[ACAO] Atendimento Familiar Iniciado - ${className}`
        : `[ACAO] Acompanhamento Iniciado - ${className}`;
      const text = `${greeting}

O acompanhamento do registro foi iniciado:

Data do registro: ${dateFormatted}
Turma: ${className}
Aluno(s): ${studentsText}
Tipo: ${flowLabel}
${isFamilyIncident ? 'Nivel de atencao' : 'Gravidade'}: ${severityLabel}

Por favor, acompanhe o caso e registre as acoes realizadas no sistema.${ctaTextSection(incidentUrl)}

Atenciosamente,
MAVIC - Sistema de Gestao Escolar`;
      const html = incidentUrl
        ? `
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">
  <p>${escapeHtml(greeting)}</p>
  <p>O acompanhamento do registro foi iniciado:</p>
  <ul>
    <li><strong>Data do registro:</strong> ${escapeHtml(dateFormatted)}</li>
    <li><strong>Turma:</strong> ${escapeHtml(className)}</li>
    <li><strong>Aluno(s):</strong> ${escapeHtml(studentsText)}</li>
    <li><strong>Tipo:</strong> ${escapeHtml(flowLabel)}</li>
    <li><strong>${isFamilyIncident ? 'Nivel de atencao' : 'Gravidade'}:</strong> ${escapeHtml(severityLabel)}</li>
  </ul>
  ${ctaHtmlSection(incidentUrl)}
  <p style="margin-top:20px;">Atenciosamente,<br>MAVIC - Sistema de Gestao Escolar</p>
</div>`
        : null;
      return { subject, text, html };
    }

    case 'incident_resolved': {
      const subject = isFamilyIncident
        ? `[OK] Acompanhamento Familiar Concluido - ${className}`
        : `[OK] Ocorrencia Resolvida - ${className}`;
      const text = `${greeting}

O registro iniciado em ${dateFormatted} foi concluido.

Turma: ${className}
Aluno(s): ${studentsText}
Tipo: ${flowLabel}
Status: Acompanhamento concluido${ctaTextSection(incidentUrl)}

Atenciosamente,
MAVIC - Sistema de Gestao Escolar`;
      const html = incidentUrl
        ? `
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">
  <p>${escapeHtml(greeting)}</p>
  <p>O registro iniciado em ${escapeHtml(dateFormatted)} foi concluido.</p>
  <ul>
    <li><strong>Turma:</strong> ${escapeHtml(className)}</li>
    <li><strong>Aluno(s):</strong> ${escapeHtml(studentsText)}</li>
    <li><strong>Tipo:</strong> ${escapeHtml(flowLabel)}</li>
    <li><strong>Status:</strong> Acompanhamento concluido</li>
  </ul>
  ${ctaHtmlSection(incidentUrl)}
  <p style="margin-top:20px;">Atenciosamente,<br>MAVIC - Sistema de Gestao Escolar</p>
</div>`
        : null;
      return { subject, text, html };
    }

    default: {
      const subject = `[INFO] Atualizacao de Ocorrencia - ${className}`;
      const text = `${greeting}

Houve uma atualizacao na ocorrencia da turma ${className}.${ctaTextSection(incidentUrl)}

Atenciosamente,
MAVIC - Sistema de Gestao Escolar`;
      const html = incidentUrl
        ? `
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;">
  <p>${escapeHtml(greeting)}</p>
  <p>Houve uma atualizacao na ocorrencia da turma <strong>${escapeHtml(className)}</strong>.</p>
  ${ctaHtmlSection(incidentUrl)}
  <p style="margin-top:20px;">Atenciosamente,<br>MAVIC - Sistema de Gestao Escolar</p>
</div>`
        : null;
      return { subject, text, html };
    }
  }
}

const resolveUserRole = async (
  adminClient: RoleLookupClient,
  userId: string,
): Promise<'admin' | 'diretor' | 'professor'> => {
  const { data: profileRow } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!profileRow) {
    return 'professor';
  }

  const role = typeof profileRow.role === 'string' ? profileRow.role : '';
  if (role === 'admin' || role === 'diretor' || role === 'professor') {
    return role;
  }
  return 'professor';
};

const isAuthorizedToNotify = (
  role: 'admin' | 'diretor' | 'professor',
  userId: string,
  userEmail: string | undefined,
  incident: IncidentRow,
  incidentClass: ClassRow | null,
): boolean => {
  if (role === 'admin') return true;

  if (role === 'diretor') {
    if (!incidentClass) return false;
    const isById = Boolean(incidentClass.director_id) && incidentClass.director_id === userId;
    const isByEmail =
      normalizeEmail(incidentClass.director_email) !== '' &&
      normalizeEmail(incidentClass.director_email) === normalizeEmail(userEmail);
    return isById || isByEmail;
  }

  return incident.created_by === userId || incident.owner_id === userId;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const smtpServer = Deno.env.get('SMTP_SERVER') || 'smtp.gmail.com';
  const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
  const smtpUsername = Deno.env.get('SMTP_USERNAME');
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');
  const fromEmail = Deno.env.get('FROM_EMAIL');
  const appUrl = normalizeAppUrl(Deno.env.get('APP_URL'));

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Ambiente Supabase nao configurado.' }, 500);
  }

  if (!smtpUsername || !smtpPassword || !fromEmail) {
    console.error('SMTP environment not configured');
    return jsonResponse({ error: 'Configuracao SMTP nao encontrada.' }, 500);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Nao autenticado.' }, 401);
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    return jsonResponse({ error: 'Nao autenticado.' }, 401);
  }

  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    console.warn('send-incident-email auth failed:', authError?.message || 'missing user');
    return jsonResponse({ error: 'Nao autenticado.' }, 401);
  }
  const authUser: { id: string; email?: string } = {
    id: authData.user.id,
    email: authData.user.email,
  };

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON invalido.' }, 400);
  }

  if (!payload.type || !payload.incident?.id) {
    return jsonResponse({ error: 'Campos obrigatorios faltando.' }, 400);
  }

  const { data: incidentData, error: incidentError } = await adminClient
    .from('incidents')
    .select(
      'id, owner_id, created_by, class_id, date, updated_at, status, incident_type, description, final_severity, suggested_action, student_ids',
    )
    .eq('id', payload.incident.id)
    .maybeSingle();
  const incidentRow = incidentData as IncidentRow | null;

  if (incidentError) {
    console.error('Failed to load incident for email:', incidentError);
    return jsonResponse({ error: 'Falha ao validar ocorrencia.' }, 500);
  }

  if (!incidentRow) {
    return jsonResponse({ error: 'Ocorrencia nao encontrada.' }, 404);
  }

  const { data: classData, error: classError } = await adminClient
    .from('classes')
    .select('id, name, director_email, director_id')
    .eq('id', incidentRow.class_id)
    .maybeSingle();
  const classRow = classData as ClassRow | null;

  if (classError) {
    console.error('Failed to load class for email:', classError);
    return jsonResponse({ error: 'Falha ao validar turma.' }, 500);
  }

  const userRole = await resolveUserRole(
    adminClient as unknown as RoleLookupClient,
    authUser.id,
  );
  const canNotify = isAuthorizedToNotify(
    userRole,
    authUser.id,
    authUser.email,
    incidentRow,
    classRow ?? null,
  );

  if (!canNotify) {
    return jsonResponse({ error: 'Nao autorizado.' }, 403);
  }

  const recipientEmail = classRow?.director_email?.trim();
  if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
    return jsonResponse({ error: 'Email do diretor de turma nao configurado.' }, 400);
  }

  const incidentStudentIds = incidentRow.student_ids ?? [];
  let studentNames: string[] = [];
  if (incidentStudentIds.length > 0) {
    const { data: studentsRows, error: studentsError } = await adminClient
      .from('students')
      .select('id, name')
      .in('id', incidentStudentIds);

    if (studentsError) {
      console.error('Failed to load students for email:', studentsError);
      return jsonResponse({ error: 'Falha ao resolver alunos da ocorrencia.' }, 500);
    }

    const studentMap = new Map((studentsRows as StudentRow[] | null)?.map((row) => [row.id, row.name]) ?? []);
    studentNames = incidentStudentIds
      .map((studentId) => studentMap.get(studentId))
      .filter((name): name is string => Boolean(name));
  }

  const effectivePayload: EmailPayload = {
    type: payload.type,
    incident: {
      id: incidentRow.id,
      date: incidentRow.date,
      incidentType: incidentRow.incident_type ?? payload.incident.incidentType,
      description: incidentRow.description ?? payload.incident.description ?? '',
      finalSeverity: incidentRow.final_severity ?? payload.incident.finalSeverity,
      suggestedAction: incidentRow.suggested_action ?? payload.incident.suggestedAction,
    },
    className: classRow?.name || payload.className,
    studentNames: studentNames.length > 0 ? studentNames : payload.studentNames,
    teacherName: payload.teacherName,
  };

  if (!appUrl) {
    console.warn('APP_URL missing - sending incident email without CTA button');
  }

  const incidentUrl = buildIncidentUrl(appUrl);
  const { subject, text, html } = buildEmailContent(effectivePayload, incidentUrl);

  const transporter = nodemailer.createTransport({
    host: smtpServer,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUsername,
      pass: smtpPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject,
      text,
      ...(html ? { html } : {}),
    });

    console.log(
      `Email sent to ${recipientEmail} - Type: ${effectivePayload.type} - ctaEnabled=${Boolean(incidentUrl)}`,
    );
    return jsonResponse({ ok: true, sent: true, ctaEnabled: Boolean(incidentUrl) });
  } catch (error) {
    console.error('SMTP Error:', error);
    return jsonResponse({ error: 'Falha ao enviar email.', details: String(error) }, 500);
  }
});
