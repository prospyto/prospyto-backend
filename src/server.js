import express from "express";
import cors from "cors";
import "dotenv/config";

import inquiriesRouter from "./routes/inquiries.js";
import projectsRouter from "./routes/projects.js";
import trackRouter from "./routes/track.js";
import reviewsRouter from "./routes/reviews.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Formulaire client -> crée une inquiry
app.use("/api/inquiries", inquiriesRouter);

// Gestion admin des projets (progression, notifications, statut)
app.use("/api/projects", projectsRouter);

// Lecture publique via tracking_link (dashboard client, sans auth)
app.use("/api/track", trackRouter);

// Avis publiés, pour la page de vente
app.use("/api/reviews", reviewsRouter);

app.listen(PORT, () => {
  console.log(`Prospyto backend running on port ${PORT}`);
});
