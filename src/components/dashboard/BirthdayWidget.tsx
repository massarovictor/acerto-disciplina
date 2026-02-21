import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Cake, PartyPopper } from 'lucide-react';
import { Student, Class } from '@/types';
import { buildBirthdayTimeline } from '@/lib/birthdayTimeline';
import { formatBrasiliaDate, getBrasiliaISODate } from '@/lib/brasiliaDate';
import { BirthdayExplorerDialog } from './BirthdayExplorerDialog';

interface BirthdayWidgetProps {
  students: Student[];
  classes: Class[];
}

interface WeeklyBirthday {
  studentId: string;
  studentName: string;
  className: string;
  date: Date;
  dateLabel: string;
  relativeLabel: string;
  isToday: boolean;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDateParts = (value: string) => {
  const [yearRaw, monthRaw, dayRaw] = value.split('-').map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) return null;
  return { year: yearRaw, month: monthRaw, day: dayRaw };
};

const toDayStamp = (year: number, month: number, day: number) =>
  Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);

const toDateInstance = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

export function BirthdayWidget({ students, classes }: BirthdayWidgetProps) {
  const [showExplorer, setShowExplorer] = useState(false);
  const timeline = useMemo(() => buildBirthdayTimeline(students, classes), [students, classes]);
  const weekBirthdays = useMemo(() => {
    const todayIso = getBrasiliaISODate(new Date());
    const todayParts = toDateParts(todayIso);
    if (!todayParts) return [] as WeeklyBirthday[];

    const todayDate = toDateInstance(todayParts.year, todayParts.month, todayParts.day);
    const todayStamp = toDayStamp(todayParts.year, todayParts.month, todayParts.day);
    const weekStartStamp = todayStamp - todayDate.getUTCDay();
    const weekEndStamp = weekStartStamp + 6;

    const weekStartDate = new Date(weekStartStamp * DAY_IN_MS);
    const weekEndDate = new Date(weekEndStamp * DAY_IN_MS);
    const weekYears = new Set([weekStartDate.getUTCFullYear(), weekEndDate.getUTCFullYear()]);
    const classMap = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass.name]));

    const entries: WeeklyBirthday[] = [];

    for (const student of students) {
      if (student.status !== 'active') continue;
      const birthIso = getBrasiliaISODate(student.birthDate);
      const birthParts = toDateParts(birthIso);
      if (!birthParts) continue;

      for (const year of weekYears) {
        const birthdayStamp = toDayStamp(year, birthParts.month, birthParts.day);
        if (birthdayStamp < weekStartStamp || birthdayStamp > weekEndStamp) continue;

        const birthdayDate = toDateInstance(year, birthParts.month, birthParts.day);
        const isToday = birthdayStamp === todayStamp;
        const dayLabel = isToday ? 'Hoje' : DAY_NAMES[birthdayDate.getUTCDay()];

        entries.push({
          studentId: student.id,
          studentName: student.name,
          className: classMap.get(student.classId) || 'Turma não encontrada',
          date: birthdayDate,
          dateLabel: formatBrasiliaDate(birthdayDate, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          relativeLabel: dayLabel,
          isToday,
        });
      }
    }

    return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [classes, students]);

  return (
    <>
      <Card className="bg-gradient-to-br from-info/10 to-primary/10 dark:from-info/20 dark:to-primary/20 border-info/30 dark:border-info/40">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-2 rounded-lg bg-info/10">
                <Cake className="h-5 w-5 text-info" />
              </div>
              Aniversariantes
              <Badge variant="secondary" className="ml-1">
                {weekBirthdays.length}
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary sm:h-8 sm:w-auto sm:px-3"
              onClick={() => setShowExplorer(true)}
              aria-label="Ver todos os aniversariantes"
              title="Ver todos"
            >
              <ArrowRight className="h-4 w-4 sm:ml-1 sm:h-3 sm:w-3" />
              <span className="hidden sm:inline">Ver todos</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {weekBirthdays.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground bg-white/60 dark:bg-white/5 rounded-lg">
              Nenhum aniversariante nesta semana.
            </div>
          ) : (
            weekBirthdays.map((birthday) => (
              <div
                key={birthday.studentId}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  birthday.isToday
                    ? 'bg-gradient-to-r from-warning/15 to-warning/10 dark:from-warning/20 dark:to-warning/15 border border-warning/30 dark:border-warning/40'
                    : 'bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {birthday.isToday ? (
                    <PartyPopper className="h-5 w-5 text-info animate-bounce" />
                  ) : null}
                  <div>
                    <p className="font-medium text-sm">{birthday.studentName}</p>
                    <p className="text-xs text-muted-foreground">{birthday.className}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={birthday.isToday ? 'default' : 'outline'}>
                    {birthday.relativeLabel}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{birthday.dateLabel}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <BirthdayExplorerDialog
        open={showExplorer}
        onOpenChange={setShowExplorer}
        students={students}
        classes={classes}
      />
    </>
  );
}
