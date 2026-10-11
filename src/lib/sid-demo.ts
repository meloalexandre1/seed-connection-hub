// Respostas do SID em MODO DEMONSTRAÇÃO. Não há IA nem banco conectados:
// nada aqui finge consultar dados reais, transcrever áudio ou salvar arquivos.
import type { Person } from "@/types/domain";

export type SidMode = "perguntar" | "registrar";
export type AttachmentKind = "arquivo" | "imagem" | "audio" | "video";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: AttachmentKind;
  url: string; // URL local (blob:) — revogada ao remover/sair
}

export interface ProposedAction {
  id: string;
  label: string;
  status: "pendente" | "aprovada" | "descartada";
}

export interface SidReply {
  original: string;
  interpretation: string;
  recommendation: string | null;
  refs: { id: string; name: string }[];
  actions: ProposedAction[];
  attachmentNote: string | null;
}

export function kindOf(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "arquivo";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildDemoReply(
  mode: SidMode,
  text: string,
  attachments: Pick<Attachment, "name">[],
  people: Pick<Person, "id" | "name">[],
): SidReply {
  const lower = text.toLowerCase();
  const refs = people
    .filter((p) => {
      const first = (p.name.split(" ")[0] ?? "").toLowerCase();
      return first.length > 2 && lower.includes(first);
    })
    .map((p) => ({ id: p.id, name: p.name }));

  const attachmentNote = attachments.length
    ? `${attachments.length} anexo(s) ficaram apenas no seu navegador. Nenhum arquivo foi enviado, salvo ou analisado: leitura, transcrição e visão aguardam o backend e o serviço de IA.`
    : null;

  if (mode === "perguntar") {
    return {
      original: text,
      interpretation:
        "Interpretação indisponível: o SID ainda não está ligado a um modelo de IA nem ao banco de dados. Nenhum contato seu foi consultado.",
      recommendation: null,
      refs,
      actions: [],
      attachmentNote,
    };
  }

  return {
    original: text,
    interpretation:
      "Extração automática indisponível no modo demonstração. Com o backend, o SID identificaria pessoas, necessidades, compromissos e prazos — separando fato de inferência.",
    recommendation: "Revise o texto original e crie o registro manualmente quando o backend estiver conectado.",
    refs,
    actions: [
      { id: "a1", label: "Criar captura com este texto e anexos", status: "pendente" },
      ...(refs.length ? [{ id: "a2", label: `Vincular a ${refs.map((r) => r.name).join(", ")}`, status: "pendente" as const }] : []),
    ],
    attachmentNote,
  };
}
