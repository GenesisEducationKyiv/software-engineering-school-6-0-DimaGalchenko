ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS confirmation_email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmation_failure_reason TEXT;

-- Existing confirmed rows already received their email.
UPDATE subscriptions SET confirmation_email_status = 'sent' WHERE confirmed = true;
