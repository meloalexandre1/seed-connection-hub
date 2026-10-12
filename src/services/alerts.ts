import { supabase } from "@/integrations/supabase/client";
import {
  auditAlerts, brazilToday, followupAlerts, taskAlerts,
  type SeedAlert, type DueTask, type DueFollowup, type ChangeRecord,
} from "@/lib/alerts";

type AlertsResult = { userId:string; alerts:SeedAlert[]; isAdmin:boolean };

function check<T>(result:{data:T|null;error:{message:string}|null}):T{
  if(result.error)throw new Error(result.error.message);
  return result.data as T;
}

export const alertsService={
  async list(): Promise<AlertsResult> {
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError || !user) throw new Error("Entre na sua conta para consultar notificações.");
    const userId=user.id;
    const [roles,tasks,followups]=await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id",userId),
      supabase.from("tasks").select("id,title,due_date,status,priority")
        .or(`assignee_id.eq.${userId},owner_id.eq.${userId}`)
        .neq("status","feito").not("due_date","is",null)
        .order("due_date",{ascending:true}).limit(100),
      supabase.from("followups").select("id,reason,due_date,done_at,person_id")
        .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
        .is("done_at",null).not("due_date","is",null)
        .order("due_date",{ascending:true}).limit(75),
    ]);
    const roleRows=check(roles);
    const taskRows=check(tasks) as DueTask[];
    const followupRows=check(followups) as DueFollowup[];
    const admin=roleRows?.some(r=>r.role==="admin")??false;
    const ids=[...new Set(followupRows.map(f=>f.person_id))];
    const [people,logs]=await Promise.all([
      ids.length?supabase.from("people").select("id,name").in("id",ids):Promise.resolve({data:[],error:null}),
      admin
        ?supabase.from("audit_log").select("id,actor_id,table_name,action,at")
          .gte("at",new Date(Date.now()-48*60*60*1000).toISOString())
          .order("at",{ascending:false}).limit(25)
        :Promise.resolve({data:[],error:null}),
    ]);
    const names=new Map((check(people)??[]).map(p=>[p.id,p.name]));
    const date=brazilToday();
    const alerts=[
      ...taskAlerts(taskRows??[],date),
      ...followupAlerts(followupRows??[],names,date),
      ...auditAlerts((check(logs)??[]) as ChangeRecord[],userId),
    ];
    const urgent=alerts.filter(a=>a.urgent);
    const normal=alerts.filter(a=>!a.urgent);
    return {userId,isAdmin:admin,alerts:[...urgent,...normal].slice(0,80)};
  },
};
