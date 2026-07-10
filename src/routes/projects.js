import { Router } from "express";
import { pool } from "../db/pool.js";
import { buildWhatsAppLink, buildProgressMessage, buildFinalMessage } from "../utils/whatsapp.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Toutes les routes de ce fichier sont réservées à l'admin.
router.use(requireAuth);

// GET /api/projects - liste tous les projets (admin)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.tracking_link, p.completion_percent, p.status,
              p.start_date, p.estimated_end_date,
              c.name AS client_name, c.phone AS client_phone, c.email AS client_email
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des projets" });
  }
});

// PATCH /api/projects/:id/progress - slider/input/+boutons de progression
router.patch("/:id/progress", async (req, res) => {
  const { id } = req.params;
  const { percent } = req.body;

  if (percent === undefined || percent < 0 || percent > 100) {
    return res.status(400).json({ error: "Progression invalide (0-100)" });
  }

  try {
    const result = await pool.query(
      `UPDATE projects SET completion_percent = $1, updated_at = now() WHERE id = $2
       RETURNING id, completion_percent, status`,
      [percent, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Projet introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de la progression" });
  }
});

// PATCH /api/projects/:id/status - changer discussion / en_cours / complete
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["discussion", "en_cours", "complete"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    const fields = ["status = $1", "updated_at = now()"];
    const values = [status];
    if (status === "complete") {
      fields.push("actual_end_date = now()");
      fields.push("completion_percent = 100");
    }

    const result = await pool.query(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = $2 RETURNING id, status, completion_percent`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Projet introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du changement de statut" });
  }
});

// GET /api/projects/:id/whatsapp-link - bouton "Ouvrir WhatsApp" (lien direct, sans message)
router.get("/:id/whatsapp-link", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT phone FROM clients c
      JOIN projects p ON p.client_id = c.id WHERE p.id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Projet introuvable" });
    }
    res.json({ link: buildWhatsAppLink(result.rows[0].phone) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération du lien WhatsApp" });
  }
});

// POST /api/projects/:id/notify - bouton "Envoyer notification"
router.post("/:id/notify", async (req, res) => {
  const { id } = req.params;
  const { type = "progress", custom_message } = req.body;

  try {
    const result = await pool.query(
      `SELECT p.completion_percent, p.tracking_link, c.name AS client_name, c.phone AS client_phone
       FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Projet introuvable" });
    }
    const project = result.rows[0];

    const message =
      type === "final"
        ? buildFinalMessage({ clientName: project.client_name, trackingLink: project.tracking_link })
        : buildProgressMessage({
            clientName: project.client_name,
            percent: project.completion_percent,
            trackingLink: project.tracking_link,
            customMessage: custom_message,
          });

    await pool.query(
      `INSERT INTO notifications (project_id, type, message) VALUES ($1, $2, $3)`,
      [id, type, message]
    );

    // Le message est prêt à être envoyé : le front ouvre ce lien wa.me
    res.status(201).json({ whatsapp_link: buildWhatsAppLink(project.client_phone, message), message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi de la notification" });
  }
});

// POST /api/projects/:id/notes - note interne (jamais envoyée au client)
router.post("/:id/notes", async (req, res) => {
  // Placeholder simple : à brancher sur une table `project_notes` si besoin de plus qu'une note.
  res.status(501).json({ error: "À implémenter : table project_notes" });
});

export default router;
