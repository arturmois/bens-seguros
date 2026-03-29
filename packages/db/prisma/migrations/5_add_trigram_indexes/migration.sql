-- Enable pg_trgm extension for trigram-based ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on Client.name for fast ILIKE search across all ILIKE queries
-- Also benefits Proposal search (which joins Client.name) and Policy search (same join)
CREATE INDEX IF NOT EXISTS "idx_client_name_trgm" ON "Client" USING gin (name gin_trgm_ops);
