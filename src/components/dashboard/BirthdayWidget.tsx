import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake, PartyPopper } from 'lucide-react';
import { Student, Class } from '@/types';

interface BirthdayWidgetProps {
    students: Student[];
    classes: Class[];
}

interface BirthdayStudent {
    student: Student;
    className: string;
    birthdayDate: Date;
    isToday: boolean;
    dayLabel: string;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekBirthdays(students: Student[], classes: Class[]): BirthdayStudent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Início da semana (domingo)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Fim da semana (sábado)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const classMap = new Map(classes.map(c => [c.id, c.name]));

    const birthdays: BirthdayStudent[] = [];

    for (const student of students) {
        if (student.status !== 'active' || !student.birthDate) continue;

        const birth = new Date(student.birthDate);
        // Usar getUTCMonth/getUTCDate para evitar problema de timezone
        const birthdayThisYear = new Date(
            today.getFullYear(),
            birth.getUTCMonth(),
            birth.getUTCDate()
        );

        if (birthdayThisYear >= startOfWeek && birthdayThisYear <= endOfWeek) {
            const isToday = birthdayThisYear.toDateString() === today.toDateString();
            const dayOfWeek = birthdayThisYear.getDay();

            birthdays.push({
                student,
                className: classMap.get(student.classId) || 'Turma desconhecida',
                birthdayDate: birthdayThisYear,
                isToday,
                dayLabel: isToday ? 'Hoje!' : DAY_NAMES[dayOfWeek],
            });
        }
    }

    // Ordenar por data (mais próximo primeiro)
    birthdays.sort((a, b) => a.birthdayDate.getTime() - b.birthdayDate.getTime());

    return birthdays;
}

export function BirthdayWidget({ students, classes }: BirthdayWidgetProps) {
    const birthdays = useMemo(
        () => getWeekBirthdays(students, classes),
        [students, classes]
    );

    if (birthdays.length === 0) {
        return null; // Não exibir card se não houver aniversariantes
    }

    return (
        <Card className="bg-gradient-to-br from-info/10 to-warning/10 dark:from-info/20 dark:to-warning/20 border-info/30 dark:border-info/40">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <div className="p-2 rounded-lg bg-info/10">
                        <Cake className="h-5 w-5 text-info" />
                    </div>
                    Aniversariantes da Semana
                    <Badge variant="secondary" className="ml-auto">
                        {birthdays.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {birthdays.map((birthday) => (
                    <div
                        key={birthday.student.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${birthday.isToday
                            ? 'bg-gradient-to-r from-warning/15 to-warning/10 dark:from-warning/20 dark:to-warning/15 border border-warning/30 dark:border-warning/40'
                            : 'bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {birthday.isToday && (
                                <PartyPopper className="h-5 w-5 text-warning animate-bounce" />
                            )}
                            <div>
                                <p className="font-medium text-sm">{birthday.student.name}</p>
                                <p className="text-xs text-muted-foreground">{birthday.className}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge
                                variant={birthday.isToday ? 'default' : 'outline'}
                                className={birthday.isToday ? 'bg-warning/100 hover:bg-warning' : ''}
                            >
                                {birthday.dayLabel}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                                {birthday.birthdayDate.toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
