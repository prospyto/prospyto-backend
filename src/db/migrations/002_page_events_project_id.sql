-- Migration 002 : lier les visites de dashboard client (/track/:link) à un projet
-- Idempotente : peut être relancée sans risque sur une base déjà à jour.
--
-- À exécuter sur la DB de prod (Neon SQL Editor, ou psql "$DATABASE_URL" -f ...)

ALTER TABLE page_events ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_page_events_project_id ON page_events(project_id);
