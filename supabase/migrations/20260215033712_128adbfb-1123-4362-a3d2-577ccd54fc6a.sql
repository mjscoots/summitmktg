-- Add input validation constraints to applications table
ALTER TABLE public.applications
  ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  ADD CONSTRAINT valid_phone CHECK (char_length(phone) BETWEEN 7 AND 30),
  ADD CONSTRAINT valid_name CHECK (char_length(full_name) BETWEEN 2 AND 200),
  ADD CONSTRAINT valid_city_state CHECK (char_length(city_state) BETWEEN 2 AND 200);