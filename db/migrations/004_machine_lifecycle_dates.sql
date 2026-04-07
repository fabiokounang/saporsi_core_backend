-- Track machine lifecycle dates for MT/age tracing
ALTER TABLE machines
  ADD COLUMN manufactured_at DATE NULL DEFAULT NULL AFTER name,
  ADD COLUMN installed_at DATE NULL DEFAULT NULL AFTER manufactured_at,
  ADD COLUMN maintenance_at DATE NULL DEFAULT NULL AFTER installed_at,
  ADD COLUMN maintenance_mode VARCHAR(16) NOT NULL DEFAULT 'auto' AFTER maintenance_at;

CREATE INDEX idx_machines_manufactured_at ON machines (manufactured_at);
CREATE INDEX idx_machines_installed_at ON machines (installed_at);
CREATE INDEX idx_machines_maintenance_at ON machines (maintenance_at);
CREATE INDEX idx_machines_maintenance_mode ON machines (maintenance_mode);
