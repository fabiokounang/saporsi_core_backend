-- Category, purchase, lifespan, last MT, runtime & downtime (Next MT = existing maintenance_at)
ALTER TABLE machines
  ADD COLUMN category VARCHAR(128) NULL DEFAULT NULL COMMENT 'Kategori mesin' AFTER maintenance_mode,
  ADD COLUMN purchase_date DATE NULL DEFAULT NULL COMMENT 'Tanggal pembelian' AFTER category,
  ADD COLUMN lifespan_months INT UNSIGNED NULL DEFAULT NULL COMMENT 'Umur pakai rencana (bulan)' AFTER purchase_date,
  ADD COLUMN last_maintenance_at DATE NULL DEFAULT NULL COMMENT 'Maintenance terakhir' AFTER lifespan_months,
  ADD COLUMN total_runtime_hours DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Total jam operasi' AFTER last_maintenance_at,
  ADD COLUMN total_downtime_hours DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Total jam downtime' AFTER total_runtime_hours;

CREATE INDEX idx_machines_category ON machines (category);
CREATE INDEX idx_machines_purchase_date ON machines (purchase_date);
CREATE INDEX idx_machines_last_maintenance_at ON machines (last_maintenance_at);
