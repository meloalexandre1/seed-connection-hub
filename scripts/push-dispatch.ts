/** GitHub Actions job: sends background reminders to subscribed devices.
 * Uses Supabase service role ONLY as an encrypted GitHub Actions secret.
 * No HTTP endpoint is exposed; no personal information in push payload/logs.
 */
import { createClient } from "@supabase/supabase-js";
import { sendWebPush } from "./web-push";

const env=(k:string)=>{
  const value=process.env[k]?.trim();
  if(!value)throw new Error("Missing required secret: "+k);
  return value;
};
const db=createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{
  auth:{persistSession:false,autoRefreshToken:false},
});
const publicKey=env("PUSH_VAPID_PUBLIC_KEY");
const privateKey=env("PUSH_VAPID_PRIVATE_KEY");
const subject=env("PUSH_VAPID_SUBJECT");
const now=new Date();
function brazilDate():string {
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(now);
  const get=(k:string)=>parts.find(x=>x.type===k)?.value??"";
  return get("year")+"-"+get("month")+"-"+get("day");
}
const today=brazilDate();
const twoDays=new Date(Date.parse(today+"T00:00:00Z")+2*86400000).toISOString().slice(0,10);
const phase=(date:string):string=>{
  if(date<today)return "atrasada";
  if(date===today)return "hoje";
  return "proxima";
};
type Reminder={userId:string;eventKey:string};
const reminders:Reminder[]=[];
const [tasks,followups,devices]=await Promise.all([
  db.from("tasks").select("id,owner_id,assignee_id,due_date,status")
    .neq("status","feito").not("due_date","is",null).lte("due_date",twoDays).limit(1500),
  db.from("followups").select("id,created_by,assignee_id,due_date,done_at")
    .is("done_at",null).not("due_date","is",null).lte("due_date",twoDays).limit(1500),
  db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").eq("enabled",true).limit(500),
]);
for(const [label,r] of [["tasks",tasks],["followups",followups],["devices",devices]]){
  if(r.error)throw new Error("Supabase failed to read "+label+": "+r.error.code);
}
for(const item of tasks.data??[]){
  if(!item.due_date)continue;
  reminders.push({userId:item.assignee_id??item.owner_id,eventKey:"task:"+item.id+":"+item.due_date+":"+phase(item.due_date)});
}
for(const item of followups.data??[]){
  if(!item.due_date)continue;
  reminders.push({userId:item.assignee_id??item.created_by,eventKey:"followup:"+item.id+":"+item.due_date+":"+phase(item.due_date)});
}
const byUser=new Map<string,Reminder[]>();
for(const r of reminders)byUser.set(r.userId,[...(byUser.get(r.userId)??[]),r]);
let attempted=0,successes=0,expired=0,failed=0;
for(const device of devices.data??[]){
  const events=(byUser.get(device.user_id)??[]).slice(0,5);
  for(const event of events){
    // Ledger unique constraint ensures at-most-once per device and stage.
    const reservation=await db.from("push_deliveries").insert({
      subscription_id:device.id,event_key:event.eventKey,status:"reserved",
    }).select("id").single();
    if(reservation.error?.code==="23505")continue;
    if(reservation.error||!reservation.data)throw new Error("Could not reserve push delivery safely.");
    attempted++;
    let status=0;
    try{
      status=await sendWebPush({
        endpoint:device.endpoint,p256dh:device.p256dh,auth:device.auth,
        publicKey,privateKey,subject,tag:event.eventKey,
      });
    }catch{
      failed++;
      await db.from("push_deliveries").update({status:"failed"}).eq("id",reservation.data.id);
      continue;
    }
    if(status===201||status===202||status===200){
      successes++;
      await Promise.all([
        db.from("push_deliveries").update({status:"sent",sent_at:new Date().toISOString()}).eq("id",reservation.data.id),
        db.from("push_subscriptions").update({last_success_at:new Date().toISOString()}).eq("id",device.id),
      ]);
    }else if(status===404||status===410){
      expired++;
      await db.from("push_subscriptions").delete().eq("id",device.id);
      // Cascading delete removes reservation.
      break;
    }else{
      failed++;
      await db.from("push_deliveries").update({status:"failed"}).eq("id",reservation.data.id);
    }
  }
}
console.log(JSON.stringify({date:today,activeDevices:(devices.data??[]).length,attempted,successes,expired,failed}));
// Non-zero exit on infrastructure failure; push service 400/403 is visible as failed count.
if(failed>0)process.exitCode=1;
