CREATE TABLE booking_impact_settings (
  business_id TEXT PRIMARY KEY,
  baseline_seconds INTEGER CHECK (baseline_seconds BETWEEN 1 AND 86400),
  sample_size INTEGER CHECK (sample_size BETWEEN 3 AND 15),
  hourly_cost_cents INTEGER CHECK (hourly_cost_cents >= 0)
);

ALTER TABLE appointments ADD COLUMN automated_at TEXT;
ALTER TABLE appointments ADD COLUMN baseline_seconds INTEGER
  CHECK (baseline_seconds BETWEEN 1 AND 86400);

CREATE INDEX appointments_automated_by_business_and_date
  ON appointments (business_id, automated_at)
  WHERE automated_at IS NOT NULL;
