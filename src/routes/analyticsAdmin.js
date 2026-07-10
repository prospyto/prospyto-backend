import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/admin/analytics?days=30 - vue d'ensemble pour le dashboard
router.get("/", async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

  try {
    const [byType, bySection, bySource, daily, totalEvents, inquiries, projectsByStatus, blogViews] =
      await Promise.all([
        pool.query(
          `SELECT event_type, COUNT(*)::int AS count FROM page_events
           WHERE created_at >= now() - ($1 || ' days')::interval
           GROUP BY event_type ORDER BY count DESC`,
          [days]
        ),
        pool.query(
          `SELECT COALESCE(section, 'inconnu') AS section, COUNT(*)::int AS count FROM page_events
           WHERE created_at >= now() - ($1 || ' days')::interval
           GROUP BY section ORDER BY count DESC`,
          [days]
        ),
        pool.query(
          `SELECT COALESCE(source, 'direct') AS source, COUNT(*)::int AS count FROM page_events
           WHERE created_at >= now() - ($1 || ' days')::interval
           GROUP BY source ORDER BY count DESC`,
          [days]
        ),
        pool.query(
          `SELECT date_trunc('day', created_at)::date AS date, COUNT(*)::int AS count
           FROM page_events
           WHERE created_at >= now() - ($1 || ' days')::interval
           GROUP BY date ORDER BY date ASC`,
          [days]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM page_events
           WHERE created_at >= now() - ($1 || ' days')::interval`,
          [days]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM inquiries
           WHERE created_at >= now() - ($1 || ' days')::interval`,
          [days]
        ),
        pool.query(`SELECT status, COUNT(*)::int AS count FROM projects GROUP BY status`),
        pool.query(`SELECT COALESCE(SUM(views), 0)::int AS total_views FROM blog_posts`),
      ]);

    res.json({
      period_days: days,
      total_events: totalEvents.rows[0].count,
      by_event_type: byType.rows,
      by_section: bySection.rows,
      by_source: bySource.rows,
      daily: daily.rows,
      new_inquiries: inquiries.rows[0].count,
      projects_by_status: projectsByStatus.rows,
      total_blog_views: blogViews.rows[0].total_views,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des analytics" });
  }
});

export default router;
