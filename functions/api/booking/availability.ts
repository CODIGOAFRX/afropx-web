import { json, methodNotAllowed, HttpError } from "../../lib/http";
import { getAvailability } from "../../lib/repository";
import { formatInTimeZone } from "../../lib/time";
import { serviceSnapshot, validateMonth } from "../../lib/validation";
import { requireDatabase } from "../../lib/env";
import type { Env } from "../../lib/types";

function monthDistance(fromDate: string, toMonth: string): number {
  const [fromYear, fromMonth] = fromDate.slice(0, 7).split("-").map(Number);
  const [toYear, toMonthNumber] = toMonth.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonthNumber - fromMonth);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = requireDatabase(context.env);
  const url = new URL(context.request.url);
  const month = validateMonth(url.searchParams.get("month"));
  const service = serviceSnapshot(url.searchParams.get("service") || "");
  const now = new Date();

  const availability = await getAvailability(db, month, service, now);
  const nowLocal = formatInTimeZone(now, availability.settings.timezone);
  const distance = monthDistance(nowLocal.date, month);
  if (
    distance < 0 ||
    distance >= availability.settings.maxMonthsAhead
  ) {
    throw new HttpError(
      422,
      "MONTH_OUT_OF_RANGE",
      "Ese mes queda fuera del periodo disponible para solicitar una reserva."
    );
  }

  return json({
    ok: true,
    month,
    timezone: availability.settings.timezone,
    service: {
      id: service.id,
      name: service.name,
      priceLabel: service.priceLabel,
      durationLabel: service.durationLabel
    },
    days: availability.days
  });
};

export const onRequest: PagesFunction<Env> = async () =>
  methodNotAllowed(["GET"]);
