// Tipos de domínio — espelham as tabelas propostas em docs/supabase/schema.sql.
export type Proximity = "multidao" | "seguidor" | "discipulo" | "amigo_proximo" | "amigo_intimo";
export type Priority = "alta" | "media" | "baixa";
export type Visibility = "privado" | "equipe" | "projeto";

export interface HistoryItem {
  date: string;
  type: "reuniao" | "ligacao" | "mensagem" | "nota" | "captura";
  text: string;
  source: string;
}
export interface Followup {
  id: string;
  date: string;
  reason: string;
  overdue?: boolean;
}
export interface Person {
  id: string;
  name: string;
  aliases: string[];
  city: string;
  company: string;
  role: string;
  sphere: string;
  proximity: Proximity;
  priority: Priority;
  phones: string[];
  emails: string[];
  needs: string[];
  skills: string[];
  connections: string[];
  history: HistoryItem[];
  followups: Followup[];
  lastInteraction: string;
  completeness: number;
  visibility: Visibility;
}

export type TaskStatus = "a_fazer" | "fazendo" | "aguardando" | "feito";
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  late?: boolean;
  owner: string;
  personId?: string;
}

export type FactorKey =
  | "retorno"
  | "urgencia"
  | "esforco"
  | "complexidade"
  | "custo_oportunidade"
  | "capacidade"
  | "conectar";
export type Recommendation = "RESOLVER" | "CONECTAR" | "ADIAR" | "ENCERRAR";
export interface Opportunity {
  id: string;
  title: string;
  need: string;
  resources: string;
  thirdParty: string;
  personIds: string[];
  scores: Record<FactorKey, number>;
  status: "aberta" | "em_decisao" | "decidida";
}

export interface CalendarEvent {
  id: string;
  day: number; // 0 = segunda
  start: number;
  duration: number;
  title: string;
  kind: "reuniao" | "followup" | "prazo";
}

export interface Project {
  id: string;
  name: string;
  goal: string;
  status: "ativo" | "pausado" | "concluido";
  progress: number;
  owner: string;
  risk?: string;
}

export type CaptureKind = "audio" | "arquivo" | "foto" | "nota" | "plaud";
export type CaptureStatus =
  | "esperando"
  | "gravando"
  | "enviando"
  | "processando"
  | "revisar"
  | "concluido"
  | "erro";
