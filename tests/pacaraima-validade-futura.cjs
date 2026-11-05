/* Regressão da validade do documento em trânsito — RICMS/RR, art. 289.
   Executar: node tests/pacaraima-validade-futura.cjs */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"../triagem-nfe-vercel/index.html"),"utf8");
const start=html.indexOf("<script>")+8,end=html.indexOf("/* ---------- fluxo ---------- */");
assert(start>7&&end>start,"Seção JavaScript não localizada");
const box={document:{querySelector:()=>null},localStorage:{getItem:()=>null},Date,Intl,setTimeout};
vm.createContext(box);
vm.runInContext(html.slice(start,end)+"\nthis.API={validadeTransito,analyze,renderNF};",box);
const {validadeTransito,analyze,renderNF}=box.API;
const fiscalizacao=new Date("2026-11-05T19:41:00-04:00");
const ctx={posto:"Pacaraima",abordagem:fiscalizacao};
function nfBase(){
 return {chave:"1".repeat(44),file:"sintetica.xml",
  ide:{natOp:"Venda",mod:"55",serie:"1",nNF:"579421",dhEmi:"2026-10-30T15:38:00-04:00",dhSaiEnt:"2026-11-13T15:38:00-04:00",tpNF:"1",idDest:"1",tpEmis:"1",tpAmb:"1",finNFe:"1",indFinal:"0",cUF:"14"},
  emit:{uf:"RR",mun:"Boa Vista",nome:"Emitente de teste",doc:"11111111000111",crt:"3"},
  dest:{uf:"RR",mun:"Amajari",nome:"Destinatário de teste",doc:"22222222000122",indIE:"1",ie:"240000000"},
  itens:[{n:"1",desc:"Caneta",ncm:"96081000",cest:"",cfop:"5102",un:"UN",q:1,vUn:50,vProd:50,vDesc:0,vFrete:0,vSeg:0,vOutro:0,vIPI:0,icms:{orig:"0",cst:"00",csosn:"",vBC:50,pICMS:20,vICMS:10,vICMSST:0,vICMSSTRet:0},ibscbs:null}],
  tot:{vNF:50,vProd:50,vBC:50,vICMS:10},transp:{modFrete:"0"},pag:[],dup:[],infCpl:"",infAdFisco:"",leituraEm:fiscalizacao,
  prot:{cStat:"100",dhRecbto:"2026-10-30T15:40:00-04:00",nProt:"teste"},hasRef:false};
}
let passed=0;
function test(titulo,alterar,verificar){
 const nf=nfBase();if(alterar)alterar(nf);
 const val=validadeTransito(nf,ctx.abordagem),res=analyze(nf,ctx),tela=renderNF(nf,res,ctx);
 verificar({nf,val,res,tela});passed++;console.log("OK",titulo);
}
test("Saída declarada 13/11; trânsito 05/11; prazo subsidiário 02/11",null,({val,res,tela})=>{
 assert.equal(val.saidaFutura,true);assert.equal(val.limite,null);assert.equal(val.expirado,false);
 assert.equal(val.limiteSubsidiario.toISOString(),"2026-11-02T19:38:00.000Z");
 assert(tela.includes("CONFERIR — SAÍDA FUTURA"));
 assert(res.alerts.some(x=>x.titulo==="Saída futura incompatível com circulação constatada"));
 assert(!res.alerts.some(x=>x.titulo==="Prazo de validade no trânsito ultrapassado"));
});
test("Saída efetiva em 05/11, documento dentro do prazo",n=>n.ide.dhSaiEnt="2026-11-05T10:00:00-04:00",({val,tela})=>{
 assert(!val.saidaFutura&&!val.expirado);assert.equal(val.dias,3);assert(tela.includes("Dentro do prazo"));
});
test("Saída efetiva em 30/10, prazo vencido em 02/11",n=>n.ide.dhSaiEnt="2026-10-30T15:38:00-04:00",({val,res})=>{
 assert.equal(val.expirado,true);assert(res.alerts.some(x=>x.titulo==="Prazo de validade no trânsito ultrapassado"));
});
test("Sem data de saída: emissão como referência do § 5º",n=>n.ide.dhSaiEnt="",({val})=>{
 assert(val.fonte.includes("§ 5º"));assert(val.expirado);
});
test("Abordagem prevalece sobre leitura posterior",n=>n.leituraEm=new Date("2026-11-16T19:41:00-04:00"),({tela})=>{
 assert(tela.includes("CONFERIR — SAÍDA FUTURA"));
});
test("Mesmo município usa 1 dia",n=>{n.dest.mun="Boa Vista";n.ide.dhSaiEnt="2026-11-05T10:00:00-04:00"},({val})=>{
 assert.equal(val.dias,1);
});
test("Interestadual usa 5 dias",n=>{n.dest.uf="AM";n.ide.idDest="2";n.ide.dhSaiEnt="2026-11-05T10:00:00-04:00"},({val})=>{
 assert.equal(val.dias,5);
});
console.log(passed+" testes aprovados");
