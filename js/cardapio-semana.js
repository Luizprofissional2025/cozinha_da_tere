/**
 * ALMOÇO DA SEMANA
 * --------------------
 * Controla o cardápio de segunda a sábado que aparece no topo da loja:
 *  - renderAlmoco: desenha os 6 cards de dia da semana na loja
 *  - preencherCardapioAdmin / salvarCardapioSemana / limparCardapioSemana:
 *    o formulário que a responsável usa para editar o cardápio
 *  - comprimirFoto / onFotoCardapio / removerFotoCardapio: tratam a foto
 *    que ela envia para um prato (redimensiona para não pesar no site)
 */

let cardapioSemana=null;

function diaNormalizado(v){
  if(!v) return {nome:"",preco:null,foto:null};
  if(typeof v==="string") return {nome:v.trim(),preco:null,foto:null}; // dado antigo (formato anterior): mostra só o nome, sem preço
  return {nome:(v.nome||"").trim(), preco:(typeof v.preco==="number"&&v.preco>0)?v.preco:null, foto:v.foto||null};
}

function renderAlmoco(){
  const sec=document.getElementById("almoco"); if(!sec) return;
  const dias=(cardapioSemana&&cardapioSemana.dias)||{};
  const tem=DIAS_SEMANA.some(([k])=>diaNormalizado(dias[k]).nome);
  sec.classList.toggle("hidden",!tem);
  if(!tem) return;
  const hoje=new Date().getDay()-1; // 0=segunda ... 5=sábado
  const cont=document.getElementById("almoco-dias"); cont.innerHTML="";
  DIAS_SEMANA.forEach(([k,nomeDia],i)=>{
    const d=diaNormalizado(dias[k]);
    const wrap=document.createElement("div"); wrap.className="almoco-dia"+(i===hoje?" hoje":"")+(d.nome?"":" vazio");
    const cabeca=document.createElement("div"); cabeca.className="almoco-nome";
    cabeca.innerHTML=`<span>${nomeDia}</span>`+(i===hoje?'<em>Hoje</em>':"");
    wrap.appendChild(cabeca);
    if(!d.nome){
      const p=document.createElement("strong"); p.className="almoco-texto"; p.textContent="A definir"; wrap.appendChild(p);
    } else if(d.preco){
      if(d.foto) IMAGENS[d.nome]=d.foto;
      wrap.appendChild(criarCard("Almoço",d.nome,d.preco,"🍽️",false));
    } else {
      const p=document.createElement("strong"); p.className="almoco-texto"; p.textContent=d.nome; wrap.appendChild(p);
      const av=document.createElement("p"); av.className="small almoco-texto"; av.textContent="Preço a definir"; wrap.appendChild(av);
    }
    cont.appendChild(wrap);
  });
}

async function carregarCardapio(){
  try{ cardapioSemana=await Store.lerCardapio(); }catch(e){ console.error(e); }
  renderAlmoco();
}

let fotosCardapioTmp={};

function preencherCardapioAdmin(){
  const dias=(cardapioSemana&&cardapioSemana.dias)||{};
  fotosCardapioTmp={};
  document.getElementById("cardapio-form").innerHTML=DIAS_SEMANA.map(([k,nome])=>{
    const d=diaNormalizado(dias[k]); fotosCardapioTmp[k]=d.foto; fotosCardapioTmp[k+"_manual"]=!!d.foto;
    return `<div class="cardapio-linha">
      <span>${nome}</span>
      <input id="cd-${k}" maxlength="80" placeholder="Nome do prato" value="${esc(d.nome)}" oninput="aoDigitarPratoAdmin('${k}')">
      <input id="cp-${k}" maxlength="12" inputmode="decimal" placeholder="Preço (ex: 18,00)" value="${d.preco?String(d.preco).replace(".",","):""}">
      <div class="cardapio-foto">
        <img id="cf-${k}-prev" class="${d.foto?"":"hidden"}" src="${d.foto||""}" alt="">
        <label class="cardapio-upload">📷 Foto<input type="file" accept="image/*" onchange="onFotoCardapio('${k}',this)"></label>
        <button type="button" class="btn-x" onclick="removerFotoCardapio('${k}')">Remover</button>
      </div>
      <p id="st-${k}" class="small cardapio-status"></p>
    </div>`;
  }).join("");
}

function comprimirFoto(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      const max=340; let w=img.width,h2=img.height;
      if(w>h2){ if(w>max){ h2=Math.round(h2*max/w); w=max; } } else { if(h2>max){ w=Math.round(w*max/h2); h2=max; } }
      const c=document.createElement("canvas"); c.width=w; c.height=h2;
      c.getContext("2d").drawImage(img,0,0,w,h2);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg",0.72));
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error("Não consegui abrir essa imagem.")); };
    img.src=url;
  });
}

async function onFotoCardapio(k,input){
  const file=input.files&&input.files[0]; if(!file) return;
  const msg=document.getElementById("cardapio-msg"); msg.textContent="Processando foto…";
  try{
    const dataUrl=await comprimirFoto(file);
    fotosCardapioTmp[k]=dataUrl; fotosCardapioTmp[k+"_manual"]=true;
    const st=document.getElementById("st-"+k); if(st) st.textContent="";
    const prev=document.getElementById("cf-"+k+"-prev"); prev.src=dataUrl; prev.classList.remove("hidden");
    msg.textContent="Foto pronta. Não esqueça de salvar o cardápio.";
  }catch(e){ console.error(e); msg.textContent="Não consegui usar essa imagem. Tente outra foto."; }
  input.value="";
}

function removerFotoCardapio(k){
  fotosCardapioTmp[k]=null; fotosCardapioTmp[k+"_manual"]=false;
  const st=document.getElementById("st-"+k); if(st) st.textContent="";
  const prev=document.getElementById("cf-"+k+"-prev"); prev.src=""; prev.classList.add("hidden");
}

async function salvarCardapioSemana(){
  const msg=document.getElementById("cardapio-msg"); const dias={};
  for(const [k] of DIAS_SEMANA){
    const nome=document.getElementById("cd-"+k).value.trim();
    const precoTxt=document.getElementById("cp-"+k).value.trim().replace(",",".");
    const preco=precoTxt?parseFloat(precoTxt):null;
    if(precoTxt && (isNaN(preco)||preco<=0)){ msg.textContent=`Preço inválido em ${DIAS_SEMANA.find(d=>d[0]===k)[1]}.`; return; }
    dias[k]={nome, preco: (nome&&preco)?preco:null, foto: nome?(fotosCardapioTmp[k]||null):null};
  }
  msg.textContent="Salvando…";
  try{
    const obj={dias,atualizado:Date.now()}; await Store.salvarCardapio(obj); cardapioSemana=obj; renderAlmoco();
    let novosNoBanco=0;
    for(const [k] of DIAS_SEMANA){
      const d=dias[k]; if(!d.nome||!d.foto) continue;
      bancoFotos[chaveBanco(d.nome)]={nome:d.nome, foto:d.foto}; novosNoBanco++;
    }
    if(novosNoBanco){ try{ await Store.salvarBanco(bancoFotos); }catch(e){ console.error(e); } }
    msg.textContent="✔ Cardápio salvo. Já aparece na loja."+(novosNoBanco?" As fotos entraram no banco para sugerir sozinhas da próxima vez.":"");
  }catch(e){
    console.error(e);
    msg.textContent = (e&&e.code==="invalid_argument") ? "As fotos ficaram grandes demais para salvar. Use fotos menores ou remova alguma." : "Não foi possível salvar agora. Tente de novo.";
  }
}

function limparCardapioSemana(){
  if(!confirm("Limpar todos os pratos da semana?")) return;
  DIAS_SEMANA.forEach(([k])=>{ document.getElementById("cd-"+k).value=""; document.getElementById("cp-"+k).value=""; removerFotoCardapio(k); });
  salvarCardapioSemana();
}
