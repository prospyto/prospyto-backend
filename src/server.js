import express from "express";
import cors from "cors";
import "dotenv/config";

import adminRouter from "./routes/admin.js";
import inquiriesRouter from "./routes/inquiries.js";
import projectsRouter from "./routes/projects.js";
import trackRouter from "./routes/track.js";
import reviewsRouter from "./routes/reviews.js";
import blogRouter from "./routes/blog.js";
import blogAdminRouter from "./routes/blogAdmin.js";
import analyticsRouter from "./routes/analytics.js";
import analyticsAdminRouter from "./routes/analyticsAdmin.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Login admin -> renvoie un JWT (route publique, JAMAIS derrière requireAuth)
app.use("/api/admin", adminRouter);

// Formulaire client -> crée une inquiry
app.use("/api/inquiries", inquiriesRouter);

// Gestion admin des projets (progression, notifications, statut)
app.use("/api/projects", projectsRouter);

// Lecture publique via tracking_link (dashboard client, sans auth)
app.use("/api/track", trackRouter);

// Avis publiés, pour la page de vente
app.use("/api/reviews", reviewsRouter);

// Blog : lecture publique, gestion CMS réservée à l'admin
app.use("/api/blog", blogRouter);
app.use("/api/admin/blog", blogAdminRouter);

// Analytics : tracking public, dashboard agrégé réservé à l'admin
app.use("/api/analytics", analyticsRouter);
app.use("/api/admin/analytics", analyticsAdminRouter);

app.listen(PORT, () => {
  console.log(`Prospyto backend running on port ${PORT}`);
});
