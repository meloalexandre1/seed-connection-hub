import {
  classifyLocalSidQuestion,
  formatTaskReply, formatFollowupReply, formatCapturesReply, localSidScopeNotice,
} from "./sidLocalQueries";

type Context = { supabase: any; userId: string };
function todayBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone:"America/Sao_Paulo", year:"numeric",month:"2-digit",day:"2-digit",
  }).format(new Date());
}
function ensureNoError(r: {error?: {message:string}|null}) {
  if(r.error) throw new Error("Não foi possível consultar seus dados no Supabase. " + r.error.message);
}
export async function answerSidLocally(opts: {
  mode: "registrar" | "perguntar";
  question: string;
  context: Context;
}): Promise<string|null> {
  const {mode, question, context} = opts;
  const {supabase,userId}=context;
  if(mode==="registrar"){
    const title="Registro pelo SID · " + question.trim().replace(/\s+/g," ").slice(0,75);
    const saved=await supabase.from("captures").insert({
      owner_id:userId,visibility:"privado",source:"captura",kind:"nota",
      title,note:question.trim(),status:"revisar",
    }).select("id").single();
    ensureNoError(saved);
    if(!saved.data?.id) throw new Error("Não foi possível confirmar o salvamento desta nota.");
    return [
      "Registrei sua mensagem como **nota privada** na Central de Captura.",
      "Estado: aguardando revisão.",
      "O texto original foi preservado. Não criei pessoas, tarefas ou oportunidades automaticamente.",
      "Para organizar essas informações em cadastros, abra a Central de Captura e revise o registro.",
      "",
      localSidScopeNotice,
    ].join("\n");
  }
  const kind=classifyLocalSidQuestion(question);
  if(!kind)return null;
  const today=todayBrazil();
  if(kind==="contacts"){
    const r=await supabase.from("people").select("id",{count:"exact",head:true});
    ensureNoError(r);
    return ["Contatos visíveis para sua conta: **"+(r.count??0)+"**.", "",localSidScopeNotice].join("\n");
  }
  if(kind==="captures"){
    const r=await supabase.from("captures").select("title,kind,status,received_at")
      .order("received_at",{ascending:false}).limit(20);
    ensureNoError(r);
    return formatCapturesReply(r.data??[]);
  }
  if(kind==="tasks" || kind==="today"){
    const query=supabase.from("tasks").select("title,due_date,priority,status")
      .neq("status","feito").order("due_date",{ascending:true,nullsFirst:false}).limit(40);
    const r=await (kind==="today"?query.lte("due_date",today):query);
    ensureNoError(r);
    const summary=formatTaskReply(r.data??[],today,
      kind==="today"?"Tarefas para hoje e atrasadas (até 40):":"Tarefas pendentes (até 40):");
    if(kind==="tasks")return summary;
    const follow=await supabase.from("followups")
      .select("reason,due_date,person_id,done_at")
      .is("done_at",null).lte("due_date",today)
      .order("due_date",{ascending:true}).limit(30);
    ensureNoError(follow);
    const ids=[...new Set((follow.data??[]).map((x: {person_id:string})=>x.person_id))];
    let names=new Map<string,string>();
    if(ids.length){
      const persons=await supabase.from("people").select("id,name").in("id",ids);
      ensureNoError(persons);
      names=new Map((persons.data??[]).map((p:{id:string;name:string})=>[p.id,p.name]));
    }
    return summary+"\n\n"+formatFollowupReply(follow.data??[],names,"Follow-ups vencidos ou de hoje (até 30):");
  }
  if(kind==="followups"){
    const follow=await supabase.from("followups")
      .select("reason,due_date,person_id,done_at")
      .is("done_at",null).order("due_date",{ascending:true,nullsFirst:false}).limit(30);
    ensureNoError(follow);
    const ids=[...new Set((follow.data??[]).map((x:{person_id:string})=>x.person_id))];
    let names=new Map<string,string>();
    if(ids.length){
      const persons=await supabase.from("people").select("id,name").in("id",ids);
      ensureNoError(persons);
      names=new Map((persons.data??[]).map((p:{id:string;name:string})=>[p.id,p.name]));
    }
    return formatFollowupReply(follow.data??[],names,"Follow-ups pendentes (até 30):");
  }
  return null;
}
