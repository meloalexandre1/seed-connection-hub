/** Server-only safeguards for AI analysis and paid chat endpoints.
 * Never sends secrets, raw meeting text, or identity data to a rate limiter.
 */
export async function sha256MeetingText(note:string):Promise<string> {
  const bytes=new TextEncoder().encode(note);
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  return Array.from(digest,b=>b.toString(16).padStart(2,"0")).join("");
}
export async function claimAiRequest(userId:string, operation:"sid_chat"|"meeting_analysis"):Promise<void>{
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  // The new DB RPC is not yet in Lovable's automatically generated SDK types.
  // Narrow this single invocation until codegen refreshes; the DB grants
  // EXECUTE exclusively to the server's service_role.
  const admin=supabaseAdmin as unknown as {
    rpc(name:string, args:{p_user_id:string;p_operation:string}):
      Promise<{data:boolean|null;error:{message:string}|null}>
  };
  const {data,error}=await admin.rpc("claim_ai_request",{
    p_user_id:userId,p_operation:operation,
  });
  if(error)throw new Error("Não foi possível verificar o limite de segurança da IA. Tente novamente em instantes.");
  if(!data)throw new Error("Muitas solicitações de IA em pouco tempo. Aguarde um minuto e tente novamente. Suas capturas continuam salvas.");
}
