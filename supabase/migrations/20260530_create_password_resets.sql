-- Create password_resets table for self-hosted reset flow
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_resets_email_idx ON password_resets(email);
CREATE INDEX IF NOT EXISTS password_resets_token_idx ON password_resets(token);
