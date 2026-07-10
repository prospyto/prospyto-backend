import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

// Structure de départ pour les tests. Pas de couverture large pour l'instant
// (décision prise le 10/07) : ce fichier sert de squelette à compléter au
// fur et à mesure, avec les patterns déjà en place (supertest + vitest, ESM).
//
// Lancer : npm test
// Watch  : npm run test:watch
//
// Note : ces tests ne touchent pas la DB (pas de DATABASE_URL nécessaire
// pour /health et pour vérifier qu'une route protégée refuse sans token).
// Les tests qui touchent réellement Postgres sont à écrire plus tard, avec
// une DB de test dédiée (voir README pour ne jamais pointer vers la prod).

describe("GET /health", () => {
  it("répond 200 sans authentification", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("Protection des routes admin (JWT)", () => {
  it("refuse GET /api/projects sans token", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });

  it("refuse GET /api/inquiries sans token", async () => {
    const res = await request(app).get("/api/inquiries");
    expect(res.status).toBe(401);
  });

  it("refuse un token invalide", async () => {
    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer token.invalide.ici");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/login", () => {
  it("refuse un email/mot de passe manquant", async () => {
    const res = await request(app).post("/api/admin/login").send({});
    expect(res.status).toBe(400);
  });
});
