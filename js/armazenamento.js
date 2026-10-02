/**
 * CAMADA DE ARMAZENAMENTO (Store)
 * -----------------------------------
 * Esse é o "cofre" onde os pedidos, o cardápio da semana, o banco de
 * fotos e o login/senha ficam guardados. Ele esconde do resto do código
 * ONDE os dados realmente estão guardados:
 *
 *   - Modo "nuvem": quando o site está aberto pelo link publicado no
 *     Claude, tudo é salvo ali (compartilhado entre todo mundo que abrir
 *     o link).
 *   - Modo "local": se o site for aberto de outro jeito (arquivo aberto
 *     direto no navegador), os dados ficam só naquele navegador.
 *
 * O resto do código (carrinho, administração, cardápio da semana) nunca
 * precisa saber qual modo está ativo — só chama Store.adicionar(),
 * Store.observar(), etc., e o Store decide onde salvar de verdade.
 */

const Store = (function(){
  const LS_P="tere_pedidos", LS_A="tere_admin";
  let modo="carregando", userCap=null, memP=[], memA=null;
  const ouvintesLocais=new Set();
  function lsGet(k){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):undefined; }catch(e){ return undefined; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
  function lerLocal(){ const v=lsGet(LS_P); return Array.isArray(v)?v:memP; }
  function gravarLocal(arr){ memP=arr; lsSet(LS_P,arr); ouvintesLocais.forEach(f=>f()); }
  function ordenar(a){ return a.slice().sort((x,y)=>(y.ts||0)-(x.ts||0)); }
  const pronto=(async()=>{
    try{ db = await window.claude?.use?.("db") ?? null; }catch(e){ db=null; }
    try{ downloadsCap = await window.claude?.use?.("downloads") ?? null; }catch(e){ downloadsCap=null; }
    try{ userCap = await window.claude?.use?.("user") ?? null; }catch(e){ userCap=null; }
    modo = db ? "nuvem" : "local";
    atualizarStatus(modo);
    return modo;
  })();
  return {
    pronto,
    modo:()=>modo,
    async adicionar(pedido){
      await pronto;
      if(modo==="nuvem"){ await db.collection("pedidos").add(pedido); return; }
      const id="p"+pedido.ts+"_"+Math.random().toString(36).slice(2,7);
      gravarLocal(lerLocal().concat([{...pedido,__id:id}]));
    },
    async observar(cb,onErr){
      await pronto;
      if(modo==="nuvem"){
        return db.collection("pedidos").orderBy("ts","desc").limit(500).onSnapshot(
          snap=>cb(snap.docs.map(d=>({...d.data(),__id:d.id}))),
          err=>{ if(onErr) onErr(err); });
      }
      const emitir=()=>cb(ordenar(lerLocal()));
      const aoMudar=e=>{ if(e.key===LS_P) emitir(); };
      ouvintesLocais.add(emitir); window.addEventListener("storage",aoMudar); emitir();
      return ()=>{ ouvintesLocais.delete(emitir); window.removeEventListener("storage",aoMudar); };
    },
    async lerBanco(){
      await pronto;
      if(modo==="nuvem"){ const s=await db.collection("cardapio").doc("banco").get(); return (s.exists&&s.data()&&s.data().itens)||{}; }
      return lsGet("tere_banco_fotos")||{};
    },
    async salvarBanco(mapa){
      await pronto;
      if(modo==="nuvem"){ await db.collection("cardapio").doc("banco").set({itens:mapa}); return; }
      if(!lsSet("tere_banco_fotos",mapa)) throw new Error("Este navegador bloqueou o armazenamento local.");
    },
    async lerCardapio(){
      await pronto;
      if(modo==="nuvem"){ const s=await db.collection("cardapio").doc("semana").get(); return s.exists?s.data():null; }
      return lsGet("tere_cardapio")||null;
    },
    async salvarCardapio(obj){
      await pronto;
      if(modo==="nuvem"){ await db.collection("cardapio").doc("semana").set(obj); return; }
      if(!lsSet("tere_cardapio",obj)) throw new Error("Este navegador bloqueou o armazenamento local.");
    },
    async remover(ids){
      await pronto;
      if(modo==="nuvem"){ await Promise.all(ids.map(id=>db.collection("pedidos").doc(id).delete())); return; }
      const set=new Set(ids); gravarLocal(lerLocal().filter(p=>!set.has(p.__id)));
    },
    async podeAdministrar(){
      await pronto;
      if(modo==="local") return true;
      try{ return userCap ? !!(await userCap.canEdit()) : false; }catch(e){ return false; }
    },
    async credenciais(){
      await pronto;
      if(modo==="nuvem"){
        const s=await db.collection("config").doc("admin").get();
        if(s.exists){ const d=s.data(); if(d&&d.hash) return {user:d.user||USER_PADRAO, hash:d.hash}; }
        return {user:USER_PADRAO, hash:HASH_PADRAO};
      }
      const a=lsGet(LS_A)||memA;
      return (a&&a.hash)?{user:a.user||USER_PADRAO, hash:a.hash}:{user:USER_PADRAO, hash:HASH_PADRAO};
    },
    async salvarCredenciais(user,hash){
      await pronto;
      if(modo==="nuvem"){ await db.collection("config").doc("admin").set({user,hash}); return; }
      memA={user,hash};
      if(!lsSet(LS_A,memA)) throw new Error("Este navegador bloqueou o armazenamento local.");
    }
  };
})();

function atualizarStatus(modo){
  const txt = modo==="nuvem" ? "🟢 Sincronizado em tempo real (nuvem)"
    : modo==="local" ? "🟠 Modo local: os pedidos ficam salvos só neste navegador"
    : "⏳ Conectando…";
  document.querySelectorAll(".status-sync").forEach(e=>e.textContent=txt);
}
