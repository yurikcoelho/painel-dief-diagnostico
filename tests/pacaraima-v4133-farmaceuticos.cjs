/* Cenários sintéticos de regressão para triagem de medicamentos em RR.
 * Executar: node tests/pacaraima-v4133-farmaceuticos.cjs
 * Não consulta serviços externos nem certifica arrecadação.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../triagem-nfe-vercel/index.html'),'utf8');
const begin=html.indexOf('<script>')+8,finish=html.indexOf('/* ---------- fluxo ---------- */');
const script=html.slice(begin,finish);
new vm.Script(script);
const scope={document:{querySelector:()=>null},localStorage:{getItem:()=>null},Date,Intl,setTimeout};
vm.createContext(scope);
vm.runInContext(script+'\nthis.api={analyze,renderNF,triagemOperacionalItem,classificarRegimeOperacional,avaliarMedicamentoST};',scope);
const api=scope.api;
const now=new Date(),ctx={posto:'Pacaraima',abordagem:now};
let ok=0;
function fixture(){
 const make=(n,desc,price,anvisa)=>({n:String(n),cod:'teste',desc,anvisa,ncm:'30043939',cest:'1300100',cBenef:'',cfop:'5405',un:'CV',q:20,unTrib:'CV',qTrib:20,vUn:price/20,vProd:price,vDesc:0,vFrete:0,vSeg:0,vOutro:0,vIPI:0,infAdProd:'',ibscbs:null,
 icms:{orig:'2',cst:'60',csosn:'',vBC:0,pICMS:0,vICMS:0,vBCST:0,vICMSST:0,vICMSSTRet:0,pRedBC:0}});
 return {chave:'1'.repeat(44),file:'sintetico.xml',ide:{natOp:'Venda de mercadorias sujeita a ST',mod:'55',serie:'1',nNF:'1',dhEmi:now.toISOString(),dhSaiEnt:now.toISOString(),tpNF:'1',idDest:'1',tpEmis:'1',tpAmb:'1',finNFe:'1',indFinal:'0',cUF:'14'},
 emit:{uf:'RR',nome:'Distribuidora de teste',mun:'Boa Vista',doc:'11111111000111',crt:'3'},
 dest:{uf:'RR',nome:'Drogaria de teste',mun:'Pacaraima',doc:'22222222000122',indIE:'1',ie:'240000000'},
 itens:[make(1,'UTROGESTAN 200MG C/14CP',1238,'1875900010043'),make(2,'UTROGESTAN 100MG C/30CP',1325.8,'1875900010035')],
 tot:{vNF:2563.8,vProd:2563.8,vICMS:0,vBC:0,vST:0,vFrete:0,vDesc:0},
 transp:{modFrete:'0',qVol:1,placa:'TESTE1'},pag:[],dup:[],infCpl:'',infAdFisco:'',prot:{cStat:'100',dhRecbto:now.toISOString(),nProt:'teste'},hasRef:false,leituraEm:now};
}
function test(label,alter,check){
 const nf=fixture();if(alter)alter(nf);
 const res=api.analyze(nf,ctx),page=api.renderNF(nf,res,ctx),warnings=res.alerts.filter(x=>['confere','para'].includes(x.lvl));
 check({nf,res,page,warnings});
 console.log('OK '+label);ok++;
}
test('Revenda interna de Utrogestan sem alerta genérico',null,({nf,res,page,warnings})=>{
 assert.equal(warnings.length,0);
 assert.equal(res.lvl,'libera');
 assert.equal(nf.itens.filter(i=>api.classificarRegimeOperacional(i,nf).id==='farmaceuticos_st').length,2);
 assert(page.includes('✓ MEDICAMENTOS — ST ANTERIOR DECLARADA'));
 assert(!page.includes('ST interna de RR a conferir: Farmacêuticos'));
});
test('CFOP de venda normal com CST60 continua pendente',nf=>nf.itens.forEach(i=>i.cfop='5102'),({warnings})=>{
 assert(warnings.some(x=>x.titulo.includes('CST/CSOSN de ST com CFOP')));
});
test('CEST fora do segmento de medicamentos não confirma regra',nf=>nf.itens.forEach(i=>i.cest='1399999'),({nf,warnings})=>{
 assert(warnings.some(x=>x.titulo.includes('Farmacêuticos')));
 assert(nf.itens.every(i=>api.classificarRegimeOperacional(i,nf).id!=='farmaceuticos_st'));
});
test('Remessa interestadual não recebe liberação pelo documento',nf=>{
 nf.emit.uf='SP';nf.ide.idDest='2';nf.itens.forEach(i=>i.cfop='6404');
},({nf,warnings})=>{
 assert(warnings.some(x=>x.titulo.includes('ST de RR a conferir')));
 assert(nf.itens.every(i=>api.classificarRegimeOperacional(i,nf).id!=='farmaceuticos_st'));
});
test('Produto genérico não recebe falso enquadramento farmacêutico',nf=>nf.itens.forEach(i=>{i.desc='ITEM SEM IDENTIFICAÇÃO';i.anvisa='';}),({nf})=>{
 assert(nf.itens.every(i=>api.classificarRegimeOperacional(i,nf).id!=='farmaceuticos_st'));
});
test('CEST medicamento com categoria validada estruturalmente',nf=>nf.itens.forEach(i=>i.cest='1300102'),({nf})=>{
 assert(nf.itens.every(i=>api.avaliarMedicamentoST(i,nf).compativel));
});
assert(!html.includes('quadro convertido em Markdown'));
console.log(ok+' casos passaram.');