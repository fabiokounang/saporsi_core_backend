-- Soft delete for merchants (keeps orders / FK history; hides from ops)
ALTER TABLE merchants
  ADD COLUMN deleted_at DATETIME(3) NULL DEFAULT NULL AFTER updated_at;

CREATE INDEX idx_merchants_deleted_at ON merchants (deleted_at);
