import type { ReactNode } from "react";
import { FlaskConical, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import seedLogoAsset from "@/assets/seed-logo.png.asset.json";
import { proximityOf } from "@/services";
import type { Priority, Proximity } from "@/types/domain";

export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl border bg-card p-4", className)}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action && <div className="ml-auto text-xs">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function DemoTag({ children = "Exemplo fictício" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-warning">
      <FlaskConical className="h-3 w-3" aria-hidden /> {children}
    </span>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-areia"
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed p-8 text-center">
      <Inbox className="h-8 w-8 text-subtle" aria-hidden />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LevelBadge({ level }: { level: Proximity }) {
  const p = proximityOf(level);
  return (
    <span
      className={cn("whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-semibold", p.tone)}
    >
      {p.label}
    </span>
  );
}

const PRIO: Record<Priority, string> = {
  alta: "border-destructive/50 text-destructive",
  media: "border-warning/50 text-warning",
  baixa: "border-border text-muted-foreground",
};
export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        PRIO[p],
      )}
    >
      Prioridade {p === "media" ? "média" : p}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const ini = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-n3 text-xs font-bold text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      {ini}
    </div>
  );
}

export function SeedLogo({ className }: { className?: string }) {
  return (
    <img
      src={seedLogoAsset.url}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
