CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 160),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 24),
  address_line text NOT NULL CHECK (char_length(address_line) BETWEEN 8 AND 600),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 100),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_user_id_idx ON customer_addresses(user_id);
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
