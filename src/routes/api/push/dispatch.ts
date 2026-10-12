import { createFileRoute } from "@tanstack/react-router";

type Reminder={userId:string;eventKey:string};
type Device={id:string;user_id:string;endpoint:string;p256dh:string;auth:string};

async function safeCronAuth(request:Request):Promise<boolean>{
  const secret=process.env["PUSH_CRON_SECRET"];
  const incoming=request.headers.get("authorization")??"";
  if(!secret||secret.length<32||!incoming.startsWith("Bearer "))return false;
  const supplied=incoming.slice(7);
  const encoded=new TextEncoder();
  const [a,b]=await Promise.all([
    crypto.subtle.digest("SHA-256",encoded.encode(secret)),
    crypto.subtle.digest("SHA-256",encoded.encode(supplied)),
  ]);
  const x=new Uint8Array(a),y=new Uint8Array(b);
  let result=0;for(let i=0;i<x.length;i++)result|=x[i]!^y[i]!;
  return result===0;
}
function dateBR(d:Date){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
  const find=(type:string)=>parts.find(p=>p.type===type)?.value??"";
  return find("year")+"-"+find("month")+"-"+find("day");
}
async function dispatch(){
  const {supabaseAdmin:db}=await import("@/integrations/supabase/client.server");
  const {sendPush}=await import("@/server/webPushCrypto.server");
  const publicKey=process.env["PUSH_VAPID_PUBLIC_KEY"]??"";
  const privateKey=process.env["PUSH_VAPID_PRIVATE_KEY"]??"";
  const subject=process.env["PUSH_VAPID_SUBJECT"]??"";
  if(!publicKey||!privateKey||!subject)throw new Error("Push sender secrets not configured");
  const today=dateBR(new Date());
  const after=new Date(Date.parse(today+"T00:00:00Z")+2*86400000).toISOString().slice(0,10);
  const [tasks,followups,devices]=await Promise.all([
    db.from("tasks").select("id,owner_id,assignee_id,due_date,status")
      .neq("status","feito").not("due_date","is",null).lte("due_date",after).limit(1500),
    db.from("followups").select("id,created_by,assignee_id,due_date,done_at")
      .is("done_at",null).not("due_date","is",null).lte("due_date",after).limit(1500),
    db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth")
      .eq("enabled",true).limit(250),
  ]);
  if(tasks.error||followups.error||devices.error)throw new Error("Push query failed");
  const reminders:Reminder[]=[];
  const phase=(date:string)=>date<today?"overdue":date===today?"today":"upcoming";
  for(const r of tasks.data??[]){
    if(r.due_date)reminders.push({
      userId:r.assignee_id??r.owner_id,eventKey:"task:"+r.id+":"+r.due_date+":"+phase(r.due_date),
    });
  }
  for(const r of followups.data??[]){
    if(r.due_date)reminders.push({
      userId:r.assignee_id??r.created_by,eventKey:"followup:"+r.id+":"+r.due_date+":"+phase(r.due_date),
    });
  }
  const byUser=new Map<string,Reminder[]>();
  for(const reminder of reminders){
    const old=byUser.get(reminder.userId)??[];
    if(old.length<5)byUser.set(reminder.userId,[...old,reminder]);
  }
  let succeeded=0,failed=0;
  for(const device of (devices.data??[]) as Device[]){
    for(const reminder of byUser.get(device.user_id)??[]){
      const reserved=await db.from("push_deliveries").insert({
        subscription_id:device.id,event_key:reminder.eventKey,status:"reserved",
      }).select("id").single();
      if(reserved.error?.code==="23505")continue;
      if(reserved.error||!reserved.data)throw new Error("Could not reserve push event");
      let httpStatus=0;
      try{
        httpStatus=await sendPush({
          endpoint:device.endpoint,p256dh:device.p256dh,auth:device.auth,
          publicKey,privateKey,subject,tag:reminder.eventKey,
        });
      }catch{
        failed++;
      }
      if([200,201,202].includes(httpStatus)){
        succeeded++;
        await db.from("push_deliveries").update({status:"sent",sent_at:new Date().toISOString()})
          .eq("id",reserved.data.id);
        await db.from("push_subscriptions").update({last_success_at:new Date().toISOString()}).eq("id",device.id);
      }else if(httpStatus===404||httpStatus===410){
        await db.from("push_subscriptions").delete().eq("id",device.id);
        break;
      }else{
        if(httpStatus)failed++;
        await db.from("push_deliveries").update({status:"failed"}).eq("id",reserved.data.id);
      }
    }
  }
  return {sent:succeeded,failed,devices:devices.data?.length??0};
}
export const Route=createFileRoute("/api/push/dispatch")({
  server:{handlers:{
    POST:async({request})=>{
      if(!(await safeCronAuth(request)))
        return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
      if(process.env["PUSH_DELIVERY_ENABLED"]!=="true")
        return new Response(JSON.stringify({error:"Disabled"}),{status:503,headers:{"content-type":"application/json"}});
      try{
        const result=await dispatch();
        return new Response(JSON.stringify(result),{status:200,headers:{"content-type":"application/json","cache-control":"no-store"}});
      }catch{
        return new Response(JSON.stringify({error:"Dispatch unavailable"}),{status:503,headers:{"content-type":"application/json","cache-control":"no-store"}});
      }
    },
  }},
});
