export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

export interface Env {
  DB?: D1Database;
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_BYPASS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  BOOKING_NOTIFICATION_EMAIL?: string;
  RATE_LIMIT_SALT?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  ADMIN_BYPASS?: string;
  ADMIN_URL?: string;
}

export interface ServiceSnapshot {
  id: string;
  name: string;
  priceCents: number | null;
  priceLabel: string;
  currency: string;
  durationMinutes: number;
  durationLabel: string;
  includes: string[];
}

export interface BookingInput {
  clientRequestId: string;
  serviceId: string;
  localDate: string;
  localTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  artistName: string | null;
  songCount: number | null;
  filesUrl: string | null;
  projectNotes: string;
  privacyAccepted: boolean;
  marketingConsent: boolean;
  turnstileToken: string;
}

export interface BookingRecord {
  id: string;
  client_request_id: string;
  status: BookingStatus;
  service_id: string;
  service_name: string;
  price_cents: number | null;
  price_label: string;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  artist_name: string | null;
  song_count: number | null;
  files_url: string | null;
  project_notes: string;
  local_date: string;
  local_time: string;
  timezone: string;
  start_at_utc: string;
  end_at_utc: string;
  duration_minutes: number;
  privacy_accepted_at: string;
  marketing_consent: number;
  private_notes: string;
  internal_email_status: string;
  customer_email_status: string;
  last_email_error: string | null;
  payment_status: string;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  dayOfWeek: number;
  enabled: boolean;
  start: string;
  lastStart: string;
  provisionalLastStart: boolean;
}

export interface BookingBlock {
  id: string;
  date: string;
  start: string | null;
  end: string | null;
  reason: string;
}

export interface AvailabilityException {
  date: string;
  enabled: boolean;
  start: string | null;
  lastStart: string | null;
  reason: string;
}

export interface BookingSettings {
  timezone: string;
  slotIntervalMinutes: number;
  defaultDurationMinutes: number;
  bufferMinutes: number;
  maxMonthsAhead: number;
}

export interface AdminIdentity {
  email: string;
  subject: string;
}
