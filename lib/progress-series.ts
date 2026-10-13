import type { QuizAttempt } from "@/lib/types";

const DAY = 86_400_000;
const percent = (attempt: QuizAttempt) => (attempt.score / Math.max(1, attempt.total)) * 100;
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Average quiz accuracy for each of the last 7 days (null where no quiz was taken). */
export function dailyAccuracy(attempts: QuizAttempt[], now = new Date()) {
  const today = startOfDay(now).getTime();
  return Array.from({ length: 7 }, (_, index) => {
    const start = today - (6 - index) * DAY;
    const day = attempts.filter((attempt) => {
      const time = Date.parse(attempt.createdAt);
      return time >= start && time < start + DAY;
    });
    return {
      day: new Date(start).toLocaleDateString("en-IN", { weekday: "short" }),
      accuracy: average(day.map(percent)),
      quizzes: day.length,
    };
  });
}

/** Average quiz accuracy for each of the last 8 weeks (null where no quiz was taken). */
export function weeklyAccuracy(attempts: QuizAttempt[], now = new Date()) {
  const end = startOfDay(now).getTime() + DAY;
  return Array.from({ length: 8 }, (_, index) => {
    const start = end - (8 - index) * 7 * DAY;
    const week = attempts.filter((attempt) => {
      const time = Date.parse(attempt.createdAt);
      return time >= start && time < start + 7 * DAY;
    });
    return { week: index === 7 ? "This wk" : `W${index + 1}`, accuracy: average(week.map(percent)), quizzes: week.length };
  });
}

/** Change between the first and last week that has data, or null if fewer than two. */
export function trendDelta(series: { accuracy: number | null }[]) {
  const points = series.map((point) => point.accuracy).filter((value): value is number => value !== null);
  return points.length >= 2 ? points[points.length - 1] - points[0] : null;
}

export function rangeLabel(days: number, now = new Date()) {
  const from = new Date(now.getTime() - (days - 1) * DAY);
  const format = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${format(from)} – ${format(now)}`;
}
