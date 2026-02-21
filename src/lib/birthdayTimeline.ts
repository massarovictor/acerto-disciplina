import { Class, Student } from "@/types";
import { formatBrasiliaDate, getBrasiliaISODate } from "@/lib/brasiliaDate";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDateParts = (value: string) => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-").map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) {
    return null;
  }
  return { year: yearRaw, month: monthRaw, day: dayRaw };
};

const toDayStamp = (year: number, month: number, day: number) =>
  Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);

const buildDateInstance = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

const formatRelativeFuture = (days: number) => {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Em ${days} dias`;
};

const formatRelativePast = (days: number) => {
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
};

export interface BirthdayTimelineEntry {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: Date;
  dateLabel: string;
  relativeLabel: string;
  distanceDays: number;
}

export const buildBirthdayTimeline = (students: Student[], classes: Class[]) => {
  const todayIso = getBrasiliaISODate(new Date());
  const todayParts = toDateParts(todayIso);
  if (!todayParts) {
    return { upcoming: [] as BirthdayTimelineEntry[], past: [] as BirthdayTimelineEntry[] };
  }

  const classMap = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass.name]));
  const todayStamp = toDayStamp(todayParts.year, todayParts.month, todayParts.day);

  const upcoming: BirthdayTimelineEntry[] = [];
  const past: BirthdayTimelineEntry[] = [];

  for (const student of students) {
    if (student.status !== "active") continue;

    const birthdayIso = getBrasiliaISODate(student.birthDate);
    const birthdayParts = toDateParts(birthdayIso);
    if (!birthdayParts) continue;

    const thisYearStamp = toDayStamp(todayParts.year, birthdayParts.month, birthdayParts.day);

    const nextYear = thisYearStamp >= todayStamp ? todayParts.year : todayParts.year + 1;
    const previousYear = thisYearStamp <= todayStamp ? todayParts.year : todayParts.year - 1;

    const nextStamp = toDayStamp(nextYear, birthdayParts.month, birthdayParts.day);
    const previousStamp = toDayStamp(previousYear, birthdayParts.month, birthdayParts.day);

    const nextDate = buildDateInstance(nextYear, birthdayParts.month, birthdayParts.day);
    const previousDate = buildDateInstance(previousYear, birthdayParts.month, birthdayParts.day);

    const daysUntil = Math.max(0, nextStamp - todayStamp);
    const daysSince = Math.max(0, todayStamp - previousStamp);
    const className = classMap.get(student.classId) || "Turma não encontrada";

    upcoming.push({
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className,
      date: nextDate,
      dateLabel: formatBrasiliaDate(nextDate, { day: "2-digit", month: "2-digit", year: "numeric" }),
      relativeLabel: formatRelativeFuture(daysUntil),
      distanceDays: daysUntil,
    });

    past.push({
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className,
      date: previousDate,
      dateLabel: formatBrasiliaDate(previousDate, { day: "2-digit", month: "2-digit", year: "numeric" }),
      relativeLabel: formatRelativePast(daysSince),
      distanceDays: daysSince,
    });
  }

  upcoming.sort((a, b) => a.distanceDays - b.distanceDays || a.studentName.localeCompare(b.studentName, "pt-BR"));
  past.sort((a, b) => a.distanceDays - b.distanceDays || a.studentName.localeCompare(b.studentName, "pt-BR"));

  return { upcoming, past };
};
