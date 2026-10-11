import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeedLogo } from "@/components/app/ui-bits";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  head: () => pageHead("Entrar", "Acesso privado por convite ao Seed Connection."),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "senha">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Convite/recuperação: o link traz uma sessão; pedimos para definir a senha.
  useEffect(() => {
    const h = window.location.hash;
    if (h.includes("type=invite") || h.includes("type=recovery")) setMode("senha");
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY") setMode("senha");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (password.length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Senha definida.");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : err instanceof Error
            ? err.message
            : "Não foi possível entrar.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) return toast.error("Digite seu e-mail primeiro.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Se o e-mail tiver convite, enviamos um link de redefinição.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <SeedLogo className="h-10 w-10" />
          <div className="leading-tight">
            <b className="block font-semibold">Seed Connection</b>
            <small className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Intelligence OS
            </small>
          </div>
        </div>
        <h1 className="text-xl font-semibold">{mode === "login" ? "Entrar" : "Definir senha"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Acesso privado. Somente pessoas convidadas pelo proprietário."
            : "Crie sua senha para concluir o acesso."}
        </p>
        <form onSubmit={submit} className="mt-5 grid gap-3">
          {mode === "login" && (
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="pw">{mode === "login" ? "Senha" : "Nova senha"}</Label>
            <Input
              id="pw"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Salvar senha"}
          </Button>
          {mode === "login" && (
            <button type="button" onClick={forgot} className="text-xs text-muted-foreground hover:text-foreground">
              Esqueci minha senha
            </button>
          )}
        </form>
        <p className="mt-6 text-[11px] text-subtle">Não há cadastro público.</p>
      </div>
    </div>
  );
}
