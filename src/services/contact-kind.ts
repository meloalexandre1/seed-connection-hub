/**
 * UI accepts user-friendly labels and older aliases. The database currently
 * enforces CHECK(kind IN ('telefone', 'email', 'outro')).
 * 'phone' is NOT a valid persisted value in this project's database.
 */
export type ContactKind = "telefone" | "email" | "outro";

export function normalizeContactKind(kind: string): ContactKind {
  const key = kind
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s/\-_]+/g, "");

  if (["telefone", "phone", "whatsapp", "whatsapptelefone", "tel", "celular"].includes(key)) {
    return "telefone";
  }
  if (["email", "mail"].includes(key)) return "email";
  if (["outro", "other"].includes(key)) return "outro";

  throw new Error("Tipo de contato não reconhecido. Use telefone, WhatsApp ou e-mail.");
}

export function contactLabel(kind: string): string {
  switch (normalizeContactKind(kind)) {
    case "telefone":
      return "WhatsApp/telefone";
    case "email":
      return "E-mail";
    case "outro":
      return "Outro";
  }
}
