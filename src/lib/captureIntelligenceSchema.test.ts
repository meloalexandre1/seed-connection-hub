import {describe,expect,it} from "vitest";
import {parseMeetingExtraction,normalizedPhone,normalizedIdentityName,pickUniqueMatches} from "./captureIntelligenceSchema";

describe("Grounded meeting extraction",()=>{
  const source="Reunião com Ana Silva. Ana Silva precisa de conexão com investidores. Ana Silva domina logística.";
  it("preserves only facts with a literal source quote",()=>{
    const data=parseMeetingExtraction(JSON.stringify({
      summary:"A reunião tratou das necessidades e habilidades da Ana Silva.",
      people:[{name:"Ana Silva",email:null,phone:null,organization:null,role:null,facts:[
        {kind:"necessidade",text:"Precisa de conexão com investidores",evidence:"precisa de conexão com investidores",confidence:0.9},
        {kind:"habilidade",text:"Especialista em logística",evidence:"Domina um foguete invisível",confidence:0.9}
      ]}],
    }),source);
    expect(data.people[0]?.facts).toHaveLength(1);
    expect(data.people[0]?.facts[0]?.kind).toBe("necessidade");
  });
  it("rejects malformed machine output rather than corrupting contacts",()=>{
    expect(()=>parseMeetingExtraction("Sorry, can't analyze",source)).toThrow();
    expect(()=>parseMeetingExtraction(JSON.stringify({summary:"x",people:[]}),source)).toThrow();
    expect(()=>parseMeetingExtraction(JSON.stringify({summary:"Resumo com mais de dez caracteres",people:[{name:"Ana"}]}),source)).toThrow();
  });
  it("parses plain fenced JSON",()=>{
    const data=parseMeetingExtraction(" ```json\n"+JSON.stringify({
      summary:"O texto contém uma reunião sobre logística.",people:[],
    })+"\n``` ",source);
    expect(data.people).toEqual([]);
  });
  it("normalizes identity and removes duplicate matches",()=>{
    expect(normalizedPhone("+55 (11) 98765-4321")).toBe("5511987654321");
    expect(normalizedIdentityName("  Ána   Sílva ")).toBe("ana silva");
    expect(pickUniqueMatches([
      {id:"1",name:"Ana",method:"email"},
      {id:"1",name:"Ana",method:"nome"},
    ])).toHaveLength(1);
  });
});
