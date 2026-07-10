import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/admin/reviews - tous les avis, publiés ou non
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.published, r.created_at,
              c.name AS client_name, p.title AS project_title
       FROM reviews r
       JOIN projects p ON p.id = r.project_id
       JOIN clients c ON c.id = p.client_id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des avis" });
  }
});

// PATCH /api/admin/reviews/:id - publier / dépublier un avis
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { published } = req.body;

  if (typeof published !== "boolean") {
    return res.status(400).json({ error: "Le champ 'published' (booléen) est requis" });
  }

  try {
    const result = await pool.query(
      `UPDATE reviews SET published = $1 WHERE id = $2 RETURNING id, published`,
      [published, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Avis introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'avis" });
  }
});

// DELETE /api/admin/reviews/:id - supprimer un avis (ex: spam, avis inapproprié)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM reviews WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Avis introuvable" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'avis" });
  }
});

export default router;
