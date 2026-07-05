// Construit un lien wa.me pré-rempli (ouverture directe de WhatsApp) et
// le texte de notification standard pour la mise à jour de progression.

export function buildWhatsAppLink(phone, message = "") {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}${text ? `?text=${text}` : ""}`;
}

export function buildProgressMessage({ clientName, percent, trackingLink, customMessage }) {
  const bar = "█".repeat(Math.round(percent / 10)) + "░".repeat(10 - Math.round(percent / 10));
  const base = `Salut ${clientName} !\nTon projet est à ${percent}% ✅\nProgression : ${bar} ${percent}%\nVoir détails : https://prospyto.dev/track/${trackingLink}`;
  return customMessage ? `${base}\n\n${customMessage}` : base;
}

export function buildFinalMessage({ clientName, trackingLink }) {
  return `Salut ${clientName} ! 🎉\nTon projet est prêt !\nVoir les détails : https://prospyto.dev/track/${trackingLink}\nSi tu as un instant, un avis serait très apprécié 🙏`;
}
