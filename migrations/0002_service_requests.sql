CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'closed')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS service_requests_pending_by_business
  ON service_requests (business_id, status, created_at);
