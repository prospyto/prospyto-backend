import { Router } from "express";
import { pool } from "../db/pool.js";
import { buildWhatsAppLink } from "../utils/whatsapp.js";

const router = Router();

// GET /api/track/:link - accès public au dashboard client, sans auth
router.get("/:link", async (req, res) => {
  const { link } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.description, p.completion_percent, p.status,
              p.start_date, p.estimated_end_date, p.actual_end_date,
              c.name AS client_name, c.phone AS client_phone
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.tracking_link = $1`,
      [link]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Projet introuvable" });
    }

    const p = result.rows[0];

    // Best-effort : on ne bloque jamais la réponse au client là-dessus, et
    // un échec ne doit jamais faire échouer la requête (pas de await).
    // ?silent=1 = rafraîchissement automatique en arrière-plan (polling), pas
    // une vraie visite : on ne veut pas gonfler artificiellement les stats.
    if (req.query.silent !== "1") {
      pool
        .query(`INSERT INTO page_events (event_type, project_id) VALUES ('track_view', $1)`, [p.id])
        .catch((err) => console.error("Erreur log visite track:", err));
    }

    // Noms de champs alignés sur ce que consomme le frontend (app/track/[link]/page.tsx).
    res.json({
      title: p.title,
      description: p.description,
      completion_percent: p.completion_percent,
      status: p.status,
      start_date: p.start_date,
      end_date_estimated: p.estimated_end_date,
      end_date_actual: p.actual_end_date,
      whatsapp_link: buildWhatsAppLink(p.client_phone),
      can_review: p.status === "complete",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération du projet" });
  }
});

// POST /api/track/:link/review - le client laisse un avis (uniquement si status = complete)
router.post("/:link/review", async (req, res) => {
  const { link } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Note invalide (1-5)" });
  }

  try {
    const projectResult = await pool.query(
      `SELECT id, status FROM projects WHERE tracking_link = $1`,
      [link]
    );
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Projet introuvable" });
    }
    const project = projectResult.rows[0];
    if (project.status !== "complete") {
      return res.status(403).json({ error: "Avis disponible uniquement après complétion du projet" });
    }

    await pool.query(
      `INSERT INTO reviews (project_id, rating, comment) VALUES ($1, $2, $3)`,
      [project.id, rating, comment]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'avis" });
  }
});

export default router;
