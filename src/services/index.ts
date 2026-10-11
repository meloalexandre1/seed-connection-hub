// Camada de acesso a dados. Hoje: somente DEMO em memória (nada persiste).
// Quando o Supabase externo for conectado, substitua as implementações por
// chamadas ao cliente Supabase (chave publicável + RLS). Nunca use service key no front.
import { DEMO_EVENTS, DEMO_OPPORTUNITIES, DEMO_PEOPLE, DEMO_PROJECTS, DEMO_TASKS } from "./demo-data";
import type { Proximity } from "@/types/domain";

export type DataMode = "demo" | "supabase";
export const DATA_MODE: DataMode = "demo";

export const peopleService = {
  list: () => DEMO_PEOPLE,
  get: (id: string) => DEMO_PEOPLE.find((p) => p.id === id),
};
export const tasksService = { list: () => DEMO_TASKS };
export const opportunitiesService = { list: () => DEMO_OPPORTUNITIES };
export const eventsService = { list: () => DEMO_EVENTS };
export const projectsService = { list: () => DEMO_PROJECTS };

export const PROXIMITY: { key: Proximity; label: string; tone: string }[] = [
  { key: "multidao", label: "Multidão", tone: "bg-n1 text-foreground" },
  { key: "seguidor", label: "Seguidor", tone: "bg-n2 text-primary-foreground" },
  { key: "discipulo", label: "Discípulo", tone: "bg-n3 text-primary-foreground" },
  { key: "amigo_proximo", label: "Amigo próximo", tone: "bg-n4 text-primary-foreground" },
  { key: "amigo_intimo", label: "Amigo íntimo", tone: "bg-n5 text-primary-foreground" },
];
export const proximityOf = (k: Proximity) => PROXIMITY.find((p) => p.key === k)!;

export const normalizePhone = (p: string) => p.replace(/\D/g, "").replace(/^55/, "");
