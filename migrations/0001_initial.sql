PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS booking_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS availability_rules (
  day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  start_time TEXT NOT NULL,
  last_start_time TEXT NOT NULL,
  provisional_last_start INTEGER NOT NULL DEFAULT 0 CHECK (provisional_last_start IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS booking_blocks (
  id TEXT PRIMARY KEY,
  block_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_blocks_date
ON booking_blocks (block_date);

CREATE TABLE IF NOT EXISTS availability_exceptions (
  exception_date TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  start_time TEXT,
  last_start_time TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    enabled = 0
    OR (start_time IS NOT NULL AND last_start_time IS NOT NULL AND start_time <= last_start_time)
  )
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  client_request_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price_cents INTEGER,
  price_label TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  artist_name TEXT,
  song_count INTEGER CHECK (song_count IS NULL OR song_count BETWEEN 1 AND 999),
  files_url TEXT,
  project_notes TEXT NOT NULL,
  local_date TEXT NOT NULL,
  local_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  start_at_utc TEXT NOT NULL,
  end_at_utc TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 1440),
  privacy_accepted_at TEXT NOT NULL,
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  private_notes TEXT NOT NULL DEFAULT '',
  internal_email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (internal_email_status IN ('pending', 'sent', 'failed', 'disabled')),
  customer_email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (customer_email_status IN ('pending', 'sent', 'failed', 'disabled')),
  last_email_error TEXT,
  payment_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded')),
  payment_provider TEXT,
  payment_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_start
ON bookings (start_at_utc);

CREATE INDEX IF NOT EXISTS idx_bookings_status_start
ON bookings (status, start_at_utc);

CREATE INDEX IF NOT EXISTS idx_bookings_service
ON bookings (service_id);

CREATE TABLE IF NOT EXISTS booking_slots (
  slot_key TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  local_time TEXT NOT NULL,
  start_at_utc TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_booking
ON booking_slots (booking_id);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('internal', 'customer')),
  provider_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'disabled')),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_log_booking
ON email_log (booking_id, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  event_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, event_name, path, detail)
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO booking_settings (key, value) VALUES
  ('timezone', 'Europe/Madrid'),
  ('slot_interval_minutes', '60'),
  ('default_duration_minutes', '60'),
  ('buffer_minutes', '0'),
  ('max_months_ahead', '12');

INSERT OR IGNORE INTO availability_rules
  (day_of_week, enabled, start_time, last_start_time, provisional_last_start)
VALUES
  (0, 1, '09:00', '17:00', 0),
  (1, 1, '17:00', '21:00', 1),
  (2, 1, '17:00', '21:00', 1),
  (3, 1, '17:00', '21:00', 1),
  (4, 1, '17:00', '21:00', 1),
  (5, 1, '17:00', '21:00', 1),
  (6, 1, '09:00', '17:00', 0);
