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

    try {
        let accessToken: string | null = null;

        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData.session?.access_token ?? null;

        if (!accessToken) {
            const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error('Failed to refresh session before sending incident email:', refreshError);
            }
            accessToken = refreshedData.session?.access_token ?? null;
        }

        if (!accessToken) {
            return { success: false, error: 'Sessao expirada. Faca login novamente para enviar o e-mail.' };
        }

        const invokeEmail = async (token: string) =>
            supabase.functions.invoke('send-incident-email', {
                body: payload,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

        let { data, error } = await invokeEmail(accessToken);

        if (error && /401|unauthorized|nao autenticado|not authenticated/i.test(error.message || '')) {
            const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error('Failed to refresh session after 401 from send-incident-email:', refreshError);
            } else if (refreshedData.session?.access_token) {
                ({ data, error } = await invokeEmail(refreshedData.session.access_token));
            }
        }

        if (error) {
            console.error('Email function error:', error);
            return { success: false, error: error.message };
        }

        console.log('Email sent successfully:', data);
        return { success: true };
    } catch (err) {
        console.error('Failed to send email:', err);
        return { success: false, error: String(err) };
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
