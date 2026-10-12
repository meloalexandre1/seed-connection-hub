import {describe,expect,it} from "vitest";
import {daysFromToday,duePhrase,taskAlerts,followupAlerts,auditAlerts,brazilToday} from "./alerts";

describe("Seed Connection notification rules",()=>{
  it("uses date-only deadlines without timezone shift",()=>{
    expect(daysFromToday("2026-10-13","2026-10-12")).toBe(1);
    expect(daysFromToday("2026-10-11","2026-10-12")).toBe(-1);
    expect(duePhrase(0)).toBe("Vence hoje");
  });
  it("shows tasks due within two days and excludes complete tasks",()=>{
    const result=taskAlerts([
      {id:"a",title:"Telefonar",due_date:"2026-10-13",priority:"alta",status:"a_fazer"},
      {id:"b",title:"Feita",due_date:"2026-10-12",priority:"media",status:"feito"},
      {id:"c",title:"Depois",due_date:"2026-10-20",priority:"baixa",status:"a_fazer"},
    ],"2026-10-12");
    expect(result.map(a=>a.title)).toEqual(["Telefonar"]);
    expect(result[0]?.href).toBe("/tarefas");
  });
  it("shows late followups tied to known person",()=>{
    const result=followupAlerts([
      {id:"x",person_id:"p1",reason:"Ver proposta",due_date:"2026-10-11",done_at:null}
    ],new Map([["p1","Contato X"]]),"2026-10-12");
    expect(result[0]?.title).toContain("Contato X");
    expect(result[0]?.urgent).toBe(true);
    expect(result[0]?.href).toBe("/agenda");
  });
  it("does not display own changes as admin notifications",()=>{
    const a=auditAlerts([
      {id:3,actor_id:"u2",table_name:"tasks",action:"UPDATE",at:"2026-10-12T12:00:00Z"},
      {id:4,actor_id:"u1",table_name:"people",action:"INSERT",at:"2026-10-12T12:00:00Z"},
    ],"u1");
    expect(a).toHaveLength(1);
    expect(a[0]?.kind).toBe("alteracao");
  });
  it("formats Brazilian today independent from host timezone",()=>{
    expect(brazilToday(new Date("2026-10-13T01:00:00Z"))).toBe("2026-10-12");
  });
});