/* Executar: node tests/ncm-regression.cjs. Cenários fiscais sintéticos, sem rede. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../triagem-nfe-vercel/index.html'),'utf8');
new vm.Script(html.slice(html.indexOf('<script>')+8,html.indexOf('</script>',html.indexOf('<script>'))));
new vm.Script(fs.readFileSync(path.join(__dirname,'../triagem-nfe-vercel/photos.js'),'utf8'));
const box={document:{querySelector:()=>null},localStorage:{getItem:()=>null},Date,Intl,setTimeout};vm.createContext(box);
vm.runInContext(html.slice(html.indexOf('<script>')+8,html.indexOf('/* ---------- fluxo ---------- */'))+'\nthis.api={regimesCandidatos,beneficiosCandidatos,aliquotaReferencia,tributacaoDeclarada,isSTcode,isMono,analyze,renderNF,interRegiao,baseOperacao,avaliar5904,referencias5904,classificarRegimeOperacional,maiorQuantidadePorUnidade,resumoRegimeHtml,ocorrenciasLocaisCPF,avaliarSorvetesST};',box);
const a=box.api,ctx={posto:'Pacaraima',abordagem:null};let passed=0;
function fixture(ncm,desc,cst='00',cfop='6102'){
 const now=new Date();const i={n:'1',cod:'teste',desc,ncm,cest:'',cBenef:'',cfop,un:'UN',q:1,vUn:1000,vProd:1000,vFrete:0,vSeg:0,vDesc:0,vOutro:0,vIPI:0,infAdProd:'',icms:{orig:'0',cst,csosn:'',vBC:1000,pICMS:7,vICMS:70,vBCST:0,vICMSST:0,vICMSSTRet:0,pRedBC:0},ufdest:false};
 return {chave:'1'.repeat(44),file:'teste',ide:{natOp:'Venda',mod:'55',serie:'1',nNF:'1',dhEmi:now.toISOString(),tpNF:'1',idDest:'2',tpEmis:'1',tpAmb:'1',finNFe:'1',indFinal:'0',cUF:'35'},emit:{uf:'SP',nome:'Remetente sintético',mun:'São Paulo',doc:'11111111000111',crt:'3'},dest:{uf:'RR',nome:'Destinatário sintético',mun:'Pacaraima',doc:'22222222000122',ie:'240000000',indIE:'1'},itens:[i],tot:{vNF:1000,vProd:1000,vICMS:70},transp:{modFrete:'0'},pag:[],dup:[],infCpl:'',infAdFisco:'',leituraEm:now,prot:{cStat:'100',dhRecbto:now.toISOString(),nProt:'teste'},hasRef:false};
}
function test(name,fn){fn();passed++;console.log('OK',name)}
const ids=n=>Array.from(a.regimesCandidatos(n.itens[0],n),r=>r.id);
const alerts=n=>a.analyze(n,ctx).alerts;
const has=(n,needle)=>alerts(n).some(x=>x.titulo.includes(needle));
for(const [ncm,desc,id] of [
 ['21069010','Xarope para refrigerante','bebidas'],['21069090','Preparado para sorvete em máquina','sorvetes'],['18069000','Preparado para sorvete em máquina','sorvetes'],
 ['19021100','Macarrão de trigo','trigo'],['19059090','Pão de trigo','trigo'],['68118200','Telha de fibrocimento','telhas'],['39259000','Telha plástica','telhas'],['39219090','Telha de fibra de vidro','telhas'],
 ['70102000','Mamadeira de vidro','farma'],['39269040','Chupeta','farma'],['90189099','Dispositivo intrauterino','farma'],['27150000','Asfalto','tintas'],['80070090','Peso de estanho para balanceamento automotivo','autopecas'],['23099090','Ração para pássaro pet','racoes']
])test('Cobertura '+ncm+' '+id,()=>assert(ids(fixture(ncm,desc)).includes(id)));
for(const [ncm,desc,excluded] of [
 ['39241000','Prato plástico doméstico',['farma','matcons']],['35061090','Cola escolar branca',['tintas']],['35069190','Cola escolar em bastão',['tintas']],['90191000','Aparelho de massagem portátil',['matcons']],['85166000','Fogão elétrico doméstico',['matcons']],['73259100','Esferas para moinhos',['autopecas','matcons']],
 ['40115000','Pneu para bicicleta',['pneus']],['40132000','Câmara de ar de bicicleta',['pneus']],['15071000','Óleo de soja bruto para uso industrial',['frango']],['02072400','Peru inteiro',['frango']],['85061010','Pilha elétrica',['lampadas']],['37011010','Filme radiográfico',['lampadas']],['19059090','Bolo de trigo',['trigo']],['23099090','Ração bovina',['racoes']],['30023010','Vacina veterinária',['farma']]
])test('Exclusão '+ncm+' '+desc,()=>excluded.forEach(id=>assert(!ids(fixture(ncm,desc)).includes(id))));
test('Telha não recebe prazo de material de construção',()=>{const n=fixture('68118200','Telha de fibrocimento');assert(!ids(n).includes('matcons'));assert(has(n,'ST de RR a conferir'));assert(!has(n,'Material de construção: hipótese'));});
test('Telhas plásticas não recebem dois prazos',()=>{for(const code of ['39259000','39219090']){const n=fixture(code,'Telha plástica');assert(ids(n).includes('telhas'));assert(!ids(n).includes('matcons'));}});
test('Material mantém prazo condicional, MVA e CNAE pendente',()=>{const n=fixture('85161000','Chuveiro elétrico para construção');const al=alerts(n).find(x=>x.titulo.includes('Material de construção: hipótese'));assert(al);assert(al.texto.includes('segundo mês'));assert(al.texto.includes('somente sem preço'));assert(al.texto.includes('CNAE'));});
test('Sobreposições preservadas e pendentes',()=>{const n=fixture('40093100','Tubo de borracha');assert(ids(n).includes('autopecas'));assert(ids(n).includes('matcons'));assert(a.regimesCandidatos(n.itens[0],n).every(r=>r.status.includes('pendente')));});
test('Descrição genérica não vira condição confirmada',()=>assert(a.regimesCandidatos(fixture('25232910','Produto').itens[0],fixture('25232910','Produto')).every(r=>r.status.includes('insuficiente'))));
test('Suco da posição 2202 não é refrigerante por prefixo',()=>assert(!ids(fixture('22029900','Suco de frutas')).includes('bebidas')));
test('Lubrificante CST60 não vira monofásico',()=>{const n=fixture('27101932','Óleo lubrificante','60','6404');assert(!a.isMono(n.itens[0]));assert(ids(n).includes('combustiveis'));assert(!ids(n).includes('monofasico'));assert(has(n,'ST de RR a conferir'));assert(!alerts(n).some(x=>x.texto.includes('Não há ICMS a cobrar')));});
test('Carne com CST02 mantém conferência e revela conflito',()=>{const n=fixture('02013000','Carne bovina','02');assert(!a.isMono(n.itens[0]));assert(has(n,'CST monofásico sem combustível'));assert(has(n,'Antecipação de RR a conferir'));});
for(const [cst,cfop] of [['60','6404'],['00','6403'],['10','6403']])test('Declaração '+cst+'/'+cfop+' não esconde ST',()=>assert(has(fixture('22030000','Cerveja',cst,cfop),'ST de RR a conferir')));
test('Retenção atual reconhecida, não chamada anterior',()=>{const n=fixture('02013000','Carne bovina','10','6403');n.itens[0].icms.vICMSST=180;n.itens[0].icms.vBCST=2000;assert(a.tributacaoDeclarada(n.itens[0]).includes('nesta operação'));assert(!a.tributacaoDeclarada(n.itens[0]).includes('anterior'));assert(alerts(n).find(x=>x.titulo.includes('Antecipação de RR')).texto.includes('Retenção nesta operação declarada'));});
test('CST90 com imposto retido é sinal de ST atual',()=>{const n=fixture('22030000','Cerveja','90','6403');n.itens[0].icms.vICMSST=180;n.itens[0].icms.vBCST=2000;assert(a.isSTcode(n.itens[0]));assert(!has(n,'CFOP de substituto incompatível'));});
test('Importado usa 4% no cenário art75, componentes incluídos',()=>{const n=fixture('96081000','Caneta');const i=n.itens[0];Object.assign(i,{vFrete:100,vSeg:20,vOutro:30,vDesc:50,vIPI:100});i.icms.orig='1';i.icms.pICMS=4;i.icms.vICMS=40;assert.equal(a.interRegiao('SP',i),4);assert.equal(a.baseOperacao(i),1200);assert(alerts(n).find(x=>x.titulo.includes('Antecipação parcial')).texto.includes('192,00'));});
test('Benefício/redução pendente não recebe estimativa automática',()=>{const n=fixture('96081000','Caneta','20');n.itens[0].icms.pRedBC=50;assert(has(n,'fundamento pendente'));assert(alerts(n).find(x=>x.titulo.includes('Antecipação parcial')).texto.includes('Sem estimativa segura'));});
test('Consumo final não é apresentado como revenda',()=>{const n=fixture('96081000','Caneta');n.ide.indFinal='1';assert(alerts(n).find(x=>x.titulo.includes('Antecipação parcial')).texto.includes('consumo final'));});
test('ICMS próprio CST10 continua sendo conferido',()=>{const n=fixture('22030000','Cerveja','10','6403');n.itens[0].icms.vICMS=1;assert(has(n,'ICMS destacado não confere'));});
for(const [ncm,desc] of [['25232910','Cimento'],['85171300','Smartphone novo']])test('Regra interna '+ncm,()=>{const n=fixture(ncm,desc,'00','5102');n.emit.uf='RR';assert(has(n,'ST interna de RR'));});
test('CST60 em dois itens não oculta guia ao agrupar',()=>{const n=fixture('22030000','Cerveja','10','6403');Object.assign(n.itens[0].icms,{vBCST:2000,vICMSST:180});const second=fixture('22030000','Cerveja','60','6404').itens[0];second.n='2';n.itens.push(second);const matches=alerts(n).filter(x=>x.titulo.includes('ST de RR'));assert.equal(matches.length,2);assert(matches.some(x=>x.texto.includes('anterior declarada')));});
test('Hortifrutícola CST00 ainda recebe candidato de isenção',()=>assert(has(fixture('07020000','Tomate fresco'),'Benefício/diferimento legal')));
test('Veículo usado não vira ST de veículo novo',()=>{const n=fixture('87032310','Automóvel usado');assert(!ids(n).includes('veiculos'));assert(has(n,'Benefício/diferimento legal'));assert.equal(a.aliquotaReferencia(n.itens[0]).valor,null);});
test('Frango congelado e leite UHT não ganham 12% automático',()=>{assert.equal(a.aliquotaReferencia(fixture('02071200','Frango congelado').itens[0]).valor,null);assert.equal(a.aliquotaReferencia(fixture('04012010','Leite UHT').itens[0]).valor,null);assert.equal(a.aliquotaReferencia(fixture('02071100','Frango resfriado').itens[0]).valor,12);});
test('Medicamentos com tabela ambígua ficam pendentes',()=>assert(a.regimesCandidatos(fixture('30049099','Medicamento').itens[0],fixture('30049099','Medicamento')).some(r=>r.condicao.includes('ambígua'))));
test('Diesel compatível não dispensa verificação de recolhimento',()=>{const n=fixture('27101921','Óleo diesel','61','5656');assert(ids(n).includes('monofasico'));assert(alerts(n).find(x=>x.titulo.includes('Monofasia')).texto.includes('não autoriza dispensa'));});
test('NCM inválido não produz candidato ou cenário calculável',()=>{const n=fixture('00000000','Produto');assert.equal(ids(n).length,0);assert(has(n,'NCM inválido'));assert(alerts(n).find(x=>x.titulo.includes('Antecipação parcial')).texto.includes('Sem estimativa segura'));});
test('Render separa declaração, condições e regra sem verde indevido',()=>{const n=fixture('02013000','Carne bovina','10','6403'),h=a.renderNF(n,a.analyze(n,ctx),ctx);assert(h.includes('Declarado na NF-e'));assert(h.includes('Regra legal candidata'));assert(!h.includes('compatível com tributação anterior'));});
test('Sem regra não significa integral validado',()=>{const n=fixture('96081000','Caneta'),h=a.renderNF(n,a.analyze(n,ctx),ctx);assert(h.includes('Enquadramento não validado'));});
function mortadela(){const n=fixture('16010000','MORTADELA PERDIGAO 4 PC CX 14KG','00','5102');n.emit.uf='RR';n.ide.idDest='1';n.ide.cUF='14';Object.assign(n.itens[0],{q:1470,vUn:102,vProd:149940});Object.assign(n.itens[0].icms,{vBC:149940,pICMS:20,vICMS:29988});Object.assign(n.tot,{vNF:149940,vProd:149940,vBC:149940,vICMS:29988});return n;}
const render=n=>a.renderNF(n,a.analyze(n,ctx),ctx),flag='✓ Tratamento declarado compatível com a regra geral';
test('Mortadela da imagem recebe flag positiva sem aviso contraditório',()=>{const h=render(mortadela());assert(h.includes(flag));assert(h.includes('legal-candidate compatible'));assert(!h.includes('Enquadramento não validado'));assert(!h.includes('regime do destinatário ainda a conferir'));assert(h.includes('RICMS/RR, art. 46, I, d'));});
for(const [name,change] of [
 ['alíquota incorreta',n=>n.itens[0].icms.pICMS=12],['imposto incorreto',n=>n.itens[0].icms.vICMS=1],['base reduzida',n=>n.itens[0].icms.vBC=100000],
 ['benefício informado',n=>n.itens[0].cBenef='RR000001'],['redução declarada',n=>n.itens[0].icms.pRedBC=10],['CST60',n=>n.itens[0].icms.cst='60'],
 ['retenção inconsistente',n=>n.itens[0].icms.vICMSST=100],['Simples',n=>n.emit.crt='1'],['origem interestadual',n=>n.emit.uf='SP'],['destino outra UF',n=>n.dest.uf='AM'],
 ['CFOP de ST',n=>n.itens[0].cfop='5405'],['CFOP de devolução',n=>n.itens[0].cfop='5202'],['NCM zerado',n=>n.itens[0].ncm='00000000'],['descrição genérica',n=>n.itens[0].desc='Produto'],
 ['produto diverso no mesmo NCM',n=>n.itens[0].desc='Outro preparado alimentício'],['data anterior à alíquota geral de20%',n=>n.ide.dhEmi='2022-01-01T12:00:00Z'],['IPI a conferir',n=>n.itens[0].vIPI=100],
 ['documento complementar',n=>n.ide.finNFe='2'],['dados internos contraditórios',n=>n.ide.idDest='2'],['ICMS próprio ausente',n=>delete n.itens[0].icms.vICMS]
])test('Flag não confirma '+name,()=>{const n=mortadela();change(n);assert(!render(n).includes(flag));});
test('Cálculo incorpora frete/seguro/desconto/outros antes da flag',()=>{const n=mortadela(),i=n.itens[0];Object.assign(i,{vFrete:100,vSeg:20,vOutro:30,vDesc:50});assert(!render(n).includes(flag));i.icms.vBC=150040;i.icms.vICMS=30008;assert(render(n).includes(flag));});
test('Compatibilidade do ICMS não encobre nem é bloqueada por alerta IBS/CBS',()=>{const n=mortadela(),r=a.analyze(n,ctx);r.itemAlerts['1']=[{lvl:'registrar',tit:'IBS/CBS incompatíveis',txt:'Verificar IBS/CBS'}];const h=a.renderNF(n,r,ctx);assert(h.includes(flag));});
test('Exportação válida mantém IBS/CBS e não vira benefício pendente genérico',()=>{const n=fixture('02013000','Carne bovina','41','7102');n.ide.idDest='3';n.dest.uf='EX';n.dest.indIE='9';n.emit.uf='SC';n.itens[0].ibscbs={cst:'410',classe:'410004',vBC:0,vIBS:0,vIBSUF:0,vIBSMun:0,vCBS:0};assert(!has(n,'fundamento pendente'));assert(!has(n,'IBS/CBS incompatíveis'));n.itens[0].ibscbs.cst='000';assert(has(n,'IBS/CBS incompatíveis'));});

// Ampliação v4.9: limites de espécie, operação, descrição e vigência.
function interna(ncm,desc,cst='00',cfop='5102',aliq=20){const n=fixture(ncm,desc,cst,cfop);n.emit.uf='RR';n.ide.idDest='1';n.ide.cUF='14';Object.assign(n.itens[0].icms,{pICMS:aliq,vICMS:aliq*10});n.tot.vICMS=aliq*10;return n;}
const bids=n=>Array.from(a.beneficiosCandidatos(n.itens[0],n),b=>b.id);
const benefit=(n,id)=>a.beneficiosCandidatos(n.itens[0],n).find(b=>b.id===id);
for(const [ncm,desc,id] of [
 ['04072100','Ovos de galinha com casca','ovos'],['01042010','Cabrito vivo','caprinos'],['02045000','Carne caprina resfriada','caprinos'],
 ['87131000','Cadeira de rodas sem motor','ortopedicos'],['90214000','Aparelho auditivo','ortopedicos'],['06022000','Muda de laranjeira','mudas'],
 ['97019100','Pintura original obra de arte','obrasArte'],['69139000','Vaso artesanal','artesanato'],
 ['15180090','Óleo de cozinha usado para indústria de sabão','oleoUsado'],['40122000','Pneu usado para reciclagem','pneusUsados'],
 ['85071090','Sucata de bateria esgotada para reciclagem','bateriasUsadas'],['01022190','Matriz bovina registrada','reprodutores'],
 ['49019900','Livro impresso de literatura','livros'],['84272090','Empilhadeira usada','maquinasUsadas'],
 ['01022990','Bovino vivo para abate','bovinosAbate'],['01041011','Ovino vivo','gadoProdutor'],['25084090','Argila para cerâmica','ceramicaInsumos'],
 ['72044900','Sucata ferrosa','sucata'],['38089199','Inseticida agrícola','agroInternoA'],['31021010','Ureia fertilizante agrícola','agroC'],
 ['03027100','Tambaqui pescado regional fresco','pescadoRegional'],['03027100','Tambaqui criado em cativeiro','pescadoCativeiro'],
 ['03063990','Pós-larvas de camarão','posLarvas'],['40141000','Preservativo masculino','preservativos'],['84322900','Arado agrícola','maquinaAgricola']
])test('Benefício independente do CST: '+id,()=>{const n=interna(ncm,desc);assert(bids(n).includes(id));assert(!render(n).includes(flag));});
for(const [ncm,desc,id] of [
 ['04089100','Ovo em pó processado','ovos'],['02044300','Carne de cordeiro congelada','caprinos'],['90212900','Prótese dentária','ortopedicos'],
 ['06029029','Muda ornamental','mudas'],['15179090','Óleo de cozinha novo industrial','oleoUsado'],['40122000','Pneu usado para revenda normal','pneusUsados'],
 ['85071090','Bateria automotiva nova','bateriasUsadas'],['49019900','Livro de escrituração pautado','livros'],['07082000','Feijão seco','horti'],
 ['08023200','Noz seca','horti'],['07020000','Tomate em conserva','horti'],['01039200','Suíno para abate','bovinosAbate'],
 ['01041011','Ovino para abate','bovinosAbate'],['23099090','Ração pet para cães','agroInternoA'],['31021010','Ureia fertilizante agrícola','agroInternoA'],
 ['03024100','Pirarucu regional fresco','pescadoRegional'],['03061790','Camarão adulto congelado','posLarvas'],['96081000','Produto sem descrição fiscal','livros']
])test('Benefício não se estende a '+desc,()=>assert(!bids(interna(ncm,desc)).includes(id)));
test('ST e benefício coexistem: preservativo CST60 não esconde isenção',()=>{const n=interna('40141000','Preservativo masculino','60','5405');assert(ids(n).includes('farma'));assert(bids(n).includes('preservativos'));assert(has(n,'Benefício/diferimento legal'));});
test('Hortícola reconhecido deixa de dizer sem regra suficiente',()=>{const h=render(interna('07020000','Tomate fresco'));assert(h.includes('Hipótese de isenção'));assert(h.includes('Tratamento da operação a conferir'));assert(!h.includes('Sem regra específica suficiente'));});
test('Embalagem de agrotóxico só no retorno vazio sem ônus a comprovar',()=>{const n=interna('39239000','Retorno de embalagem vazia de agrotóxico','40','5921');assert(bids(n).includes('embalagensAgro'));assert(!bids(n).includes('retornaveis'));n.itens[0].desc='Embalagem nova de agrotóxico';n.itens[0].cfop='5102';assert(!bids(n).includes('embalagensAgro'));});
test('Vasilhame retornável difere da venda de embalagem',()=>{const n=interna('70109090','Vasilhame retornável vazio','40','5920');assert(bids(n).includes('retornaveis'));n.itens[0].cfop='5102';assert(!bids(n).includes('retornaveis'));});
test('CFOP de amostra exige descrição e condições de gratuidade',()=>{const n=interna('33030010','Amostra grátis de perfume','40','5911');assert(bids(n).includes('amostras'));assert(benefit(n,'amostras').condicao.includes('quantidade'));n.itens[0].desc='Perfume para venda';assert(!bids(n).includes('amostras'));});
test('Alienação de ativo exige tempo de uso, sem redução calculada',()=>{const n=interna('84272090','Empilhadeira usada','00','5551');assert(bids(n).includes('ativoUsado'));assert(benefit(n,'ativoUsado').condicao.includes('12 meses'));assert(!render(n).includes(flag));});
test('Partes de máquina usada não recebem benefício de máquina inteira',()=>assert(!bids(interna('84831090','Peça eixo de máquina usada')).includes('maquinasUsadas')));
test('Diferimento de gado não migra para operação interestadual',()=>assert(!bids(fixture('01041011','Ovino vivo')).includes('gadoProdutor')));
test('Redução de carne inclui coelho e estados salgados, só saída de RR',()=>{const n=fixture('02081000','Carne de coelho congelada');n.emit.uf='RR';n.dest.uf='AM';assert(bids(n).includes('carneInterestadual'));n.emit.uf='SP';n.dest.uf='RR';assert(!bids(n).includes('carneInterestadual'));});
test('Insumos vindos de outra UF mantêm referência e legislação de origem pendente',()=>{const n=fixture('12099100','Semente certificada para plantio');assert(bids(n).includes('agroInterA'));assert(benefit(n,'agroInterA').condicao.includes('legislação de origem'));assert(alerts(n).find(x=>x.titulo.includes('Antecipação parcial')).texto.includes('Sem estimativa segura'));});
test('Farelo agro B não recebe antiga hipótese de fertilizante',()=>{const n=fixture('23040010','Farelo de soja para ração animal');assert(bids(n).includes('agroInterB'));n.itens[0].ncm='31021010';n.itens[0].desc='Ureia fertilizante agrícola';assert(bids(n).includes('agroC'));assert(!bids(n).includes('agroInterB'));});
test('Prazo conferido pela emissão, não pelo dia de leitura',()=>{const n=interna('03027100','Tambaqui regional fresco');n.ide.dhEmi='2026-04-30T10:00:00-04:00';assert.equal(benefit(n,'pescadoRegional').situacao,'condicoes_pendentes');n.ide.dhEmi='2026-05-01T10:00:00-04:00';assert.equal(benefit(n,'pescadoRegional').situacao,'prazo_fonte_encerrado');assert(render(n).includes('conferir prorrogação'));assert(!render(n).includes(flag));});
test('Prorrogação nacional não vira isenção de RR confirmada',()=>{const n=interna('38089199','Inseticida agrícola');n.ide.dhEmi='2026-10-03T10:00:00Z';const b=benefit(n,'agroInternoA');assert.equal(b.situacao,'prazo_fonte_encerrado');assert(b.vigencia.includes('79/25'));assert(b.vigencia.includes('2027'));assert(b.vigencia.includes('confirmar incorporação'));});
test('Norma histórica e data ausente nunca validam vigência',()=>{const n=interna('01022990','Bovino para abate');n.ide.dhEmi='2022-10-03';assert.equal(benefit(n,'bovinosAbate').situacao,'anterior_referencia');n.ide.dhEmi='';assert.equal(benefit(n,'bovinosAbate').situacao,'data_pendente');});
test('NCM inválido e operação fora de RR não produzem benefício RR',()=>{assert.equal(bids(interna('00000000','Ovos')).length,0);const n=fixture('04072100','Ovos');n.dest.uf='AM';assert.equal(bids(n).length,0);});
for(const [ncm,desc,aliq] of [['16010000','Linguiça',20],['16010000','Salsicha',20],['16010000','Salame',20],['10063021','Arroz branco',12],['07133399','Feijão carioca seco',12],['11062000','Farinha de mandioca',12],['11081400','Fécula de mandioca',12]])test('Compatibilidade própria conferida: '+desc,()=>{const n=interna(ncm,desc,'00','5102',aliq);assert(render(n).includes(flag));n.itens[0].icms.pICMS=aliq===20?12:20;assert(!render(n).includes(flag));});
test('Alíquota de referência não encobre isenção de ovos',()=>{const n=interna('04072100','Ovos de galinha','00','5102',12);assert.equal(a.aliquotaReferencia(n.itens[0]).valor,12);assert(bids(n).includes('ovos'));assert(!render(n).includes(flag));});
test('Data civil inválida não valida vigência nem flag',()=>{const n=interna('04072100','Ovos');n.ide.dhEmi='2026-02-30T12:00:00Z';assert.equal(benefit(n,'ovos').situacao,'data_pendente');const m=mortadela();m.ide.dhEmi=n.ide.dhEmi;assert(!render(m).includes(flag));});
test('Arroz para plantio e mistura não ganham flag de venda comum',()=>{for(const d of ['Arroz semente para plantio','Arroz mistura temperada'])assert(!render(interna('10063021',d,'00','5102',12)).includes(flag));});
function remessa5904(){
 const n=fixture('16010000','Mortadela','00','5904');Object.assign(n.ide,{natOp:'Remessa para venda fora do estabelecimento',idDest:'1',cUF:'14'});n.emit.uf='RR';n.emit.mun='Boa Vista';n.dest.doc=n.emit.doc;n.dest.uf='RR';n.dest.mun='Boa Vista';n.infCpl='Notas fiscais de venda nº 100 a 150, série 1.';n.itens[0].icms.pICMS=20;n.itens[0].icms.vICMS=200;Object.assign(n.tot,{vBC:1000,vICMS:200});
 let k='1426101111111100011155001000000101112345678',sum=0,w=2;for(let i=42;i>=0;i--){sum+=Number(k[i])*w;w=w===9?2:w+1;}const r=sum%11;n.chave=k+(r<2?0:11-r);return n;
}
test('5904: verificações do XML e mês sem confirmação manual',()=>{const n=remessa5904(),r=a.analyze(n,ctx);assert.equal(r.remessa5904.checks.length,4);assert(r.remessa5904.ok);assert.equal(r.lvl,'libera');assert(!a.renderNF(n,r,ctx).includes('data-check5904'));});
for(const text of ['série 1','Placa 123, série 1','Notas fiscais série 1','Notas fiscais nº 100','Notas fiscais sem números e séries'])test('5904: referência incompleta não basta — '+text,()=>assert(!a.referencias5904(text)));
for(const text of ['Notas fiscais nº 100 a 150, série 1','NF-e número 123 série 2','Notas fiscais 100 a 150, série única','Notas fiscais nº 100, sem série'])test('5904: identifica indicação documental — '+text,()=>assert(a.referencias5904(text)));
for(const [name,edit] of [
 ['destinatário ausente',n=>n.dest=null],['outro estabelecimento da mesma raiz',n=>n.dest.doc='11111111000200'],['UF diversa',n=>n.dest.uf='AM'],['idDest interestadual',n=>n.ide.idDest='2'],['entrada',n=>n.ide.tpNF='0'],['natureza consignação',n=>n.ide.natOp='Remessa em consignação'],['referência só série',n=>n.infCpl='série 1'],['destaque CST00 zerado',n=>{n.itens[0].icms.vICMS=0;n.itens[0].icms.pICMS=0;n.tot.vICMS=0;}],['cálculo divergente',n=>{n.itens[0].icms.vICMS=1;n.tot.vICMS=1;}]
])test('5904: requisito específico divergente — '+name,()=>{const n=remessa5904();edit(n);const r=a.analyze(n,ctx);assert(!r.remessa5904.ok);assert.notEqual(r.lvl,'libera');});
test('5904: outro alerta material continua prevalecendo',()=>{const n=remessa5904();n.itens[0].icms.pICMS=7;n.itens[0].icms.vICMS=70;n.tot.vICMS=70;assert(a.avaliar5904(n).ok);assert.equal(a.analyze(n,ctx).lvl,'confere');});
test('5904: autorização após abordagem continua Para',()=>{const n=remessa5904(),c={...ctx,abordagem:new Date(Date.now()-3600000)};assert.equal(a.analyze(n,c).lvl,'para');});
test('5904: ST anterior não exige destaque próprio artificial',()=>{const n=remessa5904(),i=n.itens[0];i.ncm='22021000';i.desc='Refrigerante';i.icms.cst='60';i.icms.vBC=0;i.icms.vICMS=0;i.icms.pICMS=0;n.tot.vBC=0;n.tot.vICMS=0;assert(a.avaliar5904(n).ok);assert.equal(a.analyze(n,ctx).lvl,'libera');});
test('5904: benefício pendente conserva o alerta fiscal existente',()=>{const n=remessa5904();n.itens[0].icms.cst='40';n.itens[0].icms.vBC=0;n.itens[0].icms.vICMS=0;n.itens[0].icms.pICMS=0;n.tot.vICMS=0;n.tot.vBC=0;assert.equal(a.analyze(n,ctx).lvl,'confere');});
test('6904 não recebe as novas verificações de 5904',()=>{const n=remessa5904();n.itens[0].cfop='6904';assert.equal(a.avaliar5904(n),null);assert(!('remessa5904' in a.analyze(n,ctx)));});
function mes5904(emissao,verificacao){const n=remessa5904();n.ide.dhEmi=emissao;n.leituraEm=new Date(verificacao);return a.avaliar5904(n).checks.find(c=>c.id==='mes');}
for(const [name,emi,ver,ok] of [
 ['mesmo mês e ano','2026-10-01T00:00:00-04:00','2026-10-31T23:59:59-04:00',true],
 ['mês anterior','2026-09-30T23:59:59-04:00','2026-10-01T00:00:00-04:00',false],
 ['mesmo número do mês em outro ano','2025-10-15T12:00:00-04:00','2026-10-15T12:00:00-04:00',false],
 ['virada de ano','2026-12-31T23:59:59-04:00','2027-01-01T00:00:00-04:00',false],
 ['UTC em outubro ainda é setembro em RR','2026-10-01T02:00:00Z','2026-09-30T23:00:00-04:00',true],
 ['UTC mudou mês mas RR ainda não','2026-09-30T23:00:00-04:00','2026-10-01T03:59:59Z',true],
 ['virada local de mês em RR','2026-10-01T03:59:59Z','2026-10-01T04:00:00Z',false],
 ['emissão ausente','','2026-10-15T12:00:00-04:00',false],
 ['data civil inválida','2026-02-30T12:00:00-04:00','2026-03-01T12:00:00-04:00',false],
 ['verificação inválida','2026-10-15T12:00:00-04:00','inválida',false],
 ['emissão sem fuso','2026-10-15T12:00:00','2026-10-15T12:00:00-04:00',false]
])test('5904 mês: '+name,()=>assert.equal(mes5904(emi,ver).ok,ok));
// Regressões v4.11.3: classificação legal da carne e unidades não contáveis.
function carneRevendaRR(){
 const n=fixture('02013000','MAMINHA DA ALCATRA KG','60','5405');
 n.emit.uf='RR';n.emit.mun='Boa Vista';n.ide.idDest='1';n.ide.cUF='14';n.ide.indFinal='1';
 n.dest.cpf=true;n.dest.doc='12345678909';n.dest.ie='';n.dest.indIE='9';
 Object.assign(n.itens[0],{un:'KG',q:21.36,vProd:1174.59,vUn:54.990169,cest:'1708400'});
 Object.assign(n.itens[0].icms,{vBC:0,pICMS:0,vICMS:0});
 const pic={...n.itens[0],n:'2',desc:'PICANHA MATURADA KG',ncm:'02023000',q:112.68,vProd:10647.13,vUn:94.489972,icms:{...n.itens[0].icms}};
 n.itens.push(pic);Object.assign(n.tot,{vNF:11821.72,vProd:11821.72,vBC:0,vICMS:0});
 return n;
}
test('ST carne: maminha/picanha em revenda interna RR com encerramento',()=>{
 const n=carneRevendaRR();
 assert(n.itens.every(i=>a.classificarRegimeOperacional(i,n).tipo==='confirmado'));
 assert(n.itens.every(i=>a.classificarRegimeOperacional(i,n).semNovaAntecipacao));
 const html=render(n);
 assert(html.includes('ANTECIPAÇÃO TOTAL — ICMS COM ENCERRAMENTO'));
 assert(html.includes('ENQUADRAMENTO LEGAL'));
 assert(!html.includes('Regra legal candidata: Gado'));
});
test('Quantidades preservam KG e soma do peso, sem 0 artificial',()=>{
 const n=carneRevendaRR(),q=a.maiorQuantidadePorUnidade(n.itens);
 assert(q.includes('112,68 KG (item 2)'));assert(q.includes('134,04 KG'));
 const achado=alerts(n).find(x=>x.titulo.includes('CPF: possível aquisição comercial'));
 assert(achado);assert.equal(achado.lvl,'registrar');
 assert(achado.texto.includes('112,68 KG'));assert(achado.texto.includes('134,04 KG'));
 assert(achado.texto.includes('NÃO exigir nova antecipação'));
 assert(!achado.texto.includes('um item: 0'));
});
test('Mistura de KG e UN lista cada unidade sem comparação falsa',()=>{
 const n=carneRevendaRR(),extra={...n.itens[0],n:'3',ncm:'96081000',desc:'Caneta',un:'UN',q:40,cfop:'5102',vProd:200,icms:{...n.itens[0].icms,cst:'00'}};
 n.itens.push(extra);const q=a.maiorQuantidadePorUnidade(n.itens);
 assert(q.includes('112,68 KG'));assert(q.includes('40 UN'));assert.equal(a.classificarRegimeOperacional(extra,n).tipo,'nao_identificado');
 assert.equal(alerts(n).find(x=>x.titulo.includes('CPF: possível aquisição comercial')).lvl,'confere');
});
test('Entrada interestadual de carne aplica regime mas não presume guia paga',()=>{
 const n=fixture('02013000','Carne bovina resfriada','60','6404');
 const c=a.classificarRegimeOperacional(n.itens[0],n);
 assert.equal(c.tipo,'pendente');assert.equal(c.semNovaAntecipacao,false);
 assert(c.nota.includes('responsabilidade tributária'));assert(has(n,'Antecipação de RR a conferir'));
});
test('ST fora de carne continua pendente, não verde por CST isolado',()=>{
 const n=interna('22030000','Cerveja','60','5405'),c=a.classificarRegimeOperacional(n.itens[0],n);
 assert.equal(c.tipo,'pendente');assert(!render(n).includes('✓ ANTECIPAÇÃO TOTAL — ICMS COM ENCERRAMENTO'));
});
// v4.11.7 — autopeças NCM 8511 / CEST 01.054.00 e triagem sem comprovante de ST.
function motorPartidaST(){
 const n=fixture('85114000','(8000158P) MOTOR PART PG260D 12V-Ped Anex:436','60','5405');
 n.emit.uf='RR';n.emit.mun='Boa Vista';n.ide.idDest='1';n.ide.cUF='14';n.ide.indFinal='1';
 n.dest.indIE='9';n.dest.ie='';n.itens[0].cest='0105400';
 Object.assign(n.itens[0].icms,{orig:'5',vBC:0,pICMS:0,vICMS:0,vBCST:0,vICMSST:0,vICMSSTRet:0});
 n.tot.vICMS=0;n.tot.vNF=585;n.tot.vProd=585;
 return n;
}
test('NCM 8511.40.00/CEST 01.054.00 reconhece ST do motor de partida na NF 42474',()=>{
 const n=motorPartidaST(),reg=a.classificarRegimeOperacional(n.itens[0],n),h=render(n);
 assert(ids(n).includes('autopecas'));assert.equal(reg.id,'autopecas_st');
 assert.equal(reg.tipo,'confirmado');assert(reg.semNovaAntecipacao);
 assert(h.includes('✓ AUTOPEÇAS — ST ANTERIOR DECLARADA'));
 assert(!has(n,'ST interna de RR a conferir'));
 assert(!h.includes('NÃO VERIFICADO NO SIAT'));assert(!h.includes('3 · Recolhimento anterior'));
});
for(const [nome,alterar] of [
 ['CEST ausente',n=>n.itens[0].cest=''],
 ['CEST divergente',n=>n.itens[0].cest='0109900'],
 ['NCM divergente',n=>n.itens[0].ncm='85124000'],
 ['descrição genérica',n=>n.itens[0].desc='Equipamento genérico'],
 ['CFOP venda comum',n=>n.itens[0].cfop='5102'],
 ['CST sem ST anterior',n=>n.itens[0].icms.cst='00'],
 ['saída interestadual',n=>{n.dest.uf='AM';n.ide.idDest='2';n.itens[0].cfop='6404'}]
])test('Motor de partida não recebe ST confirmada com '+nome,()=>{
 const n=motorPartidaST();alterar(n);
 assert.notEqual(a.classificarRegimeOperacional(n.itens[0],n).tipo,'confirmado');
});
test('Triagem ST não solicita comprovante de arrecadação',()=>{
 for(const n of [motorPartidaST(),carneRevendaRR()]){
  const h=render(n);assert(!h.includes('NÃO VERIFICADO NO SIAT'));assert(!h.includes('3 · Recolhimento anterior'));
  assert(!alerts(n).some(x=>/comprovante de (?:arrecadação|pagamento)|olhe a guia/i.test(x.texto)));
 }
});
// v4.11.4 — copiar XML bruto após consulta automática, upload e abertura do histórico.
test('XML bruto: botão existe na NF real sem inserir XML no HTML',()=>{
 const n=fixture('02013000','Carne bovina'),raw='<?xml version="1.0"?><nfeProc><NFe>conteúdo integral &amp; completo</NFe></nfeProc>';
 n.xmlBruto=raw;const h=render(n);
 assert(h.includes('bCopyXml'));assert(h.includes('Copiar XML bruto'));assert(h.includes('bCopyChave'));
 assert(!h.includes(raw)); // XML mantido em memória e não em atributo HTML.
});
test('XML bruto: botão não aparece sem texto original disponível',()=>{
 const n=fixture('02013000','Carne bovina');assert(!render(n).includes('bCopyXml'));
});
test('XML bruto: cópia usa nota da tela; histórico não troca por NF com mesma chave',()=>{
 const code=html.slice(html.indexOf('function copiarXmlBruto(btn){'),html.indexOf('function renderChave(info,btn=null){'));
 assert(code.includes('function copiarXmlBruto'));
 const key='1'.repeat(44),xmlAtual='<nfeProc>triagem &amp; final</nfeProc>',xmlHistorico='<nfeProc>histórico original</nfeProc>';
 const atuais=[{chave:key,xmlBruto:xmlAtual}],historica={chave:key,xmlBruto:xmlHistorico};
 const copias=[];
 const make=new Function('state','histDetalheNf','copiarTexto','setTimeout','document',code+'return copiarXmlBruto');
 const fn=make({nfs:atuais},historica,(txt,cb)=>{copias.push(txt);cb(true)},()=>{},{});
 function btn(hist){return {dataset:{chave:key},textContent:'Copiar XML bruto',isConnected:true,closest:sel=>hist&&sel==='#histDetalhe'?{}:null};}
 const a=btn(false),b=btn(true);fn(a);fn(b);
 assert.equal(copias[0],xmlAtual);assert.equal(copias[1],xmlHistorico);
 assert.equal(a.textContent,'XML copiado ✓');assert.equal(b.textContent,'XML copiado ✓');
});
test('XML bruto: se clipboard bloquear, exibe conteúdo integral para seleção manual',()=>{
 const code=html.slice(html.indexOf('function copiarXmlBruto(btn){'),html.indexOf('function renderChave(info,btn=null){'));
 const raw='<nfeProc>'+('carne bovina &amp; '.repeat(50))+'</nfeProc>';
 const area={};const elems=[];
 const document={createElement:tag=>{const e={tag,readOnly:false,rows:0,attributes:{},setAttribute(k,v){this.attributes[k]=v},append(...children){this.children=children}};elems.push(e);return e}};
 const make=new Function('state','histDetalheNf','copiarTexto','setTimeout','document',code+'return copiarXmlBruto');
 const fn=make({nfs:[{chave:'44',xmlBruto:raw}]},null,(txt,cb)=>cb(false),()=>{},document);
 const b={dataset:{chave:'44'},textContent:'Copiar XML bruto',closest:()=>null,nextElementSibling:null,insertAdjacentElement:(pos,el)=>{b.nextElementSibling=el}};
 fn(b);
 assert.equal(b.textContent,'Cópia bloqueada');assert.equal(elems.filter(x=>x.tag==='textarea').length,1);
 assert.equal(elems.find(x=>x.tag==='textarea').value,raw);
});
// v4.11.5 — distinguir regime, declaração e recolhimento sem consulta obrigatória.
test('Antecipação total exibe enquadramento e declaração sem alerta de pagamento de ST',()=>{
 const n=carneRevendaRR(),h=render(n);
 assert(h.includes('✓ ANTECIPAÇÃO TOTAL — ICMS COM ENCERRAMENTO'));
 assert(h.includes('1 · Enquadramento legal'));
 assert(h.includes('2 · Tributação anterior declarada'));
 assert(!h.includes('3 · Recolhimento anterior'));
 assert(h.includes('✓ Tributação anterior declarada na NF-e'));
 assert(!h.includes('NÃO VERIFICADO NO SIAT'));
 assert(!h.includes('CONFERÊNCIA MANUAL REGISTRADA'));
 assert(!h.includes('Registrar conferência manual'));
});
test('Regime de carne não valida CFOP/CST alterados nem pagamento',()=>{
 const n=carneRevendaRR();n.itens[0].cfop='5102';n.itens[0].icms.cst='00';
 const h=render(n);
 assert(h.includes('✓ ANTECIPAÇÃO TOTAL — ICMS COM ENCERRAMENTO'));
 assert(h.includes('Declaração compatível em 1 de 2 itens'));
 assert(!h.includes('NÃO VERIFICADO NO SIAT'));
});
test('Sem regime confirmado não apresenta antecipação total para outros produtos',()=>{
 const n=interna('22030000','Cerveja','60','5405'),h=render(n);
 assert(!h.includes('✓ ANTECIPAÇÃO TOTAL — ICMS COM ENCERRAMENTO'));
 assert(h.includes('Condições do regime a conferir'));
});
// v4.11.8 — CPF e finalidade empresarial: sem presumir revenda, irregularidade ou pagamento.
function compraCPF(q=12,valor=4800,cfop='5102'){
 const n=interna('96081000','Peças de reposição','00',cfop,20);
 n.dest.doc='12345678909';n.dest.cpf=true;n.dest.ie='';n.dest.indIE='9';
 n.itens[0].q=q;n.itens[0].vProd=valor;n.itens[0].vUn=valor/q;
 n.tot.vProd=valor;n.tot.vNF=valor;return n;
}
const alertaCPF=n=>alerts(n).find(x=>x.titulo==='CPF: possível aquisição comercial ou empresarial');
test('CPF: alto volume exige conferência de finalidade e eventualmente DIFIS',()=>{
 const flag=alertaCPF(compraCPF());assert(flag);assert.equal(flag.lvl,'confere');
 assert(flag.texto.includes('revenda, uso/consumo de empresa'));
 assert(flag.texto.includes('verdadeira adquirente'));
 assert(flag.texto.includes('DIFIS'));assert(flag.texto.includes('não comprovam revenda'));
});
test('CPF: valor elevado isoladamente apenas registra',()=>{
 const flag=alertaCPF(compraCPF(1,9500));assert(flag);assert.equal(flag.lvl,'registrar');
});
test('CPF: compra particular pequena não recebe alerta',()=>assert(!alertaCPF(compraCPF(1,250))));
test('CNPJ indIEDest9 não vira CPF em compra de alto valor',()=>{
 const n=compraCPF(70,50000);n.dest.doc='12345678000195';n.dest.cpf=false;n.dest.indIE='9';
 assert(!alertaCPF(n));
});
test('Destinatário estrangeiro ou sem documento não é CPF',()=>{
 const n=compraCPF(12,8000);n.dest.cpf=false;n.dest.estrangeiro=true;n.dest.doc='EX123';
 assert(!alertaCPF(n));n.dest=null;assert(!alertaCPF(n));
});
test('Remessa não deve gerar alerta de aquisição comercial',()=>{
 const n=compraCPF(50,15000,'5915');assert(!alertaCPF(n));
});
test('CPF com ST de autopeças é registrável sem antecipação automática',()=>{
 const n=motorPartidaST();n.dest.cpf=true;n.dest.doc='12345678909';n.itens[0].q=12;
 const flag=alertaCPF(n);assert(flag);assert.equal(flag.lvl,'registrar');
 assert(flag.texto.includes('NÃO exigir nova antecipação'));
 assert(!flag.texto.includes('comprovante de arrecadação'));
});
test('Histórico no aparelho conta somente notas distintas do mesmo CPF',()=>{
 const orig=box.localStorage.getItem,cpf='12345678909',n=compraCPF(1,300);
 const hist=[
  {chave:'2'.repeat(44),destCpf:cpf,valor:2300},
  {chave:'2'.repeat(44),destCpf:cpf,valor:2300},
  {chave:'3'.repeat(44),destCpf:cpf,valor:1900},
  {chave:n.chave,destCpf:cpf,valor:4500},
  {chave:'4'.repeat(44),destCpf:'00000000000',valor:5000},
  {chave:'5'.repeat(44),valor:9000}
 ];
 box.localStorage.getItem=k=>k==='triagem.historico'?JSON.stringify(hist):orig(k);
 try{
  const local=a.ocorrenciasLocaisCPF(n);
  assert.equal(local.quantidade,2);assert.equal(local.valor,4200);
  const flag=alertaCPF(n);assert(flag);assert.equal(flag.lvl,'confere');
  assert(flag.texto.includes('2 outra(s) NF-e'));
  assert(flag.texto.includes('consultas salvas'));
 }finally{box.localStorage.getItem=orig;}
});
test('Histórico não confunde várias consultas à mesma chave com habitualidade',()=>{
 const orig=box.localStorage.getItem,cpf='12345678909',n=compraCPF(1,100);
 box.localStorage.getItem=k=>k==='triagem.historico'?JSON.stringify([
  {chave:'6'.repeat(44),destCpf:cpf,valor:2300},
  {chave:'6'.repeat(44),destCpf:cpf,valor:2300},
  {chave:n.chave,destCpf:cpf,valor:5000}
 ]):orig(k);
 try{assert.equal(a.ocorrenciasLocaisCPF(n).quantidade,1);assert(!alertaCPF(n));}
 finally{box.localStorage.getItem=orig;}
});
test('Histórico CPF é armazenado somente localmente e não recupera consultas antigas',()=>{
 assert(html.includes('destCpf:nf.dest&&nf.dest.cpf'));
 assert(html.includes('localStorage.setItem("triagem.historico"'));
 assert(html.includes('a partir da v4.11.8'));
});
// v4.11.9 — Sorvetes Caribe, NF-e nº 43.306: ST possível, não validada.
function sorvetesCaribe(){
 const n=fixture('21050010','BALDE DE 12 L','', '5101');
 n.emit.uf='RR';n.emit.mun='Boa Vista';n.emit.crt='1';n.ide.idDest='1';n.ide.cUF='14';
 n.ide.indFinal='0';n.ide.nNF='43306';
 n.dest.cpf=true;n.dest.doc='11906106207';n.dest.indIE='2';n.dest.ie='';
 Object.assign(n.itens[0],{n:'1',q:3,vProd:330,vUn:110,cest:'2300100',un:'UN',unTrib:'UN',qTrib:3});
 n.itens[0].icms={...n.itens[0].icms,cst:'',csosn:'102',vBC:0,pICMS:0,vICMS:0,vBCST:0,vICMSST:0};
 const second={...n.itens[0],n:'2',cod:'5',q:1,vProd:105,vUn:105,un:'UN',unTrib:'KG',qTrib:1,icms:{...n.itens[0].icms}};
 const third={...n.itens[0],n:'3',cod:'32',q:1,vProd:100,vUn:100,un:'KG',unTrib:'KG',qTrib:1,icms:{...n.itens[0].icms}};
 n.itens.push(second,third);n.tot.vNF=535;n.tot.vProd=535;n.tot.vICMS=0;
 n.pag=[{tPag:'90',vPag:0}];
 return n;
}
test('Sorvetes Caribe: NCM/CEST reconhecem hipótese mesmo com BALDE DE 12 L',()=>{
 const n=sorvetesCaribe(),reg=a.classificarRegimeOperacional(n.itens[0],n),rule=a.regimesCandidatos(n.itens[0],n).find(x=>x.id==='sorvetes');
 assert(rule);assert(rule.status.includes('descrição genérica'));
 assert.equal(reg.id,'sorvetes_st');assert.equal(reg.tipo,'pendente');
 assert.equal(reg.semNovaAntecipacao,false);
});
test('Sorvetes Caribe: 3 itens sinalizados com CFOP5101/CSOSN102 sem retenção',()=>{
 const n=sorvetesCaribe(),r=a.analyze(n,ctx),x=r.alerts.find(x=>x.titulo.includes('fabricante sem retenção declarada'));
 assert(x);assert.equal(x.lvl,'confere');assert.equal(r.lvl,'confere');
 assert(x.texto.includes('CFOP 5101'));assert(x.texto.includes('CSOSN 102'));
 assert(x.texto.includes('indFinal=0'));assert(x.texto.includes('5.401'));
 assert(x.texto.includes('Itens: 1, 2, 3')||x.texto.includes('Todos os itens'));
 const output=a.renderNF(n,r,ctx);assert(output.includes('Sorvetes — ST legal identificada'));
 assert(!output.includes('✓ ANTECIPAÇÃO TOTAL — ICMS COM ENCERRAMENTO'));
});
test('Sorvetes Caribe: sem declaração de sorvete na descrição, exigir conferência física',()=>{
 const n=sorvetesCaribe(),x=alerts(n).find(x=>x.titulo.includes('descrição genérica'));
 assert(x);assert(x.texto.includes('não comprova'));
});
test('Sorvetes Caribe: NCM 2105.00.10 depende da massa, não 12 litros',()=>{
 const n=sorvetesCaribe(),x=alerts(n).find(x=>x.titulo.includes('peso da embalagem'));
 assert(x);assert(x.texto.includes('2 kg'));assert(x.texto.includes('2105.00.90'));
 assert(x.texto.includes('não informa a massa'));
});
test('Sorvetes Caribe: uCom UN e uTrib KG entram como conversão a conferir',()=>{
 const n=sorvetesCaribe(),x=alerts(n).find(x=>x.titulo.includes('unidades comercial e tributável'));
 assert(x);assert(x.texto.includes('uCom=UN'));assert(x.texto.includes('uTrib=KG'));
 assert(x.texto.includes('Itens: 2'));
});
test('Sorvetes consumidor final: não presume retenção do fabricante',()=>{
 const n=sorvetesCaribe();n.ide.indFinal='1';
 assert(!alerts(n).some(x=>x.titulo.includes('fabricante sem retenção')));
 assert(has(n,'consumidor final declarado'));
});
test('Sorvetes com CFOP 5401 e CSOSN 202 não recebem alerta de ausência de retenção',()=>{
 const n=sorvetesCaribe();n.itens[0].cfop='5401';n.itens[0].icms.csosn='202';n.itens[0].icms.vBCST=1000;n.itens[0].icms.vICMSST=50;
 n.itens=n.itens.slice(0,1);
 assert(!alerts(n).some(x=>x.titulo.includes('fabricante sem retenção')));
 assert.equal(a.classificarRegimeOperacional(n.itens[0],n).tipo,'pendente');
});
test('Sorvetes com CEST errado e descrição genérica não recebem alerta especial',()=>{
 const n=sorvetesCaribe();n.itens.forEach(i=>i.cest='2309900');
 assert(!alerts(n).some(x=>x.titulo.includes('fabricante sem retenção')));
 assert(!a.avaliarSorvetesST(n.itens[0],n));
});
test('Outros NCM de preparados não recebem alerta específico de sorvetes 2105',()=>{
 const n=sorvetesCaribe();n.itens.forEach(i=>{i.ncm='21069090';i.desc='PREPARADO PARA SORVETE EM MAQUINA';});
 assert(!alerts(n).some(x=>x.titulo.includes('fabricante sem retenção')));
});
test('Nota de sorvetes fora de RR não recebe enquadramento interno específico',()=>{
 const n=sorvetesCaribe();n.emit.uf='AM';n.ide.idDest='2';n.itens.forEach(i=>i.cfop='6101');
 assert(!alerts(n).some(x=>x.titulo.includes('fabricante sem retenção')));
 assert(!a.avaliarSorvetesST(n.itens[0],n));
});
test('Regressão: alerta de ST não exige guia e não lança cobrança automática',()=>{
 const n=sorvetesCaribe(),x=alerts(n).find(x=>x.titulo.includes('fabricante sem retenção'));
 assert(x);assert(!/apresentar (?:guia|comprovante)|exigir (?:guia|comprovante)/i.test(x.texto));
 assert(x.texto.includes('Não presumir irregularidade tributária'));
});
// v4.11.6 — a consulta externa não pode ficar visualmente travada após erro.
test('Consulta em timeout mostra botão de nova tentativa sem exigir reler DANFE',()=>{
 assert(html.includes('bRetryXml'));
 assert(html.includes('Tentar novamente'));
 assert(html.includes('Consulta não concluída: nenhum XML recuperado e nenhuma triagem realizada.'));
 assert(html.includes('O serviço externo não retornou o XML dentro do prazo.'));
 assert(html.includes('const tempoMaximo=setTimeout(()=>controller.abort(),25000)'));
});
test('Falha de consulta mantém feedback correto e nunca exibe resultado de consulta antiga',()=>{
 assert(html.includes('const id=++state.consultaId'));
 assert(html.includes('if(id!==state.consultaId)return'));
 assert(html.includes('if(state.consultaController)state.consultaController.abort()'));
 assert(html.includes('$("#chaveOut").innerHTML=""'));
 assert(html.includes('registrarPassagem(ch,nf)'));
});
test('Validação de chave ocorre antes de mostrar consulta em progresso',()=>{
 const inicio=html.indexOf('function renderChave(info,btn=null){');
 const fim=html.indexOf('async function buscarXml(ch,btn){',inicio);
 const trecho=html.slice(inicio,fim);
 assert(trecho.indexOf('if(!c.dv)')<trecho.indexOf('Aguardando o XML do serviço externo'));
 assert(trecho.includes('Nenhuma nota analisada nesta consulta.'));
});
console.log(`${passed} cenários passaram; sintaxe e renderização verificadas.`);
module.exports={fixture,ctx};
