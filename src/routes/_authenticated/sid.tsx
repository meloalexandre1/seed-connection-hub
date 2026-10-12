import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  ArrowUp,
  Volume2,
  Square,
  Plus,
  MessageSquare,
  AlertTriangle,
  History,
  X,
  FileText,
  Image as ImageIcon,
  FileAudio,
  Video,
  Radio,
  Disc,
  Lock,
  Check,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SeedLogo } from "@/components/app/ui-bits";
import { askSid, listSidConversations, getSidConversation } from "@/lib/sid.functions";
import { isUuid } from "@/services/live";
import {
  formatSize,
  kindOf,
  type Attachment,
  type SidMode,
  type SidReply,
} from "@/lib/sid-demo";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/sid")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string | undefined; voz?: boolean | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    voz: s["voz"] === true || s["voz"] === "true" ? true : undefined,
  }),
  head: () =>
    pageHead(
      "SID",
      "Converse com o SID por texto, voz e anexos: perguntar e registrar com revisão.",
    ),
  component: SidPage,
});

interface Msg {
  id: string;
  role: "user" | "sid";
  mode: SidMode;
  text: string;
  viaVoice?: boolean;
  attachments?: Attachment[];
  reply?: SidReply;
}
interface Conv {
  id: string;
  title: string;
  msgs: Msg[];
}

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const PROMPTS: { text: string; mode: SidMode }[] = [
  { text: "O que tenho hoje?", mode: "perguntar" },
  { text: "Quem pode ajudar o Carlos?", mode: "perguntar" },
  { text: "Resumir esta reunião", mode: "registrar" },
  { text: "Registrar novo contato", mode: "registrar" },
];

const PICKERS = [
  {
    key: "arquivo",
    label: "Arquivo",
    accept: ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx",
    icon: FileText,
  },
  { key: "imagem", label: "Imagem ou foto", accept: "image/*", icon: ImageIcon },
  { key: "audio", label: "Áudio existente", accept: "audio/*", icon: FileAudio },
  { key: "video", label: "Vídeo", accept: "video/*", icon: Video },
] as const;

const KIND_ICON = { arquivo: FileText, imagem: ImageIcon, audio: FileAudio, video: Video };

function SidPage() {
  const { q, voz } = Route.useSearch();
  const [mode, setMode] = useState<SidMode>("perguntar");
  const [input, setInput] = useState(q ?? "");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [fromVoice, setFromVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conv[]>([{ id: "c1", title: "Nova conversa", msgs: [] }]);
  const [active, setActive] = useState("c1");
  const [historyOpen, setHistoryOpen] = useState(false);
  const recRef = useRef<SR | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const urls = useRef<Set<string>>(new Set());
  const conv = convs.find((c) => c.id === active) ?? convs[0]!;

  // Revoga todas as URLs locais ao sair da tela; para fala em andamento.
  useEffect(() => {
    const set = urls.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
      recRef.current?.stop();
    };
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conv.msgs.length]);
  useEffect(() => {
    if (voz) startVoice(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Carrega conversas salvas no banco (somente as do usuário, via RLS).
  useEffect(() => {
    listSidConversations()
      .then((rows) => {
        if (rows.length)
          setConvs((cs) => {
            const seen = new Set(cs.map((c) => c.id));
            return [
              ...cs,
              ...rows
                .filter((r) => !seen.has(r.id))
                .map((r) => ({ id: r.id, title: r.title ?? "Conversa", msgs: [] })),
            ];
          });
      })
      .catch(() => toast.error("Não foi possível carregar o histórico de conversas."));
  }, []);

  const openConv = (id: string) => {
    setActive(id);
    setHistoryOpen(false);
    const c = convs.find((x) => x.id === id);
    if (!c || c.msgs.length || !isUuid(id)) return;
    getSidConversation({ data: { id } })
      .then((msgs) => {
        setConvs((cs) =>
          cs.map((x) =>
            x.id === id
              ? {
                  ...x,
                  msgs: msgs.map((m) => ({
                    id: m.id,
                    role: m.role === "user" ? ("user" as const) : ("sid" as const),
                    mode: (m.mode === "registrar" ? "registrar" : "perguntar") as SidMode,
                    text: m.content,
                  })),
                }
              : x,
          ),
        );
      })
      .catch(() => toast.error("Não foi possível abrir a conversa."));
  };
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const speak = useCallback((id: string, t: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Este navegador não reproduz voz.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "pt-BR";
    const pt = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt"));
    if (pt) u.voice = pt;
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    speechSynthesis.speak(u);
  }, []);
  const stopSpeak = () => {
    speechSynthesis.cancel();
    setSpeakingId(null);
  };

  function startVoice() {
    setVoiceErr(null);
    const W = window as unknown as {
      SpeechRecognition?: new () => SR;
      webkitSpeechRecognition?: new () => SR;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceErr("Ditado por voz indisponível neste navegador. Digite a mensagem.");
      return;
    }
    const r = new Ctor();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      setInput(
        Array.from(e.results)
          .map((x) => x[0]?.transcript ?? "")
          .join(" "),
      );
      setFromVoice(true);
    };
    r.onerror = () => {
      setVoiceErr("Não foi possível ouvir. Verifique a permissão do microfone.");
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      taRef.current?.focus();
    };
    recRef.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setVoiceErr("Não foi possível iniciar o microfone.");
    }
  }

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => {
      const url = URL.createObjectURL(f);
      urls.current.add(url);
      return {
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        mime: f.type || "application/octet-stream",
        kind: kindOf(f.type),
        url,
      };
    });
    setPending((p) => [...p, ...next]);
    taRef.current?.focus();
  };
  const removePending = (id: string) =>
    setPending((p) => {
      const a = p.find((x) => x.id === id);
      if (a) {
        URL.revokeObjectURL(a.url);
        urls.current.delete(a.url);
      }
      return p.filter((x) => x.id !== id);
    });

  const [sending, setSending] = useState(false);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text && pending.length === 0) return;
    if (sending) return;
    const body = text || "(somente anexos)";
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      mode,
      text: body,
      viaVoice: fromVoice,
      attachments: pending,
    };
    const history = conv.msgs.slice(-12).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));
    setConvs((cs) =>
      cs.map((c) =>
        c.id === active
          ? { ...c, title: c.msgs.length ? c.title : body.slice(0, 40), msgs: [...c.msgs, userMsg] }
          : c,
      ),
    );
    setInput("");
    setPending([]);
    setFromVoice(false);
    setSending(true);
    try {
      const res = await askSid({
        data: {
          conversationId: isUuid(active) ? active : null,
          mode,
          question: body,
          history,
        },
      });
      const sidMsg: Msg = { id: crypto.randomUUID(), role: "sid", mode, text: res.answer };
      setConvs((cs) =>
        cs.map((c) =>
          c.id === active
            ? { ...c, id: res.conversationId, msgs: [...c.msgs, sidMsg] }
            : c,
        ),
      );
      if (!isUuid(active)) setActive(res.conversationId);
      if (autoSpeak) speak(sidMsg.id, res.answer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao falar com o SID.";
      toast.error(msg);
      setConvs((cs) =>
        cs.map((c) =>
          c.id === active
            ? {
                ...c,
                msgs: [
                  ...c.msgs,
                  {
                    id: crypto.randomUUID(),
                    role: "sid" as const,
                    mode,
                    text: `Não consegui responder agora: ${msg}`,
                  },
                ],
              }
            : c,
        ),
      );
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  };

  const setActionStatus = (msgId: string, actionId: string, status: "aprovada" | "descartada") => {
    setConvs((cs) =>
      cs.map((c) => ({
        ...c,
        msgs: c.msgs.map((m) =>
          m.id === msgId && m.reply
            ? {
                ...m,
                reply: {
                  ...m.reply,
                  actions: m.reply.actions.map((a) => (a.id === actionId ? { ...a, status } : a)),
                },
              }
            : m,
        ),
      })),
    );
    toast.warning(
      status === "aprovada"
        ? "Demonstração: aprovado, mas nada foi salvo."
        : "Proposta descartada.",
    );
  };

  const newConv = () => {
    const id = crypto.randomUUID();
    setConvs((c) => [{ id, title: "Nova conversa", msgs: [] }, ...c]);
    setActive(id);
    setHistoryOpen(false);
    taRef.current?.focus();
  };

  const historyList = (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" className="mb-2 h-11 justify-start" onClick={newConv}>
        <Plus className="h-4 w-4" />
        Nova conversa
      </Button>
      <ul className="space-y-1" aria-label="Conversas">
        {convs.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => openConv(c.id)}
              aria-current={c.id === active}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-areia hover:bg-secondary focus-visible:bg-secondary",
                c.id === active && "bg-lime-deep text-primary",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{c.title}</span>
              <span className="ml-auto text-[11px] text-subtle">
                {c.msgs.filter((m) => m.role === "user").length}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 px-1 text-[11px] text-subtle">
        Conversas salvas na sua conta, visíveis só para você.
      </p>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-6xl gap-5 lg:h-[calc(100dvh-9.5rem)]">
      <aside
        className="hidden w-64 shrink-0 overflow-y-auto rounded-2xl border bg-card p-3 lg:block"
        aria-label="Histórico de conversas"
      >
        {historyList}
      </aside>

      <section
        className="flex min-w-0 flex-1 flex-col lg:rounded-2xl lg:border lg:bg-card"
        aria-label="Conversa com o SID"
      >
        {/* Cabeçalho */}
        <header className="flex items-center gap-2 pb-3 lg:border-b lg:px-4 lg:py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 lg:hidden"
            aria-label="Histórico de conversas"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-5 w-5" />
          </Button>
          <SeedLogo className="hidden h-8 w-8 sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">SID</h1>
            <p className="flex items-center gap-1 text-[11px] text-primary">
              IA conectada · responde com os seus dados
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Modo"
            className="ml-auto flex rounded-xl border bg-secondary p-1"
          >
            {(["perguntar", "registrar"] as SidMode[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  mode === m && "bg-primary text-primary-foreground hover:text-primary-foreground",
                )}
              >
                {m === "perguntar" ? "Perguntar" : "Registrar"}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-10 w-10 lg:inline-flex"
            aria-label="Nova conversa"
            onClick={newConv}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        {/* Mensagens */}
        <div
          className="flex-1 space-y-5 overflow-y-auto pb-56 lg:px-5 lg:py-5 lg:pb-5"
          aria-live="polite"
        >
          {conv.msgs.length === 0 ? (
            <div className="flex flex-col items-center px-2 pt-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-lime-line bg-lime-deep">
                <SeedLogo className="h-10 w-10" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Como posso ajudar?</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {mode === "perguntar"
                  ? "Perguntas apenas consultam — nunca alteram registros."
                  : "Registrar gera propostas que você revisa antes de qualquer alteração."}
              </p>
              <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                {PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => {
                      setMode(p.mode);
                      setInput(p.text);
                      taRef.current?.focus();
                    }}
                    className="min-h-10 rounded-full border bg-card px-4 text-sm text-areia transition-colors hover:border-lime-line hover:text-foreground active:bg-lime-deep"
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conv.msgs.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="ml-auto flex max-w-[88%] flex-col items-end gap-1.5 sm:max-w-[75%]"
                >
                  {m.attachments && m.attachments.length > 0 && (
                    <AttachmentGrid items={m.attachments} />
                  )}
                  <div className="rounded-2xl rounded-br-md bg-surface-2 px-4 py-2.5 text-sm">
                    {m.text}
                  </div>
                  <span className="text-[10.5px] text-subtle">
                    {m.mode === "perguntar" ? "Pergunta" : "Registro"}
                    {m.viaVoice && " · ditado no navegador, revisado por você"}
                  </span>
                </div>
              ) : !m.reply ? (
                <article key={m.id} className="flex gap-3" aria-label="Resposta do SID">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-lime-line bg-lime-deep">
                    <SeedLogo className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-card px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {renderMd(m.text)}
                  </div>
                </article>
              ) : (
                m.reply && (
                  <article key={m.id} className="flex gap-3" aria-label="Resposta do SID">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-lime-line bg-lime-deep">
                      <SeedLogo className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3 text-sm">
                      <Section label="Original">
                        <p className="text-muted-foreground">“{m.reply.original}”</p>
                      </Section>
                      <Section label="Interpretação">
                        <p>{m.reply.interpretation}</p>
                      </Section>
                      {m.reply.recommendation && (
                        <Section label="Recomendação">
                          <p>{m.reply.recommendation}</p>
                        </Section>
                      )}
                      {m.reply.attachmentNote && (
                        <p className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-2.5 text-xs text-areia">
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                          {m.reply.attachmentNote}
                        </p>
                      )}
                      {m.reply.refs.length > 0 && (
                        <Section label="Fontes">
                          <div className="flex flex-wrap gap-1.5">
                            {m.reply.refs.map((r) => (
                              <Link
                                key={r.id}
                                to="/pessoas/$id"
                                params={{ id: r.id }}
                                className="inline-flex min-h-8 items-center rounded-full border px-3 text-xs hover:border-primary hover:text-primary"
                              >
                                {r.name} <span className="ml-1 text-subtle">(fictício)</span>
                              </Link>
                            ))}
                          </div>
                        </Section>
                      )}
                      {m.reply.actions.length > 0 && (
                        <Section label="Ações propostas · requerem revisão">
                          <ul className="space-y-2">
                            {m.reply.actions.map((a) => (
                              <li key={a.id} className="rounded-xl border bg-secondary p-3">
                                <p
                                  className={cn(
                                    "text-sm",
                                    a.status === "descartada" && "text-subtle line-through",
                                  )}
                                >
                                  {a.label}
                                </p>
                                {a.status === "pendente" ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => setActionStatus(m.id, a.id, "aprovada")}
                                    >
                                      <Check className="h-4 w-4" />
                                      Aprovar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setMode("registrar");
                                        setInput(m.reply?.original ?? "");
                                        taRef.current?.focus();
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setActionStatus(m.id, a.id, "descartada")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Descartar
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {a.status === "aprovada"
                                      ? "Aprovada na demonstração — não salva."
                                      : "Descartada."}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}
                      <button
                        onClick={() =>
                          speakingId === m.id ? stopSpeak() : speak(m.id, m.reply!.interpretation)
                        }
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-primary"
                        aria-label={speakingId === m.id ? "Parar áudio" : "Ouvir resposta"}
                      >
                        {speakingId === m.id ? (
                          <>
                            <Square className="h-3.5 w-3.5" />
                            Parar áudio
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4" />
                            Ouvir
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                )
              ),
            )
          )}
          {sending && (
            <div className="flex items-center gap-3" role="status" aria-label="SID pensando">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-lime-line bg-lime-deep">
                <SeedLogo className="h-5 w-5" />
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                SID pensando…
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="pb-safe fixed inset-x-0 bottom-[4.25rem] z-30 bg-gradient-to-t from-background via-background to-transparent px-3 pt-4 lg:static lg:bg-none lg:px-4 lg:pb-4 lg:pt-0">
          <div className="mx-auto max-w-3xl">
            {fromVoice && (
              <p className="mb-1.5 px-2 text-xs text-warning">
                Ditado do navegador — revise e corrija antes de enviar.
              </p>
            )}
            {voiceErr && (
              <p
                role="alert"
                className="mb-1.5 flex items-center gap-1 px-2 text-xs text-destructive"
              >
                <AlertTriangle className="h-3 w-3" />
                {voiceErr}
              </p>
            )}
            {listening && (
              <p
                role="status"
                className="mb-1.5 flex items-center gap-1.5 px-2 text-xs text-destructive"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                Ouvindo… toque no microfone para parar
              </p>
            )}

            <div
              className="rounded-3xl border bg-card shadow-lg transition-colors focus-within:border-lime-line"
              onClick={() => taRef.current?.focus()}
            >
              {pending.length > 0 && (
                <ul className="flex gap-2 overflow-x-auto p-3 pb-0" aria-label="Anexos a enviar">
                  {pending.map((a) => (
                    <PendingChip key={a.id} a={a} onRemove={() => removePending(a.id)} />
                  ))}
                </ul>
              )}
              <textarea
                ref={taRef}
                value={input}
                rows={1}
                aria-label={mode === "perguntar" ? "Pergunte ao SID" : "Descreva o que registrar"}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  mode === "perguntar"
                    ? "Pergunte ao SID…"
                    : "Conte o que aconteceu para registrar…"
                }
                className="block max-h-40 w-full resize-none bg-transparent px-4 pt-3 text-[15px] outline-none placeholder:text-subtle"
              />
              <div className="flex items-center gap-1 p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      aria-label="Adicionar anexo ou captura"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" className="w-60">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Anexar (fica só no navegador)
                    </DropdownMenuLabel>
                    {PICKERS.map(({ key, label, icon: I }) => (
                      <DropdownMenuItem
                        key={key}
                        className="min-h-10"
                        onSelect={() => fileRefs.current[key]?.click()}
                      >
                        <I className="h-4 w-4" />
                        {label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="min-h-10">
                      <Link to="/capturar" search={{ modo: "audio" }}>
                        <Disc className="h-4 w-4 text-destructive" />
                        Gravar áudio longo
                      </Link>
                    </DropdownMenuItem>
                    <p className="px-2 pb-1 text-[11px] leading-snug text-subtle">
                      No navegador, a gravação para se a tela bloquear ou o app fechar.
                    </p>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="min-h-10 sm:hidden" onSelect={() => setAutoSpeak((v) => !v)}>
                      <Volume2 className="h-4 w-4" />
                      Resposta falada: {autoSpeak ? "ligada" : "desligada"}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="min-h-10">
                      <Radio className="h-4 w-4" />
                      PLAUD <span className="ml-auto text-[10px]">futuro</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {PICKERS.map(({ key, accept }) => (
                  <input
                    key={key}
                    ref={(el) => {
                      fileRefs.current[key] = el;
                    }}
                    type="file"
                    multiple
                    accept={accept}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                ))}
                <label
                  className="ml-1 hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch
                    checked={autoSpeak}
                    onCheckedChange={setAutoSpeak}
                    aria-label="Responder por áudio"
                  />
                  Resposta falada
                </label>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant={listening ? "destructive" : "ghost"}
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    aria-label={listening ? "Parar ditado" : "Ditar pergunta"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (listening) recRef.current?.stop();
                      else startVoice();
                    }}
                  >
                    {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    aria-label="Enviar"
                    disabled={sending || (!input.trim() && pending.length === 0)}
                    onClick={(e) => {
                      e.stopPropagation();
                      send();
                    }}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[10.5px] text-subtle">
              O SID responde com IA usando apenas os dados que você tem permissão de ver.
              Anexos ainda não são analisados pela IA.
            </p>
          </div>
        </div>
      </section>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-80 p-4">
          <SheetHeader className="p-0 pb-3 text-left">
            <SheetTitle>Conversas</SheetTitle>
            <SheetDescription>Histórico desta sessão</SheetDescription>
          </SheetHeader>
          {historyList}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      {children}
    </div>
  );
}

function PendingChip({ a, onRemove }: { a: Attachment; onRemove: () => void }) {
  const I = KIND_ICON[a.kind];
  return (
    <li
      className="relative flex w-52 shrink-0 items-center gap-2 rounded-2xl border bg-secondary p-2"
      onClick={(e) => e.stopPropagation()}
    >
      {a.kind === "imagem" ? (
        <img src={a.url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-2">
          <I className="h-5 w-5 text-primary" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{a.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {a.kind} · {formatSize(a.size)}
        </p>
      </div>
      <button
        onClick={onRemove}
        aria-label={`Remover ${a.name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-surface-2"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function AttachmentGrid({ items }: { items: Attachment[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {items.map((a) => {
        const I = KIND_ICON[a.kind];
        if (a.kind === "imagem")
          return (
            <img
              key={a.id}
              src={a.url}
              alt={a.name}
              className="h-28 w-28 rounded-xl border object-cover"
            />
          );
        if (a.kind === "audio")
          return (
            <div key={a.id} className="w-64 rounded-xl border bg-secondary p-2">
              <p className="mb-1 truncate text-xs">{a.name}</p>
              <audio controls src={a.url} className="w-full" />
            </div>
          );
        return (
          <div
            key={a.id}
            className="flex w-56 items-center gap-2 rounded-xl border bg-secondary p-2"
          >
            <I className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{a.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {a.kind} · {formatSize(a.size)} · não enviado
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
