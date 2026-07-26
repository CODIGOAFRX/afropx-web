import { describe, expect, it } from "vitest";
import {
  buildMonthAvailability,
  getSlotKeys,
  slotsRequired
} from "../functions/lib/availability";
import type {
  AvailabilityRule,
  BookingSettings
} from "../functions/lib/types";
import { zonedDateTimeToUtc } from "../functions/lib/time";

const settings: BookingSettings = {
  timezone: "Europe/Madrid",
  slotIntervalMinutes: 60,
  defaultDurationMinutes: 60,
  bufferMinutes: 0,
  maxMonthsAhead: 12
};

const rules: AvailabilityRule[] = Array.from({ length: 7 }, (_, day) => ({
  dayOfWeek: day,
  enabled: true,
  start: day === 0 || day === 6 ? "09:00" : "17:00",
  lastStart: day === 0 || day === 6 ? "17:00" : "21:00",
  provisionalLastStart: day > 0 && day < 6
}));

describe("booking availability", () => {
  it("creates weekday and weekend slots from centralized rules", () => {
    const days = buildMonthAvailability({
      month: "2026-08",
      durationMinutes: 60,
      settings,
      rules,
      blocks: [],
      exceptions: [],
      occupiedSlotKeys: new Set(),
      now: new Date("2026-07-01T12:00:00.000Z")
    });
    const saturday = days.find((day) => day.date === "2026-08-01");
    const monday = days.find((day) => day.date === "2026-08-03");

    expect(saturday?.slots).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00"
    ]);
    expect(monday?.slots).toEqual([
      "17:00",
      "18:00",
      "19:00",
      "20:00",
      "21:00"
    ]);
  });

  it("removes full-day and partial blocks", () => {
    const days = buildMonthAvailability({
      month: "2026-08",
      durationMinutes: 60,
      settings,
      rules,
      blocks: [
        {
          id: "full",
          date: "2026-08-01",
          start: null,
          end: null,
          reason: "vacaciones"
        },
        {
          id: "partial",
          date: "2026-08-03",
          start: "18:00",
          end: "20:00",
          reason: ""
        }
      ],
      exceptions: [],
      occupiedSlotKeys: new Set(),
      now: new Date("2026-07-01T12:00:00.000Z")
    });

    expect(days.find((day) => day.date === "2026-08-01")).toMatchObject({
      available: false,
      reason: "blocked"
    });
    expect(days.find((day) => day.date === "2026-08-03")?.slots).toEqual([
      "17:00",
      "20:00",
      "21:00"
    ]);
  });

  it("removes starts whose full session overlaps a partial block", () => {
    const days = buildMonthAvailability({
      month: "2026-08",
      durationMinutes: 120,
      settings,
      rules,
      blocks: [
        {
          id: "partial-overlap",
          date: "2026-08-03",
          start: "18:00",
          end: "19:00",
          reason: "llamada"
        }
      ],
      exceptions: [],
      occupiedSlotKeys: new Set(),
      now: new Date("2026-07-01T12:00:00.000Z")
    });

    expect(days.find((day) => day.date === "2026-08-03")?.slots).not.toContain(
      "17:00"
    );
    expect(days.find((day) => day.date === "2026-08-03")?.slots).not.toContain(
      "18:00"
    );
    expect(days.find((day) => day.date === "2026-08-03")?.slots).toContain(
      "19:00"
    );
  });

  it("accounts for duration and buffer across multiple slot keys", () => {
    expect(slotsRequired(90, 30, 60)).toBe(2);
    const start = zonedDateTimeToUtc(
      "2026-08-03",
      "17:00",
      "Europe/Madrid"
    );
    const keys = getSlotKeys(start, 90, 30, 60);
    expect(keys).toEqual(["2026-08-03T15:00", "2026-08-03T16:00"]);

    const days = buildMonthAvailability({
      month: "2026-08",
      durationMinutes: 120,
      settings,
      rules,
      blocks: [],
      exceptions: [],
      occupiedSlotKeys: new Set(["2026-08-03T16:00"]),
      now: new Date("2026-07-01T12:00:00.000Z")
    });
    expect(days.find((day) => day.date === "2026-08-03")?.slots).not.toContain(
      "17:00"
    );
  });

  it("supports closed and special-date exceptions", () => {
    const days = buildMonthAvailability({
      month: "2026-08",
      durationMinutes: 60,
      settings,
      rules,
      blocks: [],
      exceptions: [
        {
          date: "2026-08-04",
          enabled: false,
          start: null,
          lastStart: null,
          reason: "festivo"
        },
        {
          date: "2026-08-05",
          enabled: true,
          start: "10:00",
          lastStart: "12:00",
          reason: "horario especial"
        }
      ],
      occupiedSlotKeys: new Set(),
      now: new Date("2026-07-01T12:00:00.000Z")
    });

    expect(days.find((day) => day.date === "2026-08-04")?.reason).toBe(
      "closed"
    );
    expect(days.find((day) => day.date === "2026-08-05")?.slots).toEqual([
      "10:00",
      "11:00",
      "12:00"
    ]);
  });
});
