import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// GET /api/reviews - avis publiés, pour affichage public sur la page de vente
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, c.name AS client_name, p.title AS project_title
       FROM reviews r
       JOIN projects p ON p.id = r.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE r.published = true
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des avis" });
  }
});

export default router;
