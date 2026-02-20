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
    teacherEmail: string;
    teacherName?: string;
}

/**
 * Send incident notification email to class director
 */
export async function sendIncidentEmail(
    type: EmailPayload['type'],
    incident: Incident,
    classData: Class,
    students: Student[]
): Promise<{ success: boolean; error?: string }> {
    // Validate director email exists
    if (!classData.directorEmail) {
        console.warn(`Class ${classData.name} has no directorEmail configured`);
        return { success: false, error: 'Email do diretor de turma não configurado' };
    }

    // Get student names
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
        teacherEmail: classData.directorEmail,
        teacherName: undefined, // Could be fetched from profiles if directorId exists
    };

    try {
        const { data, error } = await supabase.functions.invoke('send-incident-email', {
            body: payload,
        });

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
