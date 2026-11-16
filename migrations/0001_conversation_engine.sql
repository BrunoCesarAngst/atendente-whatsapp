CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  owner_contact_ref TEXT
);

CREATE TABLE IF NOT EXISTS services (
  business_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_in_reais REAL NOT NULL CHECK (price_in_reais > 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  PRIMARY KEY (business_id, id),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  channel_customer_key TEXT NOT NULL,
  UNIQUE (business_id, channel_customer_key),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS conversations (
  business_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  current_journey TEXT NOT NULL,
  current_step TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('automation', 'human')),
  context_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (business_id, customer_id)
);

CREATE TABLE IF NOT EXISTS processed_messages (
  business_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, message_id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  price_in_reais REAL NOT NULL CHECK (price_in_reais > 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'rescheduled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_confirmed_slot
  ON appointments (business_id, professional_id, starts_at)
  WHERE status = 'confirmed';

CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'active', 'closed')),
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);
