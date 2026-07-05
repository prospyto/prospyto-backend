import crypto from "crypto";

// Génère un token aléatoire de ~10 caractères pour prospyto.dev/track/xxxx
export function generateTrackingLink() {
  return crypto.randomBytes(8).toString("base64url").slice(0, 10);
}
