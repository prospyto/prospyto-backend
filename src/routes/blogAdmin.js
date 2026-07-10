import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const query = excludeId
      ? `SELECT id FROM blog_posts WHERE slug = $1 AND id != $2`
      : `SELECT id FROM blog_posts WHERE slug = $1`;
    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}

// GET /api/admin/blog - tous les articles, brouillons inclus
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, status, views, created_at FROM blog_posts ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des articles" });
  }
});

// GET /api/admin/blog/:id - un article, brouillon ou publié
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM blog_posts WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération de l'article" });
  }
});

// POST /api/admin/blog - créer un article (brouillon par défaut)
router.post("/", async (req, res) => {
  const { title, content, status = "draft" } = req.body;

  if (!title || !title.trim() || !content || !content.trim()) {
    return res.status(400).json({ error: "Titre et contenu requis" });
  }
  if (!["draft", "published"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    const slug = await uniqueSlug(slugify(title));
    const result = await pool.query(
      `INSERT INTO blog_posts (title, slug, content, status) VALUES ($1, $2, $3, $4)
       RETURNING id, title, slug, content, status, views, created_at`,
      [title.trim(), slug, content.trim(), status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création de l'article" });
  }
});

// PATCH /api/admin/blog/:id - modifier un article (titre, contenu, statut)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, status } = req.body;

  if (status && !["draft", "published"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    const existing = await pool.query(`SELECT * FROM blog_posts WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Article introuvable" });
    }
    const current = existing.rows[0];

    const newTitle = title !== undefined ? title.trim() : current.title;
    const newContent = content !== undefined ? content.trim() : current.content;
    const newStatus = status !== undefined ? status : current.status;
    // Le slug ne change que si le titre change, pour ne pas casser les liens partagés.
    const newSlug =
      title !== undefined && title.trim() !== current.title
        ? await uniqueSlug(slugify(title), id)
        : current.slug;

    const result = await pool.query(
      `UPDATE blog_posts SET title = $1, slug = $2, content = $3, status = $4
       WHERE id = $5
       RETURNING id, title, slug, content, status, views, created_at`,
      [newTitle, newSlug, newContent, newStatus, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de l'article" });
  }
});

// DELETE /api/admin/blog/:id - supprimer un article
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM blog_posts WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article introuvable" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'article" });
  }
});

export default router;
