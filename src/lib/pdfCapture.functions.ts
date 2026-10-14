import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const extractionInput=z.object({
  captureId:z.string().uuid(),
  text:z.string().trim().min(40).max(30000),
});

export const saveExtractedPdfText=createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(extractionInput)
  .handler(async ({context,data})=>{
    const {supabase,userId}=context;
    const {data:capture,error}=await supabase.from("captures")
      .select("id,note,kind,mime,storage_path")
      .eq("id",data.captureId).eq("owner_id",userId).maybeSingle();
    if(error||!capture)throw new Error("Não foi possível localizar o PDF da sua conta.");
    if(capture.mime!=="application/pdf" || !capture.storage_path)
      throw new Error("Esta captura não contém um PDF privado disponível.");
    if(capture.note?.trim())throw new Error("Este arquivo já possui texto extraído. Não vamos substituir o conteúdo original.");
    const {data:analysis,error:analysisError}=await supabase.from("capture_analyses")
      .select("capture_id").eq("capture_id",data.captureId).eq("owner_id",userId).maybeSingle();
    if(analysisError)throw new Error("Não foi possível confirmar o estado da análise.");
    if(analysis)throw new Error("Esta captura já possui análise. Revise a análise existente antes de continuar.");
    const {data:updated,error:updateError}=await supabase.from("captures")
      .update({note:data.text,status:"revisar",error:null})
      .eq("id",data.captureId).eq("owner_id",userId)
      .is("note",null).select("id").maybeSingle();
    if(updateError)throw new Error("Não foi possível salvar o texto. Confira as permissões da sua conta.");
    if(!updated)throw new Error("O texto desta captura já foi preenchido por outra operação. Atualize a página.");
    return {ok:true,captureId:updated.id};
  });
