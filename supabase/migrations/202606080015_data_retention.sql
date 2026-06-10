-- Data retention: purge soft-deleted records older than 90 days
-- Run via cron: SELECT cleanup_expired_data();

CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM clients              WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM packets              WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM packet_forms         WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM incidents            WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM claims               WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM service_authorizations WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM shift_notes          WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM schedules            WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM documents            WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
  DELETE FROM webhook_logs         WHERE sent_at < NOW() - INTERVAL '1 year';
  DELETE FROM audit_logs           WHERE created_at < NOW() - INTERVAL '3 years';
END;
$$;
