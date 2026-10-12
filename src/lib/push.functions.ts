import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const allowed = /^(https:\/\/)(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)\//;
const b64url = /^[a-zA-Z0-9_-]+$/;
const subscriptionData = z.object({
  endpoint: z.string().url().min(40).max(2048).refine(s=>allowed.test(s), "Provedor de Web Push não permitido"),
  p256dh: z.string().min(40).max(180).regex(b64url),
  auth: z.string().min(12).max(180).regex(b64url),
});

export const pushSetup = createServerFn({method:"GET"})
  .middleware([requireSupabaseAuth])
  .handler(async ({context})=>{
    const key=process.env["PUSH_VAPID_PUBLIC_KEY"]??"";
    if(!key)return {ready:false,publicKey:"",devices:0};
    const {count,error}=await context.supabase.from("push_subscriptions")
      .select("id",{count:"exact",head:true}).eq("user_id",context.userId).eq("enabled",true);
    if(error)throw new Error("Não foi possível consultar os dispositivos cadastrados.");
    return {ready:true,publicKey:key,devices:count??0};
  });

export const savePushDevice = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(subscriptionData)
  .handler(async ({context,data})=>{
    if(!process.env["PUSH_VAPID_PUBLIC_KEY"])
      throw new Error("As notificações push aguardam a chave pública VAPID no servidor.");
    const {count,error:countError}=await context.supabase.from("push_subscriptions")
      .select("id",{count:"exact",head:true}).eq("user_id",context.userId);
    if(countError)throw new Error("Não foi possível verificar os dispositivos.");
    const {data:existing,error:findError}=await context.supabase.from("push_subscriptions")
      .select("id").eq("endpoint",data.endpoint).maybeSingle();
    if(findError)throw new Error("Não foi possível verificar o dispositivo.");
    if(!existing && (count??0)>=5)throw new Error("Limite de 5 dispositivos por conta. Remova um dispositivo antigo.");
    const {error}=await context.supabase.from("push_subscriptions").upsert({
      user_id:context.userId,endpoint:data.endpoint,p256dh:data.p256dh,
      auth:data.auth,enabled:true,updated_at:new Date().toISOString(),
    },{onConflict:"endpoint"});
    if(error)throw new Error("Não foi possível registrar este dispositivo. Confirme a permissão de acesso.");
    return {ok:true};
  });

export const deletePushDevice = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({endpoint:z.string().url().max(2048)}))
  .handler(async ({context,data})=>{
    const {error}=await context.supabase.from("push_subscriptions").delete()
      .eq("user_id",context.userId).eq("endpoint",data.endpoint);
    if(error)throw new Error("Não foi possível cancelar as notificações deste dispositivo.");
    return {ok:true};
  });
