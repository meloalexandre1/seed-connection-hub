/**
 * Extracts *text-based* PDFs in the signed-in browser. No meeting file is sent
 * to a third-party PDF service. A scanned/image-only PDF requires OCR later.
 */
export async function extractLocalPdfText(file:Blob):Promise<string>{
  if(file.size>25*1024*1024)
    throw new Error("PDF maior que 25 MB. Extraia o texto em partes ou cole o resumo manualmente.");
  const [{getDocument,GlobalWorkerOptions},worker]=await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc=worker.default;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const task=getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false});
  try{
    const pdf=await task.promise;
    if(pdf.numPages>100)
      throw new Error("PDF com mais de 100 páginas. Faça a extração de um trecho menor.");
    const chunks:string[]=[];
    for(let pageNum=1;pageNum<=pdf.numPages;pageNum++){
      const page=await pdf.getPage(pageNum);
      const content=await page.getTextContent();
      const rows:string[]=[];
      let lastY:number|null=null;
      for(const item of content.items){
        if(!("str" in item))continue;
        const text=item.str.trim();
        if(!text)continue;
        const y="transform" in item?Math.round(item.transform[5]):null;
        if(lastY!==null && y!==null && Math.abs(y-lastY)>5)rows.push("\n");
        rows.push(text," ");
        lastY=y;
      }
      const pageText=rows.join("").replace(/[ \t]+\n/g,"\n").trim();
      if(pageText)chunks.push(pageText);
    }
    const text=chunks.join("\n\n").trim();
    if(text.length<40)
      throw new Error("O PDF não possui texto selecionável suficiente. Se for digitalizado, precisará de OCR; você também pode colar o resumo abaixo.");
    if(text.length>30000)
      throw new Error("O PDF contém mais de 30 mil caracteres. Divida o material ou cole um resumo de até 30 mil caracteres.");
    return text;
  }finally{await task.destroy();}
}
