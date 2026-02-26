import { supabase } from '@/services/supabase';
import { Incident, Class, Student, IncidentType } from '@/types';

interface EmailPayload {
    type: 'new_incident' | 'incident_followup' | 'incident_resolved';
    incident: {
        id: string;
        date: string;
        incidentType: IncidentType;
        description: string;
        finalSeverity: string;
        suggestedAction?: string;
    };
    className: string;
    studentNames: string[];
    teacherName?: string;
}

const inFlightEmails = new Set<string>();

const getFunctionsErrorStatus = (error: unknown): number | null => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
    ) {
        return (error as { status: number }).status;
    }

    const maybeContext =
        typeof error === 'object' && error !== null && 'context' in error
            ? (error as { context?: Response }).context
            : undefined;

    if (!maybeContext) return null;
    return typeof maybeContext.status === 'number' ? maybeContext.status : null;
};

const isUnauthorizedError = (error: unknown): boolean => {
    const status = getFunctionsErrorStatus(error);
    if (status === 401) return true;

    const message = error instanceof Error ? error.message : String(error || '');
    return /401|unauthorized|nao autenticado|not authenticated|invalid jwt/i.test(message || '');
};

const enrichFunctionsErrorLog = async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        'body' in error
    ) {
        console.error('Email function error:', error);
        return;
    }

    const maybeContext =
        typeof error === 'object' && error !== null && 'context' in error
            ? (error as { context?: Response }).context
            : undefined;

    if (!maybeContext) {
        console.error('Email function error:', error);
        return;
    }

    let responseText = '';
    try {
        responseText = await maybeContext.clone().text();
    } catch {
        responseText = '';
    }

    console.error('Email function error:', {
        message,
        status: maybeContext.status,
        statusText: maybeContext.statusText,
        body: responseText,
    });
};

const ensureFreshAuthenticatedSession = async (): Promise<{
    ok: boolean;
    error?: string;
    accessToken?: string;
}> => {
    const userSessionError =
        'Sessao expirada ou invalida. Faca logout e login novamente para enviar o e-mail.';

    const getSessionData = async () => supabase.auth.getSession();
    const refreshSessionData = async () => supabase.auth.refreshSession();

    const { data: sessionData, error: sessionError } = await getSessionData();
    if (sessionError) {
        console.error('Failed to get auth session before sending incident email:', sessionError);
        return {
            ok: false,
            error: userSessionError,
        };
    }

    let session = sessionData.session;
    if (!session?.access_token) {
        return {
            ok: false,
            error: 'Usuario nao autenticado. Faca login para enviar o e-mail.',
        };
    }

    const expiresAtMs = (session.expires_at || 0) * 1000;
    const needsRefresh = !expiresAtMs || expiresAtMs <= Date.now() + 60_000;
    if (needsRefresh) {
        const { data: refreshedData, error: refreshError } = await refreshSessionData();
        if (refreshError || !refreshedData.session?.access_token) {
            console.error('Failed to refresh session before sending incident email:', refreshError);
            return {
                ok: false,
                error: userSessionError,
            };
        }
        session = refreshedData.session;
    }

    const validateToken = async (token: string): Promise<boolean> => {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        return !userError && Boolean(userData.user);
    };

    let accessToken = session.access_token;
    if (!(await validateToken(accessToken))) {
        const { data: refreshedData, error: refreshError } = await refreshSessionData();
        if (refreshError || !refreshedData.session?.access_token) {
            return {
                ok: false,
                error: userSessionError,
            };
        }
        accessToken = refreshedData.session.access_token;
        if (!(await validateToken(accessToken))) {
            return {
                ok: false,
                error: userSessionError,
            };
        }
    }

    return { ok: true, accessToken };
};

/**
 * Send incident notification email to class director.
 * Recipient is resolved server-side using incident/class data.
 */
export async function sendIncidentEmail(
    type: EmailPayload['type'],
    incident: Incident,
    classData: Class,
    students: Student[]
): Promise<{ success: boolean; error?: string }> {
    const involvedStudents = students.filter(s => incident.studentIds.includes(s.id));
    const studentNames = involvedStudents.map(s => s.name);

    const payload: EmailPayload = {
        type,
        incident: {
            id: incident.id,
            date: incident.date,
            incidentType: incident.incidentType ?? 'disciplinar',
            description: incident.description,
            finalSeverity: incident.finalSeverity,
            suggestedAction: incident.suggestedAction,
        },
        className: classData.name,
        studentNames,
        teacherName: undefined,
    };

    const requestKey = `${type}:${incident.id}`;
    if (inFlightEmails.has(requestKey)) {
        return { success: true };
    }

    inFlightEmails.add(requestKey);

    try {
        const sessionCheck = await ensureFreshAuthenticatedSession();
        if (!sessionCheck.ok || !sessionCheck.accessToken) {
            return { success: false, error: sessionCheck.error };
        }

        const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
        if (!anonKey) {
            return { success: false, error: 'VITE_SUPABASE_ANON_KEY nao configurada.' };
        }
        if (!supabaseUrl) {
            return { success: false, error: 'VITE_SUPABASE_URL nao configurada.' };
        }

        const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-incident-email`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: `Bearer ${sessionCheck.accessToken.trim()}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const responseBody = await response.text().catch(() => '');
            const errorLike = {
                message: 'Edge Function returned a non-2xx status code',
                status: response.status,
                statusText: response.statusText,
                body: responseBody,
            };
            await enrichFunctionsErrorLog(errorLike);
            if (isUnauthorizedError(errorLike)) {
                return {
                    success: false,
                    error: 'Sessao expirada ou invalida. Faca logout e login novamente para enviar o e-mail.',
                };
            }
            return { success: false, error: `Falha HTTP ${response.status} ao enviar e-mail.` };
        }

        const data = await response.json().catch(() => ({}));
        console.log('Email sent successfully:', data);
        return { success: true };
    } catch (err) {
        console.error('Failed to send email:', err);
        return { success: false, error: String(err) };
    } finally {
        inFlightEmails.delete(requestKey);
    }
}

/**
 * Check if a class has valid email for notifications
 */
export function classHasValidEmail(classData: Class): boolean {
    if (!classData.directorEmail) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(classData.directorEmail);
}
