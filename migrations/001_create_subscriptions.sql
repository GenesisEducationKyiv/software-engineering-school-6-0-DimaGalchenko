CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  last_seen_tag VARCHAR(255),
  confirm_token VARCHAR(255) NOT NULL UNIQUE,
  unsubscribe_token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, repo)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_confirmed_repo ON subscriptions(confirmed, repo);
