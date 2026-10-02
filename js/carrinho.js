/**
 * CADASTRO, CARRINHO E FINALIZAÇÃO DO PEDIDO
 * -----------------------------------------------
 * Tudo relacionado ao que o funcionário faz na loja:
 *  - confirmarCadastro / trocarUsuario / preencherCadastro: nome, contato
 *    e equipe de quem está pegando o pedido (e lembrar isso da próxima vez)
 *  - adicionarCarrinho / alterarQtd / totalCarrinho / qtdCarrinho: o carrinho
 *  - mostrarCarrinho / fecharModalCarrinho / renderModalCarrinho: a telinha
 *    que lista os itens escolhidos
 *  - finalizarPedido: envia o pedido pronto para o Store (ou seja, para a
 *    aba Administração)
 */

let usuario = null, carrinho = {}, db = null, downloadsCap = null;
/*__IMAGENS_MARCADOR__*/

function confirmarCadastro(){
  const nome = document.getElementById("c-nome").value.trim();
  const numero = document.getElementById("c-numero").value.trim();
  const equipe = document.getElementById("c-equipe").value.trim();
  if(!nome || !numero || !equipe){ alert("Preencha nome, contato e equipe."); return; }
  usuario = {nome, numero, equipe};
  try{ localStorage.setItem("tere_cadastro", JSON.stringify(usuario)); }catch(e){}
  document.getElementById("resumo-usuario").textContent = `${nome} · ${equipe} · ${numero}`;
  document.getElementById("bloco-cadastro").classList.add("hidden");
  document.getElementById("bloco-loja").classList.remove("hidden");
  document.getElementById("banner-titulo").textContent = saudacao()+", "+nome.split(" ")[0]+"!";
  montarProdutos(); carregarCardapio();
}

function trocarUsuario(){
  usuario = null; carrinho = {}; atualizarCarrinhoFlutuante();
  document.getElementById("banner-titulo").textContent = "O que vai ser hoje?";
  document.getElementById("bloco-loja").classList.add("hidden");
  document.getElementById("bloco-cadastro").classList.remove("hidden");
}

function adicionarCarrinho(nome, preco){
  if(!carrinho[nome]) carrinho[nome] = {nome, preco, qtd:0};
  carrinho[nome].qtd++;
  atualizarCarrinhoFlutuante();
  atualizarCardProduto(nome);
}

function alterarQtd(nome, delta){
  if(!carrinho[nome]) return;
  carrinho[nome].qtd += delta;
  if(carrinho[nome].qtd <= 0) delete carrinho[nome];
  atualizarCarrinhoFlutuante();
  atualizarCardProduto(nome);
  renderModalCarrinho();
}

function totalCarrinho(){
  return Object.values(carrinho).reduce((s,i)=>s+i.preco*i.qtd,0);
}

function qtdCarrinho(){
  return Object.values(carrinho).reduce((s,i)=>s+i.qtd,0);
}

function atualizarCarrinhoFlutuante(){
  const q = qtdCarrinho();
  document.getElementById("carrinho-flutuante").classList.toggle("hidden", q===0);
  document.getElementById("carrinho-qtd").textContent = q;
  document.getElementById("carrinho-rot").textContent = q===1 ? "item" : "itens";
  document.getElementById("carrinho-total").textContent = fmt(totalCarrinho());
}

function mostrarCarrinho(){ renderModalCarrinho(); document.getElementById("modal-carrinho").classList.remove("hidden"); }

function fecharModalCarrinho(){ document.getElementById("modal-carrinho").classList.add("hidden"); }

function renderModalCarrinho(){
  const el = document.getElementById("lista-carrinho");
  el.innerHTML = "";
  Object.values(carrinho).forEach(i=>{
    const d = document.createElement("div"); d.className = "linha-item";
    d.innerHTML = `<span>${i.nome}<br><span class="small">${fmt(i.preco)} cada</span></span>
      <span class="qtd-controle">
        <button onclick="alterarQtd('${i.nome.replace(/'/g,"\\'")}',-1)">−</button>
        <strong>${i.qtd}</strong>
        <button onclick="alterarQtd('${i.nome.replace(/'/g,"\\'")}',1)">+</button>
      </span>
      <strong>${fmt(i.preco*i.qtd)}</strong>`;
    el.appendChild(d);
  });
  document.getElementById("modal-total").textContent = fmt(totalCarrinho());
}


/* ===== Camada de armazenamento: nuvem (link publicado) ou local (este navegador) ===== */

async function finalizarPedido(){
  if(!usuario){ alert("Complete o cadastro primeiro."); return; }
  if(qtdCarrinho()===0){ alert("Seu carrinho está vazio."); return; }
  const agora = new Date();
  const pedido = {
    dia: agora.toLocaleDateString("pt-BR"),
    hora: agora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
    equipe: usuario.equipe, nome: usuario.nome, numero: usuario.numero,
    itens: Object.values(carrinho).map(i=>({nome:i.nome, valor:i.preco, qtd:i.qtd})),
    total: totalCarrinho(),
    ts: agora.getTime(),
    mesRef: agora.getFullYear()+"-"+String(agora.getMonth()+1).padStart(2,"0")
  };
  const btnFin=document.querySelector("#carrinho-flutuante .btn:not(.secundario)");
  if(btnFin){ btnFin.disabled=true; btnFin.textContent="Enviando…"; }
  try{
    await Store.adicionar(pedido);
  }catch(e){
    console.error(e);
    alert(e&&e.code==="invalid_argument"
      ? "Você não tem permissão para registrar pedidos neste link. Peça ao responsável para liberar seu acesso como Colaborador."
      : "Não foi possível enviar o pedido agora. Tente novamente.");
    return;
  } finally { if(btnFin){ btnFin.disabled=false; btnFin.textContent="Finalizar"; } }
  const nomesCarrinho = Object.keys(carrinho);
  carrinho = {}; atualizarCarrinhoFlutuante(); fecharModalCarrinho();
  nomesCarrinho.forEach(atualizarCardProduto);
  alert("Pedido registrado! Bom apetite, "+usuario.nome+".");
}

function preencherCadastro(){
  try{
    const c=JSON.parse(localStorage.getItem("tere_cadastro")||"null"); if(!c) return;
    document.getElementById("c-nome").value=c.nome||""; document.getElementById("c-numero").value=c.numero||"";
    const s=document.getElementById("c-equipe"); if([...s.options].some(o=>o.value===c.equipe||o.text===c.equipe)) s.value=c.equipe;
  }catch(e){}
}
