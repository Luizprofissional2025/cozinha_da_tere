/**
 * LOGIN DA ADMINISTRAÇÃO
 * --------------------------
 * Controla quem pode entrar na aba Administração: confere login e senha,
 * bloqueia por 30s após 5 tentativas erradas, e permite trocar a senha.
 *
 * A senha nunca é guardada "em texto puro": ela passa pela função sha(),
 * que a transforma num código de 64 caracteres (hash). Assim, mesmo quem
 * tiver acesso ao código do site não consegue ler a senha verdadeira.
 */

const SAL="tere-cozinha", USER_PADRAO="tere", HASH_PADRAO="4ba25da0056981912500d6d7082ea8d8f60d7c2bad391da6475fc24cbd64ced9";

let cancelaObs=null, adminLogado=false, falhas=0, bloqueioAte=0, cliques=0, tCliques=null;

async function sha(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}

function cliqueMarca(){
  cliques++; clearTimeout(tCliques); tCliques=setTimeout(()=>cliques=0,3000);
  if(cliques>=5){ cliques=0; mostrarAba("admin"); }
}

async function entrarAdmin(){
  const erro=document.getElementById("adm-erro"), btn=document.getElementById("adm-entrar");
  if(Date.now()<bloqueioAte){ erro.textContent="Muitas tentativas. Aguarde alguns segundos."; return; }
  erro.textContent="Verificando…"; btn.disabled=true;
  try{
    await Store.pronto;
    if(!(await Store.podeAdministrar())){
      erro.textContent="Este acesso é só para o responsável (perfil Editor neste link). Peça ao dono do link para liberar."; return;
    }
    const u=document.getElementById("adm-user").value.trim().toLowerCase();
    const p=document.getElementById("adm-pass").value;
    let cred;
    try{ cred=await Store.credenciais(); }catch(e){ console.error(e); erro.textContent="Não consegui verificar o acesso agora. Tente de novo em instantes."; return; }
    const h=await sha(SAL+":"+u+":"+p);
    if(u===String(cred.user).toLowerCase() && h===cred.hash){
      adminLogado=true; falhas=0; erro.textContent="";
      document.getElementById("adm-pass").value="";
      document.getElementById("admin-login").classList.add("hidden");
      document.getElementById("admin-painel").classList.remove("hidden");
      cancelaObs = await Store.observar(lista=>{ todosPedidos=lista; renderTabelaAdmin(); },
        err=>{ console.error(err); document.getElementById("tabela-pedidos").innerHTML='<tr><td colspan="8" class="small">Não foi possível carregar os pedidos agora.</td></tr>'; });
      renderTabelaAdmin(); await Promise.all([carregarCardapio(),carregarBanco()]); preencherCardapioAdmin();
    } else {
      falhas++; erro.textContent="Login ou senha incorretos.";
      if(falhas>=5){ bloqueioAte=Date.now()+30000; falhas=0; erro.textContent="Muitas tentativas. Aguarde 30 segundos."; }
    }
  } finally { btn.disabled=false; }
}

function sairAdmin(){
  adminLogado=false;
  if(typeof cancelaObs==="function"){ cancelaObs(); } cancelaObs=null; todosPedidos=[];
  document.getElementById("tabela-pedidos").innerHTML="";
  document.getElementById("stats-grid").innerHTML="";
  document.getElementById("admin-painel").classList.add("hidden");
  document.getElementById("admin-login").classList.remove("hidden");
  mostrarAba("loja");
}

async function salvarNovaSenha(){
  const msg=document.getElementById("nv-msg");
  const u=document.getElementById("nv-user").value.trim().toLowerCase();
  const p=document.getElementById("nv-pass").value;
  if(!adminLogado) return;
  if(u.length<3||p.length<6){ msg.textContent="Login (mín. 3 caracteres) e senha (mín. 6) são obrigatórios."; return; }
  msg.textContent="Salvando…";
  try{
    await Store.salvarCredenciais(u, await sha(SAL+":"+u+":"+p));
    document.getElementById("nv-user").value=""; document.getElementById("nv-pass").value="";
    msg.textContent="✔ Acesso atualizado. Use o novo login na próxima entrada.";
  }catch(e){
    console.error(e);
    msg.textContent = (e&&e.code==="invalid_argument") ? "Sem permissão para alterar (só o Editor do link)." : "Não foi possível salvar agora. "+(e&&e.message&&!e.code?e.message:"Tente de novo.");
  }
}
