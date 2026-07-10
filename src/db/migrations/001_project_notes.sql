-- Migration 001 : notes internes par projet (semaine 2)
-- Idempotente : peut être relancée sans risque sur une base déjà à jour.
--
-- À exécuter sur la DB de prod, ex:
--   psql "$DATABASE_URL" -f src/db/migrations/001_project_notes.sql

CREATE TABLE IF NOT EXISTS project_notes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);
