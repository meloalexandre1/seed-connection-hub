import { useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { saveExtractedPdfText } from "@/lib/pdfCapture.functions";

// TanStack Start guarantees this import only exists in the browser bundle.
const extractTextInBrowser=createClientOnlyFn(async (blob:Blob)=>{
  const {extractLocalPdfText}=await import("@/lib/pdfTextExtraction.client");
  return extractLocalPdfText(blob);
});

/** Associates text with a PDF already stored in the user's private bucket. */
export function PdfTextPreparation({captureId,storagePath}:{
  captureId:string;storagePath:string;
}){
  const qc=useQueryClient();
  const [busy,setBusy]=useState(false);
  const [manual,setManual]=useState(false);
  const [text,setText]=useState("");
  async function save(content:string){
    await saveExtractedPdfText({data:{captureId,text:content}});
    await qc.invalidateQueries({queryKey:["captures-inbox"]});
    toast.success("Texto associado ao PDF. Agora você pode pedir a análise do SID no mesmo registro.");
  }
  async function extract(){
    setBusy(true);
    try{
      const {data,error}=await supabase.storage.from("captures").download(storagePath);
      if(error||!data)throw new Error("Não foi possível baixar seu PDF privado.");
      const extracted=await extractTextInBrowser(data);
      await save(extracted);
    }catch(e){
      toast.error(e instanceof Error?e.message:"Erro na extração do PDF.");
      setManual(true);
    }finally{setBusy(false);}
  }
  async function submitManual(){
    setBusy(true);
    try{await save(text.trim());}
    catch(e){toast.error(e instanceof Error?e.message:"Não foi possível salvar o texto.");}
    finally{setBusy(false);}
  }
  return <div className="space-y-2 rounded-lg border p-2">
    <p className="text-xs font-medium">PDF salvo, aguardando extração do texto</p>
    <p className="text-xs text-muted-foreground">
      O SID só poderá identificar pessoas e oportunidades depois de extrair o texto.
      PDFs com texto selecionável podem ser processados no seu navegador, sem serviço externo de leitura.
    </p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={()=>void extract()} disabled={busy}>
        {busy?<Loader2 className="h-4 w-4 animate-spin"/>:<FileSearch className="h-4 w-4"/>}
        Extrair texto do PDF
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={()=>setManual(v=>!v)} disabled={busy}>
        {manual?"Ocultar texto manual":"Colar texto do resumo"}
      </Button>
    </div>
    {manual&&<div className="space-y-2">
      <Textarea aria-label="Texto do PDF ou resumo de reunião" rows={6}
        placeholder="Cole aqui o resumo recebido do Gemini ou o texto copiado do PDF."
        maxLength={30000} value={text} onChange={e=>setText(e.target.value)}/>
      <Button type="button" size="sm" onClick={()=>void submitManual()}
        disabled={busy||text.trim().length<40}>Salvar texto nesta captura</Button>
    </div>}
    <p className="text-xs text-muted-foreground">
      Se o PDF for uma imagem digitalizada, será necessário OCR.
      A extração do texto não aciona a IA automaticamente nem altera fichas de pessoas.
    </p>
  </div>;
}
