const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutesToTime(value: string, minutes: number): string {
  return timeFromMinutes(minutesFromTime(value) + minutes);
}

function partsAt(date: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}

/**
 * Convierte una fecha/hora civil a UTC sin depender de la zona horaria
 * del sistema donde se ejecute el Worker.
 */
export function zonedDateTimeToUtc(
  localDate: string,
  localTime: string,
  timeZone: string
): Date {
  if (!isIsoDate(localDate) || !isTime(localTime)) {
    throw new Error("INVALID_LOCAL_DATE_TIME");
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const targetWallClock = Date.UTC(year, month - 1, day, hour, minute, 0);

  let candidate = targetWallClock;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = partsAt(new Date(candidate), timeZone);
    const representedWallClock = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const correction = targetWallClock - representedWallClock;
    candidate += correction;
    if (correction === 0) break;
  }

  const result = new Date(candidate);
  const check = partsAt(result, timeZone);
  if (
    check.year !== year ||
    check.month !== month ||
    check.day !== day ||
    check.hour !== hour ||
    check.minute !== minute
  ) {
    throw new Error("NON_EXISTENT_LOCAL_TIME");
  }

  return result;
}

export function formatInTimeZone(
  date: Date,
  timeZone: string
): { date: string; time: string } {
  const parts = partsAt(date, timeZone);
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
      parts.day
    ).padStart(2, "0")}`,
    time: `${String(parts.hour).padStart(2, "0")}:${String(
      parts.minute
    ).padStart(2, "0")}`
  };
}

export function getDayOfWeek(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getMonthBounds(month: string): {
  start: string;
  end: string;
} {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("INVALID_MONTH");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error("INVALID_MONTH");
  }

  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const endDate = new Date(nextMonth.getTime() - 86_400_000);

  return {
    start,
    end: endDate.toISOString().slice(0, 10)
  };
}

export function compareLocalDateTime(
  firstDate: string,
  firstTime: string,
  secondDate: string,
  secondTime: string
): number {
  return `${firstDate}T${firstTime}`.localeCompare(
    `${secondDate}T${secondTime}`
  );
}
