-- Add change_logs and email_send_logs to Supabase Realtime publication
-- Required for postgres_changes subscriptions to receive events for these tables.
-- See: https://supabase.com/docs/guides/realtime/postgres-changes

DO $$
BEGIN
  -- Add change_logs to realtime publication (ignore if already added)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'change_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE change_logs;
    RAISE NOTICE 'change_logs added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'change_logs already in supabase_realtime publication';
  END IF;

  -- Add email_send_logs to realtime publication (ignore if already added)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_send_logs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'email_send_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE email_send_logs;
      RAISE NOTICE 'email_send_logs added to supabase_realtime publication';
    ELSE
      RAISE NOTICE 'email_send_logs already in supabase_realtime publication';
    END IF;
  END IF;
END $$;
