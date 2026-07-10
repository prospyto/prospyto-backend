import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// GET /api/blog - liste des articles publiés (public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, created_at
       FROM blog_posts
       WHERE status = 'published'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des articles" });
  }
});

// GET /api/blog/:slug - un article publié (public), incrémente le compteur de vues
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      `UPDATE blog_posts SET views = views + 1
       WHERE slug = $1 AND status = 'published'
       RETURNING id, title, slug, content, views, created_at`,
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération de l'article" });
  }
});

export default router;
