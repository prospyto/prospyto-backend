import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

const ALLOWED_EVENT_TYPES = ["page_view", "click", "form_submit", "whatsapp_click", "custom"];

// POST /api/analytics/event - enregistrer un événement (public, appelé depuis le site vitrine)
router.post("/event", async (req, res) => {
  const { event_type, section, source } = req.body;

  if (!event_type || !ALLOWED_EVENT_TYPES.includes(event_type)) {
    return res.status(400).json({ error: "event_type invalide" });
  }

  try {
    await pool.query(
      `INSERT INTO page_events (event_type, section, source) VALUES ($1, $2, $3)`,
      [event_type, section || null, source || null]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement de l'événement" });
  }
});

export default router;
