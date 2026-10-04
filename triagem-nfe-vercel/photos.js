/* Fotografias locais vinculadas à chave da NF-e. Sem upload nem geocodificador externo. */
(() => {
  "use strict";
  const DB_NAME="triagem.fotos", DB_VERSION=1, TZ="America/Boa_Vista";
  const notes=new Map(), panes=new Map();
  let dbPromise=null, active=null, busy=false, importing=null, cameraHistory=false, opener=null;
  const $=s=>document.querySelector(s);
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validKey=k=>/^\d{44}$/.test(k||"")&&!/^0+$/.test(k);
  const time=ts=>new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(ts));
  const keyOf=n=>n.chave||n.noteKey||"";
  function identity(n){return {noteKey:keyOf(n),nNF:String(n.ide?.nNF??n.nNF??""),serie:String(n.ide?.serie??n.serie??""),emit:String(n.emit?.nome??(typeof n.emit==="string"?n.emit:""))};}
  function message(text,error=false){const el=$("#photoMessage");el.textContent=text;el.classList.toggle("photo-error",error);}
  function globalMessage(text){const el=$("#aviso");if(el){el.textContent=text;el.classList.remove("hidden");}}
  function storageError(e){return e?.name==="QuotaExceededError"?"Sem espaço para salvar a foto. Baixe os registros existentes antes de excluir fotos ou liberar espaço.":"Não foi possível salvar a foto neste navegador. "+(e?.message||"Armazenamento local indisponível.");}

  function openDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!globalThis.indexedDB){reject(new Error("Armazenamento de fotos indisponível."));return;}
      let settled=false;
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      const fail=e=>{if(!settled){settled=true;reject(e);}};
      req.onupgradeneeded=()=>{const db=req.result;const photos=db.createObjectStore("photos",{keyPath:"id"});photos.createIndex("noteKey","noteKey",{unique:false});db.createObjectStore("notes",{keyPath:"noteKey"});};
      req.onerror=()=>fail(req.error||new Error("Não foi possível abrir as fotos salvas."));
      req.onblocked=()=>fail(new Error("Feche outras abas deste aplicativo e tente novamente."));
      req.onsuccess=()=>{if(settled){req.result.close();return;}settled=true;const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null;};resolve(db);};
    }).catch(e=>{dbPromise=null;throw e;});
    return dbPromise;
  }
  async function read(store,key,index){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,"readonly"),s=tx.objectStore(store),req=index?s.index(index).getAll(key):key===undefined?s.getAll():s.get(key);let value;req.onsuccess=()=>value=req.result;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||req.error||new Error("Falha na leitura das fotos."));});}
  async function save(record){
    const db=await openDB();
    await new Promise((resolve,reject)=>{const tx=db.transaction(["photos","notes"],"readwrite"),p=tx.objectStore("photos"),ns=tx.objectStore("notes");p.add(record);const r=ns.get(record.noteKey);r.onsuccess=()=>ns.put({...record.note,updatedAt:record.registeredAt,count:(r.result?.count||0)+1});tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error("Foto não salva."));});
    // Pedido de persistência sem bloquear nem prometer armazenamento permanente.
    try{navigator.storage?.persist?.()?.catch(()=>{});}catch(e){}
  }
  async function remove(id){const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(["photos","notes"],"readwrite"),p=tx.objectStore("photos"),ns=tx.objectStore("notes"),r=p.get(id);r.onsuccess=()=>{if(!r.result)return;const k=r.result.noteKey;p.delete(id);const n=ns.get(k);n.onsuccess=()=>{if((n.result?.count||0)<=1)ns.delete(k);else ns.put({...n.result,count:n.result.count-1});};};tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error("Falha ao excluir a foto."));});}

  function markup(n,expand=false){
    const meta=identity(n),key=meta.noteKey;
    if(!validKey(key))return '<div class="photo-box"><b>Fotos da fiscalização</b><p class="hint">É necessária a chave de acesso da NF-e para vincular fotos.</p></div>';
    notes.set(key,meta);
    return `<section class="photo-box" data-photos-note="${escape(key)}"><h3>Fotos da fiscalização <span class="photo-count"></span></h3><div class="photo-actions"><button class="btn primary small" type="button" data-photo-action="camera" data-note-key="${key}">Tirar foto com data e GPS</button><button class="btn small" type="button" data-photo-action="attach" data-note-key="${key}">Anexar foto</button></div><p class="hint">Vinculadas à chave desta NF-e. Salvas somente neste navegador/aparelho; baixe os registros para guardar uma cópia.</p><details class="photo-gallery-details"${expand?" open":""}><summary>Ver fotos desta NF-e</summary><div class="photo-gallery" aria-live="polite"><p class="hint">Carregando fotos…</p></div></details></section>`;
  }
  function geoText(g){
    if(!g||!["ok","stale"].includes(g.status))return "GPS não registrado: "+(g?.reason||"localização indisponível");
    return `GPS${g.status==="stale"?" desatualizado":""}: ${g.latitude.toFixed(6)}, ${g.longitude.toFixed(6)} · precisão informada ±${Math.round(g.accuracy)} m`;
  }
  function photoCard(r){const url=URL.createObjectURL(r.stampedBlob);return {url,html:`<figure class="photo-card"><a href="${url}" target="_blank" rel="noopener" aria-label="Ampliar foto da NF-e ${escape(r.note.nNF)}"><img src="${url}" loading="lazy" alt="Foto vinculada à NF-e ${escape(r.note.nNF)}, registrada em ${escape(time(r.registeredAt))}"></a><figcaption><b>Registro: ${escape(time(r.registeredAt))} (RR)</b><div>${r.kind==="camera"?"Câmera ao vivo":"Arquivo anexado; data original não atestada"}</div><div>${escape(geoText(r.geo))}</div>${r.geo?.measuredAt?`<div>GPS medido em ${escape(time(r.geo.measuredAt))}</div>`:""}<div>Localidade informada: ${escape(r.locality||"não informada")}</div><div class="photo-actions"><button class="btn small" type="button" data-photo-action="download" data-photo-id="${escape(r.id)}">Baixar registro (.zip)</button><button class="btn small" type="button" data-photo-action="delete" data-photo-id="${escape(r.id)}">Excluir foto</button></div></figcaption></figure>`};}
  function revoke(pane){const old=panes.get(pane);if(old)old.urls.forEach(u=>URL.revokeObjectURL(u));panes.delete(pane);}
  async function mount(root=document){
    for(const pane of panes.keys())if(!pane.isConnected)revoke(pane);
    const containers=Array.from(root.querySelectorAll("[data-photos-note]"));
    await Promise.all(containers.map(async pane=>{
      revoke(pane);const token={urls:[]};panes.set(pane,token);
      try{const records=(await read("photos",pane.dataset.photosNote,"noteKey")).sort((a,b)=>b.registeredAt-a.registeredAt);if(!pane.isConnected||panes.get(pane)!==token)return;const cards=records.map(photoCard);token.urls=cards.map(c=>c.url);pane.querySelector(".photo-count").textContent=`(${records.length})`;pane.querySelector(".photo-gallery").innerHTML=cards.map(c=>c.html).join("")||'<p class="hint">Nenhuma foto vinculada a esta NF-e.</p>';}
      catch(e){if(pane.isConnected&&panes.get(pane)===token)pane.querySelector(".photo-gallery").textContent="Não consegui abrir as fotos locais: "+e.message;}
    }));
    await updateCounts(root);
  }
  async function updateCounts(root=document){try{const list=await read("notes"),counts=new Map(list.map(n=>[n.noteKey,n.count]));for(const el of root.querySelectorAll("[data-photo-count-key]")){const c=counts.get(el.dataset.photoCountKey)||0;el.textContent=c?`${c} foto${c===1?"":"s"} vinculada${c===1?"":"s"}`:"";}}catch(e){/* O histórico de consultas permanece utilizável sem IndexedDB. */}}
  async function refresh(){await mount(document);if($("#savedPhotosDialog").open)await savedNotes();}

  function locate(){return new Promise(resolve=>{
    if(!navigator.geolocation){resolve({status:"unavailable",reason:"GPS não disponível neste navegador"});return;}
    let settled=false;
    const done=g=>{if(settled)return;settled=true;clearTimeout(timer);resolve(g);};
    const timer=setTimeout(()=>done({status:"unavailable",reason:"tempo de obtenção do GPS esgotado"}),13000);
    try{navigator.geolocation.getCurrentPosition(p=>{const c=p.coords;if(!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0){done({status:"unavailable",reason:"coordenadas inválidas"});return;}done({status:"ok",latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,measuredAt:Number.isFinite(p.timestamp)?p.timestamp:Date.now()});},e=>done({status:e.code===1?"denied":"unavailable",reason:e.code===1?"permissão de localização negada":e.code===3?"tempo de obtenção do GPS esgotado":"posição indisponível"}),{enableHighAccuracy:true,maximumAge:0,timeout:12000});}catch(e){done({status:"unavailable",reason:"não foi possível obter o GPS"});}
  });}
  function geoAtRegistration(g,ts){const copy={...g};if(copy.status==="ok"&&(ts-copy.measuredAt>60000||copy.measuredAt-ts>10000))copy.status="stale";return copy;}
  async function updateGPS(session){const request=Symbol();session.gpsRequest=request;session.geo={status:"pending",reason:"localização ainda não obtida"};$("#photoGPS").textContent="Obtendo GPS… Aguarde para registrar coordenadas.";const g=await locate();if(active!==session||session.gpsRequest!==request)return;session.geo=geoAtRegistration(g,Date.now());$("#photoGPS").textContent=geoText(session.geo)+(g.measuredAt?" · medido em "+time(g.measuredAt):"")+". A foto pode ser salva mesmo sem GPS.";}
  function stopCamera(session){session?.stream?.getTracks().forEach(t=>t.stop());if(session)session.stream=null;$("#photoVideo").srcObject=null;}
  function closeCamera(fromPop=false){
    const previous=active;active=null;stopCamera(previous);const modal=$("#photoDialog");if(modal.open)modal.close();
    if(cameraHistory&&!fromPop){cameraHistory=false;history.back();}else cameraHistory=false;
    opener?.isConnected&&opener.focus({preventScroll:true});
  }
  async function startCamera(key,button){
    const meta=notes.get(key);if(!meta||busy)return;
    if(active)closeCamera();
    if(typeof stopScan==="function")await stopScan();
    const session={note:{...meta},geo:{status:"pending",reason:"localização ainda não obtida"},stream:null};active=session;opener=button;
    $("#photoNote").textContent=`NF-e nº ${meta.nNF||"—"} · série ${meta.serie||"—"} · ${meta.emit}`;
    $("#photoKey").textContent=key;$("#photoLocality").value=($("#posto")?.value||"").trim();
    $("#photoCapture").disabled=true;message("Abrindo câmera…");$("#photoDialog").showModal();
    try{history.pushState({triagemPhoto:true},"",location.href);cameraHistory=true;}catch(e){cameraHistory=false;}
    updateGPS(session);
    try{
      await openDB();if(active!==session)return;
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("Câmera ao vivo indisponível; use “Anexar foto” nesta janela.");
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}}});
      if(active!==session){stream.getTracks().forEach(t=>t.stop());return;}
      session.stream=stream;const video=$("#photoVideo");video.srcObject=stream;await video.play();
      if(active!==session){stream.getTracks().forEach(t=>t.stop());return;}
      $("#photoCapture").disabled=false;message("Confirme a localidade. Data/hora do aparelho em horário de Roraima.");
    }catch(e){if(active===session){stopCamera(session);message(e.name==="NotAllowedError"?"Câmera bloqueada. Libere a permissão no navegador ou use “Anexar foto”.":e.message||"Não foi possível abrir a câmera.",true);}}
  }
  function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Não foi possível gerar a imagem.")),"image/jpeg",.9));}
  function photoCanvas(image,w,h){if(!w||!h)throw new Error("A imagem da câmera ainda não está pronta.");const ratio=Math.min(1,1920/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);c.getContext("2d").drawImage(image,0,0,c.width,c.height);return c;}
  function wrap(ctx,text,width){const result=[];let row="";for(const char of String(text)){if(char==="\n"){result.push(row);row="";continue;}if(row&&ctx.measureText(row+char).width>width){result.push(row);row=char;}else row+=char;}result.push(row);return result;}
  async function stamp(base,record){
    const width=Math.max(640,base.width),height=Math.round(base.height*width/base.width),font=Math.round(width/48),pad=Math.round(width/40),lineHeight=Math.ceil(font*1.4),c=document.createElement("canvas"),ctx=c.getContext("2d");
    ctx.font=`${font}px sans-serif`;
    const texts=[`NF-e nº ${record.note.nNF||"—"} · série ${record.note.serie||"—"}`,`Chave: ${record.noteKey}`,`Registro: ${time(record.registeredAt)} · Roraima (UTC−04:00)`,`Origem: ${record.kind==="camera"?"câmera ao vivo":"arquivo anexado (data original não atestada)"}`,geoText(record.geo),...(record.geo.measuredAt?[`GPS medido em ${time(record.geo.measuredAt)}`]:[]),`Localidade informada: ${record.locality||"não informada"}`];
    const lines=texts.flatMap(t=>wrap(ctx,t,width-pad*2));c.width=width;c.height=height+lines.length*lineHeight+pad*2;ctx.drawImage(base,0,0,width,height);ctx.fillStyle="#132820";ctx.fillRect(0,height,width,c.height-height);ctx.fillStyle="#fff";ctx.font=`${font}px sans-serif`;ctx.textBaseline="top";lines.forEach((line,i)=>ctx.fillText(line,pad,height+pad+i*lineHeight));return canvasBlob(c);
  }
  async function makeRecord(note,base,original,kind,geo,registeredAt,locality){const record={id:crypto.randomUUID?crypto.randomUUID():String(registeredAt)+"-"+Math.random().toString(36).slice(2),noteKey:note.noteKey,note:{...note},kind,registeredAt,timeZone:TZ,clockSource:"aparelho",geo:geoAtRegistration(geo,registeredAt),locality:locality.trim().slice(0,120),localitySource:"informada",originalBlob:original};record.stampedBlob=await stamp(base,record);return record;}
  async function capture(){
    const session=active,video=$("#photoVideo");if(!session||!session.stream||busy)return;
    busy=true;$("#photoCapture").disabled=true;message("Salvando foto…");
    const registeredAt=Date.now(),geo={...session.geo},locality=$("#photoLocality").value;
    try{const base=photoCanvas(video,video.videoWidth,video.videoHeight),original=await canvasBlob(base),r=await makeRecord(session.note,base,original,"camera",geo,registeredAt,locality);await save(r);await refresh();if(active===session)message("Foto salva e vinculada à NF-e nº "+session.note.nNF+". Você pode tirar outra foto.");else globalMessage("Foto salva na NF-e nº "+session.note.nNF+".");}
    catch(e){if(active===session)message(storageError(e),true);else globalMessage(storageError(e));}
    finally{busy=false;if(active===session&&session.stream)$("#photoCapture").disabled=false;}
  }
  async function loadImage(file){if(file.size>25*1024*1024)throw new Error("Imagem maior que 25 MB. Escolha um arquivo menor.");if(!/^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(file.type))throw new Error("Use uma imagem JPEG, PNG, WebP, HEIC ou AVIF compatível com seu navegador.");const img=new Image(),url=URL.createObjectURL(file);try{img.src=url;await img.decode();return photoCanvas(img,img.naturalWidth,img.naturalHeight);}finally{URL.revokeObjectURL(url);}}
  async function chooseFile(key){
    if(busy)return;const note=notes.get(key);if(!note)return;
    if(active&&active.note.noteKey===key){importing={note:{...note},locality:$("#photoLocality").value};}
    else importing={note:{...note},locality:($("#posto")?.value||"").trim()};
    $("#photoFile").value="";$("#photoFile").click();
  }
  async function fileSelected(e){
    const pending=importing,file=e.target.files?.[0];importing=null;e.target.value="";if(!pending||!file||busy)return;
    busy=true;$("#photoCapture").disabled=true;const registeredAt=Date.now();
    if(active?.note.noteKey===pending.note.noteKey)message("Registrando imagem e obtendo GPS…");else globalMessage("Registrando imagem e obtendo GPS para a NF-e nº "+pending.note.nNF+"…");
    try{const base=await loadImage(file),geo=await locate(),r=await makeRecord(pending.note,base,file,"attachment",geo,registeredAt,pending.locality);await save(r);await refresh();if(active?.note.noteKey===pending.note.noteKey)message("Imagem anexada à NF-e nº "+pending.note.nNF+". A data gravada é a do registro; a data original não foi atestada.");else globalMessage("Foto anexada à NF-e nº "+pending.note.nNF+". A data gravada é a do registro no aplicativo.");}
    catch(e){if(active)message(storageError(e),true);else globalMessage(storageError(e));}
    finally{busy=false;if(active?.stream)$("#photoCapture").disabled=false;}
  }

  // ZIP sem compressão: original, cópia com marcação e metadados no mesmo download.
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function header(size,values){const a=new Uint8Array(size),v=new DataView(a.buffer);for(const [at,num,bytes] of values)bytes===4?v.setUint32(at,num,true):v.setUint16(at,num,true);return a;}
  async function zip(files,ts){const dt=new Date(ts-4*3600000),dosTime=(dt.getUTCHours()<<11)|(dt.getUTCMinutes()<<5)|(dt.getUTCSeconds()>>1),dosDate=((dt.getUTCFullYear()-1980)<<9)|((dt.getUTCMonth()+1)<<5)|dt.getUTCDate();let offset=0,centralSize=0;const chunks=[],central=[],encode=new TextEncoder();for(const file of files){const name=encode.encode(file.name),bytes=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(bytes),local=header(30,[[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[10,dosTime,2],[12,dosDate,2],[14,crc,4],[18,bytes.length,4],[22,bytes.length,4],[26,name.length,2]]),directory=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[12,dosTime,2],[14,dosDate,2],[16,crc,4],[20,bytes.length,4],[24,bytes.length,4],[28,name.length,2],[42,offset,4]]);chunks.push(local,name,bytes);central.push(directory,name);offset+=local.length+name.length+bytes.length;centralSize+=directory.length+name.length;}return new Blob([...chunks,...central,header(22,[[0,0x06054b50,4],[8,files.length,2],[10,files.length,2],[12,centralSize,4],[16,offset,4]])],{type:"application/zip"});}
  function metadata(r){const {originalBlob,stampedBlob,...rest}=r;return {...rest,registeredAtISO:new Date(r.registeredAt).toISOString(),registeredAtRoraima:time(r.registeredAt),original:{type:originalBlob.type,size:originalBlob.size},stamped:{type:stampedBlob.type,size:stampedBlob.size},notice:"Data/hora e GPS fornecidos pelo aparelho. Localidade informada pelo usuário. Arquivo anexado não atesta data original."};}
  function extension(type){return {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif","image/avif":"avif"}[type]||"bin";}
  async function download(id,button){button.disabled=true;try{const r=await read("photos",id);if(!r)throw new Error("Foto não encontrada.");const blob=await zip([{name:"foto-original."+extension(r.originalBlob.type),blob:r.originalBlob},{name:"foto-com-registro.jpg",blob:r.stampedBlob},{name:"metadados.json",blob:new Blob([JSON.stringify(metadata(r),null,2)],{type:"application/json"})}],r.registeredAt),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`NF-e-${r.note.nNF||"sem-numero"}-${r.noteKey.slice(-8)}-${r.registeredAt}.zip`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){globalMessage("Não consegui baixar o registro: "+e.message);}finally{button.disabled=false;}}
  async function savedNotes(){
    const body=$("#savedPhotosBody");body.textContent="Carregando notas com fotos…";
    try{const records=(await read("notes")).filter(n=>n.count>0).sort((a,b)=>b.updatedAt-a.updatedAt);body.innerHTML=records.map(n=>`<article class="photo-saved-note"><h3>NF-e nº ${escape(n.nNF||"—")} · série ${escape(n.serie||"—")}</h3><p>${escape(n.emit)}</p><p class="digits">Chave: ${escape(n.noteKey)}</p>${markup(n,true)}</article>`).join("")||'<p class="hint">Nenhuma foto salva neste aparelho.</p>';await mount(body);}catch(e){body.textContent="Não consegui abrir as fotos: "+e.message;}
  }
  function showSavedNotes(){const dialog=$("#savedPhotosDialog");if(!dialog.open)dialog.showModal();savedNotes();}

  const style=document.createElement("style");style.textContent=`
    .photo-box{margin:14px 0;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow-wrap:anywhere}.photo-box h3{margin:0 0 10px;font-size:1rem}.photo-count{font-weight:400;color:var(--muted)}.photo-actions{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.photo-actions .btn{flex:1 1 160px}.photo-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px}.photo-card{margin:0;padding:8px;border:1px solid var(--line);border-radius:10px;min-width:0}.photo-card img{display:block;width:100%;height:180px;object-fit:contain;background:#132820;border-radius:6px}.photo-card figcaption{font-size:.85rem;line-height:1.45;overflow-wrap:anywhere;margin-top:8px}.photo-dialog{width:min(94vw,640px);max-height:92dvh;margin:auto;border:1px solid var(--line);border-radius:14px;padding:16px;color:var(--ink);background:var(--surface);overflow:auto;overflow-wrap:anywhere}.photo-dialog::backdrop{background:#000a}.photo-dialog h2{font-size:1.2rem;margin:0}.photo-dialog-head{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:8px}.photo-dialog-head .btn{width:auto}.photo-video{width:100%;max-height:45dvh;object-fit:contain;background:#132820;border-radius:10px;margin:10px 0}.photo-dialog .digits{font-size:.8rem;overflow-wrap:anywhere}.photo-dialog label{display:block;font-size:.9rem;margin:8px 0}.photo-dialog input{display:block;width:100%;margin-top:5px;min-height:44px;padding:10px;border:1px solid var(--line);border-radius:8px;color:var(--ink);background:var(--bg)}.photo-message{font-size:.9rem;margin-top:8px;min-height:1.4em;overflow-wrap:anywhere}.photo-error{color:var(--red)}.photo-saved-note{margin-top:18px;border-top:1px solid var(--line);padding-top:12px}.photo-history-count{font-size:.85rem;color:var(--sign);font-weight:600}.photo-dialog .hint{line-height:1.45}
  `;document.head.append(style);
  const wrapper=document.createElement("div");wrapper.innerHTML=`<dialog class="photo-dialog" id="photoDialog" aria-labelledby="photoTitle"><div class="photo-dialog-head"><h2 id="photoTitle">Foto vinculada à NF-e</h2><button class="btn small" type="button" id="photoClose" aria-label="Fechar câmera">Fechar</button></div><p id="photoNote"></p><p class="digits" id="photoKey"></p><video class="photo-video" id="photoVideo" playsinline autoplay muted></video><label for="photoLocality">Localidade — confirme ou edite (informada)<input id="photoLocality" maxlength="120" placeholder="Ex.: Posto Fiscal Pacaraima / BR-174, km…"></label><div class="hint" id="photoGPS" role="status"></div><div class="photo-actions"><button class="btn small" type="button" id="photoUpdateGPS">Atualizar GPS</button><button class="btn small" type="button" id="photoAttach">Anexar foto</button></div><button class="btn primary wide" type="button" id="photoCapture" disabled>Fotografar e salvar na NF-e</button><div class="photo-message" id="photoMessage" role="status"></div><p class="hint">Data/hora do aparelho, em horário de Roraima. GPS depende da permissão e precisão do aparelho. Localidade informada, sem validação automática pelo GPS.</p></dialog><dialog class="photo-dialog" id="savedPhotosDialog" aria-labelledby="savedPhotosTitle"><div class="photo-dialog-head"><h2 id="savedPhotosTitle">Notas com fotos neste aparelho</h2><button class="btn small" type="button" id="savedPhotosClose">Fechar</button></div><p class="hint">Fotos disponíveis mesmo sem recuperar o XML ou após limpar o histórico de consultas. Limpar os dados do site apaga estas fotos; baixe uma cópia.</p><div id="savedPhotosBody"></div></dialog><input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" capture="environment" hidden>`;document.body.append(wrapper);
  $("#photoClose").onclick=()=>closeCamera();$("#photoDialog").addEventListener("cancel",e=>{e.preventDefault();closeCamera();});
  $("#photoCapture").onclick=capture;$("#photoUpdateGPS").onclick=()=>active&&updateGPS(active);$("#photoAttach").onclick=()=>active&&chooseFile(active.note.noteKey);$("#photoFile").onchange=fileSelected;$("#photoFile").addEventListener("cancel",()=>{importing=null;});
  $("#savedPhotosClose").onclick=()=>$("#savedPhotosDialog").close();
  window.addEventListener("popstate",()=>{if(cameraHistory)closeCamera(true);if($("#savedPhotosDialog").open)$("#savedPhotosDialog").close();});
  window.addEventListener("pagehide",()=>closeCamera(true));
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&active)closeCamera();});
  document.addEventListener("click",async e=>{
    const b=e.target.closest("[data-photo-action]");if(!b)return;e.preventDefault();
    try{switch(b.dataset.photoAction){case "camera":if($("#savedPhotosDialog").open)$("#savedPhotosDialog").close();await startCamera(b.dataset.noteKey,b);break;case "attach":await chooseFile(b.dataset.noteKey);break;case "download":await download(b.dataset.photoId,b);break;case "delete":if(confirm("Excluir esta foto e seu registro deste aparelho? Baixe uma cópia antes, se precisar guardá-la.")){await remove(b.dataset.photoId);await refresh();}break;}}
    catch(err){globalMessage(err.message||"Não consegui concluir a ação com a foto.");}
  });
  const button=document.createElement("button");button.className="btn small";button.type="button";button.id="bFotosSalvas";button.textContent="Notas com fotos";button.onclick=showSavedNotes;$(".hist-head")?.append(button);
  globalThis.PhotoEvidence={markup,mount,updateCounts,showSavedNotes};
  mount(document);
})();
