import { describe, expect, it } from "vitest";
import {
  classifyLocalSidQuestion,
  formatTaskReply,
  formatFollowupReply,
  formatCapturesReply,
  localSidScopeNotice,
} from "./sidLocalQueries";

describe("SID free structured database queries",()=>{
  it.each([
    ["O que tenho hoje?", "today"],
    ["Tarefas de hoje", "today"],
    ["Quais minhas tarefas pendentes?", "tasks"],
    ["Próximos follow-ups", "followups"],
    ["Quantas pessoas estão cadastradas?", "contacts"],
    ["Últimas capturas", "captures"],
  ] as const)("classifies %s as %s", (q,expected)=>{
    expect(classifyLocalSidQuestion(q)).toBe(expected);
  });
  it("does not invent a deterministic answer for an arbitrary question",()=>{
    expect(classifyLocalSidQuestion("Quem pode ajudar o Carlos?")).toBe(null);
  });
  it("handles no tasks as no tasks, not sample data",()=>{
    const s=formatTaskReply([],"2026-10-12","Tarefas hoje:");
    expect(s).toContain("Nenhuma tarefa encontrada");
    expect(s).toContain(localSidScopeNotice);
  });
  it("formats real task dates",()=>{
    const s=formatTaskReply([{title:"Ligar cliente",due_date:"2026-10-12",status:"a_fazer",priority:"alta"}],"2026-10-12","Hoje:");
    expect(s).toContain("Ligar cliente");
    expect(s).toContain("2026-10-12");
  });
  it("formats followups with people actually found in the database",()=>{
    const s=formatFollowupReply([{reason:"Renovar proposta",due_date:"2026-10-12",person_id:"id1",done_at:null}],new Map([["id1","Cliente exemplo"]]),"Pendente:");
    expect(s).toContain("Cliente exemplo");
  });
  it("formats saved notes and identifies non-AI mode",()=>{
    const s=formatCapturesReply([{title:"Resumo de reunião",kind:"nota",status:"revisar",received_at:"2026-10-12T12:00:00Z"}]);
    expect(s).toContain("Resumo de reunião");
    expect(s).toContain(localSidScopeNotice);
  });
});
