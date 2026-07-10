import { Router } from "express";
import { pool } from "../db/pool.js";
import { generateTrackingLink } from "../utils/generateTrackingLink.js";
import { requireAuth } from "../middleware/auth.js";
import { sendEmail, inquiryConfirmationEmail, newInquiryAdminEmail, projectCreatedEmail } from "../utils/email.js";

const router = Router();

// POST /api/inquiries - formulaire public (nouveau client + nouvelle demande)
router.post("/", async (req, res) => {
  const { name, email, phone, project_type, description, budget, timeline } = req.body;

  if (!name || !email || !phone || !project_type || !description) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const clientResult = await client.query(
      `INSERT INTO clients (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
      [name, email, phone]
    );
    const clientId = clientResult.rows[0].id;

    const inquiryResult = await client.query(
      `INSERT INTO inquiries (client_id, project_type, description, budget, timeline)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [clientId, project_type, description, budget, timeline]
    );

    await client.query("COMMIT");

    // Best-effort : un échec d'email ne doit jamais faire échouer la requête.
    // On ne bloque pas la réponse dessus (pas de await sur la promesse globale).
    if (process.env.ADMIN_EMAIL) {
      sendEmail({ to: email, ...inquiryConfirmationEmail({ clientName: name, projectType: project_type }) });
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        ...newInquiryAdminEmail({ clientName: name, clientEmail: email, clientPhone: phone, projectType: project_type, description }),
      });
    }

    res.status(201).json({ inquiry_id: inquiryResult.rows[0].id, client_id: clientId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création de la demande" });
  } finally {
    client.release();
  }
});

// GET /api/inquiries - liste des demandes en attente (admin)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.project_type, i.description, i.budget, i.timeline, i.created_at,
              c.id AS client_id, c.name, c.email, c.phone
       FROM inquiries i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN projects p ON p.inquiry_id = i.id
       WHERE p.id IS NULL
       ORDER BY i.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des demandes" });
  }
});

// POST /api/inquiries/:id/convert - transforme une inquiry en projet (génère le lien unique) (admin)
router.post("/:id/convert", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const inquiryResult = await pool.query(
      `SELECT i.client_id, c.name AS client_name, c.email AS client_email
       FROM inquiries i JOIN clients c ON c.id = i.client_id
       WHERE i.id = $1`,
      [id]
    );
    if (inquiryResult.rows.length === 0) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    const { client_id, client_name, client_email } = inquiryResult.rows[0];
    const trackingLink = generateTrackingLink();

    const projectResult = await pool.query(
      `INSERT INTO projects (client_id, inquiry_id, title, description, tracking_link)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, tracking_link`,
      [client_id, id, title, description, trackingLink]
    );

    sendEmail({
      to: client_email,
      ...projectCreatedEmail({ clientName: client_name, projectTitle: title, trackingLink }),
    });

    res.status(201).json(projectResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du projet" });
  }
});

export default router;
