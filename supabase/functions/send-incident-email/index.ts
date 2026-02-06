// Supabase Edge Function para enviar emails via Gmail SMTP
// Usa nodemailer via npm: import

import nodemailer from "npm:nodemailer@6.9.16";

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
        description: string;
        finalSeverity: string;
        suggestedAction?: string;
    };
    className: string;
    studentNames: string[];
    teacherEmail: string;
    teacherName?: string;
}

const SEVERITY_LABELS: Record<string, string> = {
    'leve': 'Leve',
    'intermediaria': 'Intermediária',
    'grave': 'Grave',
    'gravissima': 'Gravíssima',
};

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function buildEmailContent(payload: EmailPayload): { subject: string; body: string } {
    const { type, incident, className, studentNames, teacherName } = payload;
    const dateFormatted = formatDate(incident.date);
    const severityLabel = SEVERITY_LABELS[incident.finalSeverity] || incident.finalSeverity;
    const studentsText = studentNames.join(', ');
    const greeting = teacherName ? `Prezado(a) ${teacherName},` : 'Prezado(a) Professor(a),';

    switch (type) {
        case 'new_incident':
            return {
                subject: `[NOVA] Ocorrência - ${className} - ${dateFormatted}`,
                body: `${greeting}

Uma nova ocorrência foi registrada para sua turma:

📅 Data: ${dateFormatted}
📚 Turma: ${className}
👤 Aluno(s): ${studentsText}
⚠️ Gravidade: ${severityLabel}

📝 Descrição:
${incident.description}

🎯 Ação Sugerida:
${incident.suggestedAction || 'Avaliar situação e definir ação'}

Por favor, acesse o sistema para iniciar o acompanhamento.

Atenciosamente,
MAVIC - Sistema de Gestão Escolar`,
            };

        case 'incident_followup':
            return {
                subject: `[AÇÃO] Acompanhamento Iniciado - ${className}`,
                body: `${greeting}

O acompanhamento da ocorrência foi iniciado:

📅 Data da Ocorrência: ${dateFormatted}
📚 Turma: ${className}
👤 Aluno(s): ${studentsText}
⚠️ Gravidade: ${severityLabel}

Por favor, acompanhe o caso e registre as ações realizadas no sistema.

Atenciosamente,
MAVIC - Sistema de Gestão Escolar`,
            };

        case 'incident_resolved':
            return {
                subject: `[OK] Ocorrência Resolvida - ${className}`,
                body: `${greeting}

A ocorrência registrada em ${dateFormatted} foi RESOLVIDA.

📚 Turma: ${className}
👤 Aluno(s): ${studentsText}
✅ Status: Acompanhamento Concluído

Atenciosamente,
MAVIC - Sistema de Gestão Escolar`,
            };

        default:
            return {
                subject: `[INFO] Atualização de Ocorrência - ${className}`,
                body: `${greeting}

Houve uma atualização na ocorrência da turma ${className}.

Por favor, acesse o sistema para mais detalhes.

Atenciosamente,
MAVIC - Sistema de Gestão Escolar`,
            };
    }
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Método não permitido.' }, 405);
    }

    // Get SMTP config from environment (secrets)
    const smtpServer = Deno.env.get('SMTP_SERVER') || 'smtp.gmail.com';
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUsername = Deno.env.get('SMTP_USERNAME');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const fromEmail = Deno.env.get('FROM_EMAIL');

    if (!smtpUsername || !smtpPassword || !fromEmail) {
        console.error('SMTP environment not configured');
        return jsonResponse({ error: 'Configuração SMTP não encontrada.' }, 500);
    }

    // Parse payload
    let payload: EmailPayload;
    try {
        payload = await req.json();
    } catch {
        return jsonResponse({ error: 'JSON inválido.' }, 400);
    }

    // Validate required fields
    if (!payload.teacherEmail || !payload.type || !payload.incident) {
        return jsonResponse({ error: 'Campos obrigatórios faltando.' }, 400);
    }

    // Build email content
    const { subject, body } = buildEmailContent(payload);

    // Create transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: smtpPort,
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUsername,
            pass: smtpPassword,
        },
    });

    // Send email
    try {
        await transporter.sendMail({
            from: fromEmail,
            to: payload.teacherEmail,
            subject: subject,
            text: body,
        });

        console.log(`Email sent to ${payload.teacherEmail} - Type: ${payload.type}`);
        return jsonResponse({ ok: true, sent: true });
    } catch (error) {
        console.error('SMTP Error:', error);
        return jsonResponse({ error: 'Falha ao enviar email.', details: String(error) }, 500);
    }
});
