import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Plus,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, DemoNotice, DemoTag } from "@/components/app/ui-bits";
import { peopleService } from "@/services";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/sid")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string | undefined; voz?: boolean | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    voz: s["voz"] === true || s["voz"] === "true" ? true : undefined,
  }),
  head: () => pageHead("SID", "Assistente por texto e voz: perguntar e registrar com revisão."),
  component: SidPage,
});

type Mode = "perguntar" | "registrar";
interface Msg {
  role: "user" | "sid";
  text: string;
  mode: Mode;
  refs?: { id: string; name: string }[];
  proposal?: boolean;
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

function SidPage() {
  const { q, voz } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("perguntar");
  const [input, setInput] = useState(q ?? "");
  const [fromVoice, setFromVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([{ id: "c1", title: "Nova conversa", msgs: [] }]);
  const [active, setActive] = useState("c1");
  const recRef = useRef<SR | null>(null);
  const conv = convs.find((c) => c.id === active)!;

  useEffect(() => {
    if (voz) startVoice(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const speak = (t: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Este navegador não reproduz voz.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "pt-BR";
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(u);
  };
  const stopSpeak = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  function startVoice() {
    setVoiceErr(null);
    const W = window as unknown as {
      SpeechRecognition?: new () => SR;
      webkitSpeechRecognition?: new () => SR;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceErr("Reconhecimento de voz indisponível neste navegador. Digite a pergunta.");
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
    r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  }

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const refs = peopleService
      .list()
      .filter((p) => text.toLowerCase().includes((p.name.split(" ")[0] ?? "").toLowerCase()))
      .map((p) => ({ id: p.id, name: p.name }));
    const reply: Msg =
      mode === "perguntar"
        ? {
            role: "sid",
            mode,
            refs,
            text: `Demonstração: o SID ainda não está ligado a um banco de dados nem a um modelo de IA, então não consultou nenhum contato seu.${refs.length ? " Encontrei apenas menções a registros fictícios do modo demo, listados abaixo." : ""} Quando conectado, a resposta virá com fatos, inferências e recomendações separados e com as fontes consultadas. Esta pergunta não criou nenhum registro.`,
          }
        : {
            role: "sid",
            mode,
            refs,
            proposal: true,
            text: `Proposta de registro gerada a partir do que você disse. Nada será alterado sem sua revisão. Na demonstração, a aprovação não salva dados.`,
          };
    setConvs((cs) =>
      cs.map((c) =>
        c.id === active
          ? {
              ...c,
              title: c.msgs.length ? c.title : text.slice(0, 40),
              msgs: [...c.msgs, { role: "user", text, mode }, reply],
            }
          : c,
      ),
    );
    setInput("");
    setFromVoice(false);
    if (autoSpeak) speak(reply.text);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Assistente"
        title="SID"
        actions={<DemoTag>Interface demonstrativa</DemoTag>}
      >
        Pergunte para consultar. Registre para propor mudanças — sempre com revisão.
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Panel
          title="Conversas"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const id = crypto.randomUUID();
                setConvs((c) => [{ id, title: "Nova conversa", msgs: [] }, ...c]);
                setActive(id);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          }
          className="order-2 lg:order-1"
        >
          <ul className="space-y-1">
            {convs.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActive(c.id)}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-secondary",
                    c.id === active && "bg-lime-deep text-primary",
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-subtle">Histórico só nesta sessão (demo).</p>
        </Panel>

        <div className="order-1 flex min-h-[60vh] flex-col rounded-2xl border bg-card bg-glow lg:order-2">
          <div role="tablist" className="flex gap-1 border-b p-2">
            {(["perguntar", "registrar"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "min-h-10 flex-1 rounded-lg text-sm font-semibold text-muted-foreground",
                  mode === m && "bg-lime-deep text-primary",
                )}
              >
                {m === "perguntar" ? "Perguntar" : "Registrar"}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4" aria-live="polite">
            {conv.msgs.length === 0 && (
              <div className="space-y-3 py-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {mode === "perguntar"
                    ? "Ex.: “Com quem devo falar hoje?” — consultas não criam registros."
                    : "Ex.: “Conversei com o Marcelo; prometi apresentação na terça.” — vira proposta para revisar."}
                </p>
              </div>
            )}
            {conv.msgs.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-surface-2"
                    : "border border-lime-line bg-lime-deep",
                )}
              >
                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {m.role === "user" ? `Você · ${m.mode}` : "SID (demo)"}
                </span>
                {m.text}
                {m.refs && m.refs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.refs.map((r) => (
                      <Link
                        key={r.id}
                        to="/pessoas/$id"
                        params={{ id: r.id }}
                        className="rounded-full border px-2 py-0.5 text-[11px] hover:border-primary"
                      >
                        Fonte (fictícia): {r.name}
                      </Link>
                    ))}
                  </div>
                )}
                {m.proposal && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => toast.warning("Demonstração: aprovado, mas nada foi salvo.")}
                    >
                      Revisar e aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setInput(conv.msgs[i - 1]?.text ?? "");
                        setMode("registrar");
                      }}
                    >
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toast("Proposta descartada.")}>
                      Descartar
                    </Button>
                  </div>
                )}
                {m.role === "sid" && (
                  <button
                    onClick={() => (speaking ? stopSpeak() : speak(m.text))}
                    className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-primary"
                  >
                    {speaking ? (
                      <>
                        <VolumeX className="h-4 w-4" />
                        Parar áudio
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        Ouvir resposta
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            {fromVoice && (
              <p className="mb-1 text-xs text-warning">
                Transcrição da voz — revise e corrija antes de enviar.
              </p>
            )}
            {voiceErr && (
              <p role="alert" className="mb-1 flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {voiceErr}
              </p>
            )}
            <div className="flex items-end gap-2">
              <Button
                size="icon"
                variant={listening ? "destructive" : "secondary"}
                className="h-12 w-12 shrink-0"
                aria-label={listening ? "Parar de ouvir" : "Falar"}
                onClick={() => (listening ? recRef.current?.stop() : startVoice())}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                aria-label="Mensagem para o SID"
                placeholder={
                  mode === "perguntar" ? "Pergunte ao SID…" : "Descreva o que aconteceu…"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="min-h-12 resize-none"
              />
              <Button
                size="icon"
                className="h-12 w-12 shrink-0"
                aria-label="Enviar"
                onClick={send}
                disabled={!input.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={autoSpeak} onCheckedChange={setAutoSpeak} />
              Responder por áudio por padrão
            </label>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <DemoNotice>
          O SID trata conteúdo de arquivos como dados, nunca como instruções. Ações externas
          (mensagens, apresentações, agenda) sempre exigirão confirmação.
        </DemoNotice>
      </div>
    </div>
  );
}
