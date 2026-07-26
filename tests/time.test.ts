import { describe, expect, it } from "vitest";
import {
  formatInTimeZone,
  isIsoDate,
  zonedDateTimeToUtc
} from "../functions/lib/time";

describe("Europe/Madrid date handling", () => {
  it("uses CET in winter", () => {
    expect(
      zonedDateTimeToUtc(
        "2026-01-15",
        "17:00",
        "Europe/Madrid"
      ).toISOString()
    ).toBe("2026-01-15T16:00:00.000Z");
  });

  it("uses CEST in summer", () => {
    expect(
      zonedDateTimeToUtc(
        "2026-07-15",
        "17:00",
        "Europe/Madrid"
      ).toISOString()
    ).toBe("2026-07-15T15:00:00.000Z");
  });

  it("round-trips a Madrid local time", () => {
    const utc = zonedDateTimeToUtc(
      "2026-10-15",
      "09:00",
      "Europe/Madrid"
    );
    expect(formatInTimeZone(utc, "Europe/Madrid")).toEqual({
      date: "2026-10-15",
      time: "09:00"
    });
  });

  it("rejects a nonexistent spring DST time", () => {
    expect(() =>
      zonedDateTimeToUtc(
        "2026-03-29",
        "02:30",
        "Europe/Madrid"
      )
    ).toThrow("NON_EXISTENT_LOCAL_TIME");
  });

  it("validates calendar dates, including leap years", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });
});
