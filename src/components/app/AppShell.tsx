import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meService } from "@/services/live";
import {
  Home,
  Users,
  Plus,
  CheckSquare,
  Sparkles,
  Lightbulb,
  Network,
  FolderKanban,
  CalendarDays,
  BarChart3,
  Settings,
  Menu,
  Search,
  FlaskConical,
  LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SeedLogo } from "./ui-bits";
import { AlertsBell } from "./AlertsBell";

const PRIMARY = [
  { to: "/", label: "Início", icon: Home },
  { to: "/pessoas", label: "Pessoas", icon: Users },
  { to: "/capturar", label: "Capturar", icon: Plus },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/sid", label: "SID", icon: Sparkles },
] as const;
const SECONDARY = [
  { to: "/oportunidades", label: "Oportunidades", icon: Lightbulb },
  { to: "/mapa", label: "Mapa da rede", icon: Network },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/acesso", label: "Acesso e equipe", icon: Users },
] as const;

const linkCls =
  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-areia transition-colors hover:bg-secondary hover:text-foreground";
const activeCls = "bg-lime-deep !text-primary";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
      {PRIMARY.map(({ to, label, icon: I }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={linkCls}
          activeProps={{ className: activeCls }}
          activeOptions={{ exact: to === "/" }}
        >
          <I className="h-[18px] w-[18px]" aria-hidden />
          {label}
        </Link>
      ))}
      <div className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-subtle">
        Mais
      </div>
      {SECONDARY.map(({ to, label, icon: I }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={linkCls}
          activeProps={{ className: activeCls }}
        >
          <I className="h-[18px] w-[18px]" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <SeedLogo className="h-9 w-9" />
      <div className="leading-tight">
        <b className="block text-sm font-semibold">Seed Connection</b>
        <small className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Intelligence OS
        </small>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: meService.get });
  const roleLabel = { admin: "Administrador", gestor: "Gestor", operacional: "Operacional" } as const;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-side p-4 lg:flex">
        <div className="px-2 pb-6">
          <Brand />
        </div>
        <NavList />
        <div className="mt-auto rounded-xl border bg-secondary p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <FlaskConical className="h-4 w-4" aria-hidden />
            Modo misto
          </div>
          <p className="mt-1 text-muted-foreground">
            Pessoas, Tarefas, SID, Agenda, Captura e Mapa usam dados reais. Oportunidades, Projetos
            e Relatórios ainda são demonstração.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div
          role="status"
          className="bg-warning/10 px-4 py-1.5 text-center text-[11px] font-medium text-warning"
        >
          Dados reais: Pessoas, Tarefas, SID, Agenda, Captura e Mapa · demonstração: Oportunidades, Projetos e Relatórios
        </div>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:px-7">
          <button
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-xl hover:bg-secondary lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Brand />
          </div>
          <form
            role="search"
            className="relative ml-auto hidden w-full max-w-md sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate({ to: "/sid", search: { q: q.trim() } });
            }}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Pergunte ao SID ou busque"
              placeholder="Pergunte ao SID ou busque pessoas, tarefas…"
              className="h-11 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none focus:border-lime-line"
            />
          </form>
          <AlertsBell />
          <Link
            to="/configuracoes"
            className="ml-auto flex items-center gap-2 sm:ml-0"
            aria-label="Perfil e configurações"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-n3 text-xs font-bold text-primary-foreground">
              {(me.data?.email[0] ?? "?").toUpperCase()}
            </div>
            <div className="hidden text-xs leading-tight md:block">
              <b className="block max-w-40 truncate text-sm">{me.data?.email ?? "…"}</b>
              <span className="text-muted-foreground">
                {me.data?.role ? roleLabel[me.data.role] : "Sem papel atribuído"}
              </span>
            </div>
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="grid h-11 w-11 place-items-center rounded-xl hover:bg-secondary"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {me.data && !me.data.role && (
          <div role="alert" className="bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
            Sua conta ainda não tem papel (admin/gestor/operacional). O banco bloqueia leituras e gravações até o administrador atribuir um.
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-x-clip px-4 pb-28 pt-5 lg:px-7 lg:pb-10">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-side p-4">
          <SheetHeader className="p-0 pb-4 text-left">
            <SheetTitle asChild>
              <div>
                <Brand />
              </div>
            </SheetTitle>
          </SheetHeader>
          <NavList onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav
        aria-label="Navegação inferior"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY.map(({ to, label, icon: I }) => (
            <li key={to} className="flex justify-center">
              {to === "/capturar" ? (
                <Link
                  to={to}
                  className="-mt-5 flex flex-col items-center gap-1 text-[11px] font-semibold text-primary"
                  aria-label="Capturar"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-capture">
                    <I className="h-7 w-7" aria-hidden />
                  </span>
                  {label}
                </Link>
              ) : (
                <Link
                  to={to}
                  className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
                  activeProps={{ className: "!text-primary" }}
                  activeOptions={{ exact: to === "/" }}
                >
                  <I className="h-5 w-5" aria-hidden />
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
