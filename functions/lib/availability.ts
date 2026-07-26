import type {
  AvailabilityException,
  AvailabilityRule,
  BookingBlock,
  BookingSettings
} from "./types";
import {
  addDays,
  addMinutesToTime,
  compareLocalDateTime,
  getDayOfWeek,
  getMonthBounds,
  minutesFromTime,
  zonedDateTimeToUtc
} from "./time";

export interface DayAvailability {
  date: string;
  available: boolean;
  slots: string[];
  reason?: "past" | "closed" | "blocked" | "full";
}

export interface AvailabilityInput {
  month: string;
  durationMinutes: number;
  settings: BookingSettings;
  rules: AvailabilityRule[];
  blocks: BookingBlock[];
  exceptions: AvailabilityException[];
  occupiedSlotKeys: Set<string>;
  now?: Date;
}

export function slotsRequired(
  durationMinutes: number,
  bufferMinutes: number,
  intervalMinutes: number
): number {
  return Math.max(
    1,
    Math.ceil((durationMinutes + bufferMinutes) / intervalMinutes)
  );
}

export function getSlotKeys(
  startAtUtc: Date,
  durationMinutes: number,
  bufferMinutes: number,
  intervalMinutes: number
): string[] {
  const count = slotsRequired(
    durationMinutes,
    bufferMinutes,
    intervalMinutes
  );

  return Array.from({ length: count }, (_, index) =>
    new Date(startAtUtc.getTime() + index * intervalMinutes * 60_000)
      .toISOString()
      .slice(0, 16)
  );
}

export function buildMonthAvailability(
  input: AvailabilityInput
): DayAvailability[] {
  const { start, end } = getMonthBounds(input.month);
  const now = input.now || new Date();
  const nowLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(now)
    .reduce(
      (acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      },
      {} as Record<string, string>
    );
  const currentDate = `${nowLocal.year}-${nowLocal.month}-${nowLocal.day}`;
  const currentTime = `${nowLocal.hour}:${nowLocal.minute}`;

  const ruleMap = new Map(input.rules.map((rule) => [rule.dayOfWeek, rule]));
  const exceptionMap = new Map(
    input.exceptions.map((exception) => [exception.date, exception])
  );
  const blocksByDate = new Map<string, BookingBlock[]>();
  for (const block of input.blocks) {
    const existing = blocksByDate.get(block.date) || [];
    existing.push(block);
    blocksByDate.set(block.date, existing);
  }

  const days: DayAvailability[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const exception = exceptionMap.get(date);
    const baseRule = ruleMap.get(getDayOfWeek(date));
    const rule = exception
      ? {
          enabled: exception.enabled,
          start: exception.start || "",
          lastStart: exception.lastStart || ""
        }
      : baseRule;

    if (date < currentDate) {
      days.push({ date, available: false, slots: [], reason: "past" });
      continue;
    }

    if (!rule?.enabled || !rule.start || !rule.lastStart) {
      days.push({ date, available: false, slots: [], reason: "closed" });
      continue;
    }

    const dateBlocks = blocksByDate.get(date) || [];
    if (dateBlocks.some((block) => !block.start && !block.end)) {
      days.push({ date, available: false, slots: [], reason: "blocked" });
      continue;
    }

    const slots: string[] = [];
    const startMinutes = minutesFromTime(rule.start);
    const endMinutes = minutesFromTime(rule.lastStart);

    for (
      let minute = startMinutes;
      minute <= endMinutes;
      minute += input.settings.slotIntervalMinutes
    ) {
      const time = addMinutesToTime("00:00", minute);
      if (
        compareLocalDateTime(date, time, currentDate, currentTime) <= 0
      ) {
        continue;
      }

      const reservationEndMinutes =
        minute + input.durationMinutes + input.settings.bufferMinutes;
      const blocked = dateBlocks.some((block) => {
        if (!block.start || !block.end) return false;
        const blockStartMinutes = minutesFromTime(block.start);
        const blockEndMinutes = minutesFromTime(block.end);
        return (
          minute < blockEndMinutes &&
          reservationEndMinutes > blockStartMinutes
        );
      });
      if (blocked) continue;

      const startAtUtc = zonedDateTimeToUtc(
        date,
        time,
        input.settings.timezone
      );
      const keys = getSlotKeys(
        startAtUtc,
        input.durationMinutes,
        input.settings.bufferMinutes,
        input.settings.slotIntervalMinutes
      );
      if (keys.some((key) => input.occupiedSlotKeys.has(key))) continue;

      slots.push(time);
    }

    days.push({
      date,
      available: slots.length > 0,
      slots,
      ...(slots.length === 0 ? { reason: "full" as const } : {})
    });
  }

  return days;
}
