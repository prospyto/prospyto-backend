import { Resend } from "resend";

let resendClient = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// Adresse d'envoi. "onboarding@resend.dev" fonctionne sans domaine vérifié,
// mais Resend ne livre alors qu'à l'adresse du compte Resend lui-même
// (mode bac à sable). Une fois un domaine vérifié sur resend.com/domains,
// remplace EMAIL_FROM par ex. "Prospère <contact@prospyto.dev>".
const FROM = process.env.EMAIL_FROM || "Prospère <onboarding@resend.dev>";

/**
 * Envoie un email. Ne lance jamais d'exception : un échec d'email ne doit
 * jamais casser une requête métier (création d'inquiry, conversion projet…).
 * Retourne { ok: boolean, error?: string }.
 */
export async function sendEmail({ to, subject, html }) {
  const client = getClient();

  if (!client) {
    console.warn("RESEND_API_KEY manquant : email non envoyé ->", subject);
    return { ok: false, error: "RESEND_API_KEY manquant" };
  }

  try {
    const result = await client.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      console.error("Erreur envoi email:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("Erreur envoi email:", err);
    return { ok: false, error: err.message };
  }
}

export function inquiryConfirmationEmail({ clientName, projectType }) {
  return {
    subject: "Ta demande a bien été reçue",
    html: `
      <p>Bonjour ${escapeHtml(clientName)},</p>
      <p>Ta demande concernant <strong>${escapeHtml(projectType)}</strong> a bien été reçue.</p>
      <p>Je reviens vers toi très prochainement pour en discuter.</p>
      <p>— Prospère</p>
    `,
  };
}

export function newInquiryAdminEmail({ clientName, clientEmail, clientPhone, projectType, description }) {
  return {
    subject: `Nouvelle demande : ${projectType}`,
    html: `
      <p><strong>${escapeHtml(clientName)}</strong> (${escapeHtml(clientEmail)}, ${escapeHtml(clientPhone)})</p>
      <p><strong>Type :</strong> ${escapeHtml(projectType)}</p>
      <p><strong>Description :</strong><br/>${escapeHtml(description)}</p>
    `,
  };
}

export function projectCreatedEmail({ clientName, projectTitle, trackingLink }) {
  const url = `${process.env.FRONTEND_URL || ""}/track/${trackingLink}`;
  return {
    subject: `Ton projet "${projectTitle}" est lancé`,
    html: `
      <p>Bonjour ${escapeHtml(clientName)},</p>
      <p>Ton projet <strong>${escapeHtml(projectTitle)}</strong> est officiellement lancé.</p>
      <p>Tu peux suivre l'avancement à tout moment ici : <a href="${url}">${url}</a></p>
      <p>— Prospère</p>
    `,
  };
}

// Échappement HTML basique : les champs utilisateur (nom, description…) ne
// doivent jamais être injectés tels quels dans un email HTML.
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
