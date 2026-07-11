import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    console.error("ADMIN_EMAIL ou ADMIN_PASSWORD_HASH manquant dans .env");
    return res.status(500).json({ error: "Configuration admin manquante" });
  }

  // DIAGNOSTIC TEMPORAIRE (à retirer une fois le login qui fonctionne) :
  // logs uniquement, jamais renvoyés au client.
  console.log("[login-debug] email reçu:", JSON.stringify(email), "longueur:", email.length);
  console.log("[login-debug] ADMIN_EMAIL configuré:", JSON.stringify(adminEmail), "longueur:", adminEmail.length);
  console.log("[login-debug] emails identiques ?", email === adminEmail);
  console.log("[login-debug] password reçu, longueur:", password.length);
  console.log("[login-debug] hash configuré, longueur:", adminPasswordHash.length, "commence par:", adminPasswordHash.slice(0, 7));

  if (email !== adminEmail) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const match = await bcrypt.compare(password, adminPasswordHash);
  console.log("[login-debug] bcrypt.compare résultat:", match);
  if (!match) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const token = jwt.sign(
    { email: adminEmail, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, expires_in: "12h" });
});

export default router;
