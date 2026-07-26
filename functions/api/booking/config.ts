import SITE_CONFIG, {
  formatPrice,
  getBookableServices
} from "../../../config/site.js";
import { hasDatabase, isDevelopment, isTrue } from "../../lib/env";
import { json, methodNotAllowed } from "../../lib/http";
import { loadRules, loadSettings } from "../../lib/repository";
import { formatInTimeZone } from "../../lib/time";
import type { Env } from "../../lib/types";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const databaseConfigured = hasDatabase(context.env);
  const [settings, rules] = context.env.DB
    ? await Promise.all([
        loadSettings(context.env.DB),
        loadRules(context.env.DB)
      ])
    : [
        {
          timezone: SITE_CONFIG.booking.timezone,
          slotIntervalMinutes: SITE_CONFIG.booking.slotIntervalMinutes,
          defaultDurationMinutes: SITE_CONFIG.booking.defaultDurationMinutes,
          bufferMinutes: SITE_CONFIG.booking.bufferMinutes,
          maxMonthsAhead: SITE_CONFIG.booking.maxMonthsAhead
        },
        SITE_CONFIG.booking.weeklyAvailability.map((rule) => ({
          dayOfWeek: rule.day,
          enabled: rule.enabled,
          start: rule.start,
          lastStart: rule.lastStart,
          provisionalLastStart: Boolean(rule.provisionalLastStart)
        }))
      ];

  const localNow = formatInTimeZone(new Date(), settings.timezone);
  const turnstileBypass =
    isDevelopment(context.env) && isTrue(context.env.TURNSTILE_BYPASS);
  const turnstileConfigured = Boolean(
    context.env.TURNSTILE_SITE_KEY &&
      context.env.TURNSTILE_SECRET_KEY
  );

  return json({
    ok: true,
    ready:
      databaseConfigured && (turnstileConfigured || turnstileBypass),
    capabilities: {
      databaseConfigured,
      turnstileConfigured,
      turnstileBypass,
      emailConfigured: Boolean(
        context.env.RESEND_API_KEY && context.env.RESEND_FROM_EMAIL
      ),
      paymentsEnabled: false
    },
    turnstile: {
      siteKey: turnstileConfigured
        ? context.env.TURNSTILE_SITE_KEY
        : null,
      bypass: turnstileBypass
    },
    timezone: settings.timezone,
    today: localNow.date,
    settings,
    availability: rules,
    services: getBookableServices().map((service) => ({
      id: service.id,
      name: service.name,
      shortName: service.shortName,
      description: service.description,
      priceCents: service.priceCents,
      currency: service.currency,
      priceLabel: formatPrice(service),
      includes: service.includes,
      durationLabel: service.durationLabel,
      provisionalDuration: service.provisionalDuration
    })),
    conditions: SITE_CONFIG.booking.conditions,
    privacyUrl: "/legal/privacidad/",
    contactEmail: SITE_CONFIG.site.contactEmail,
    warnings: [
      ...(!databaseConfigured
        ? [
            "La base de datos D1 todavía no está vinculada. El formulario se mantiene desactivado."
          ]
        : []),
      ...(!turnstileConfigured && !turnstileBypass
        ? [
            "Turnstile todavía no está configurado. El formulario se mantiene desactivado."
          ]
        : []),
      ...(rules.some((rule) => rule.provisionalLastStart)
        ? [
            "La última hora de inicio entre semana es provisional y debe confirmarse en el panel."
          ]
        : [])
    ]
  });
};

export const onRequest: PagesFunction<Env> = async () =>
  methodNotAllowed(["GET"]);
