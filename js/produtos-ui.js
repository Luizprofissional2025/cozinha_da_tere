/**
 * MONTAGEM DA VITRINE DE PRODUTOS
 * ------------------------------------
 * Constrói os cards de produto na tela (criarCard), monta as seções por
 * categoria (montarProdutos), o carrossel de "Sugestões da casa"
 * (montarDestaques), as fotos do banner e a busca por nome (filtrarProdutos).
 */

function criarCard(cat,nome,preco,emoji,destaque){
  const d=document.createElement("div"); d.className="produto"; d.dataset.nome=nome;
  const nomeEsc=nome.replace(/'/g,"\\'");
  const foto=IMAGENS[nome];
  const img=foto?`<img src="${foto}" alt="${nome}">`:(emoji||ICONE_CATEGORIA[cat]);
  d.innerHTML=`
    <div class="produto-img">${destaque?'<span class="fita">Sugestão</span>':''}${img}
      <button class="produto-add" aria-label="Adicionar ${nome}" onclick="adicionarCarrinho('${nomeEsc}',${preco})">+</button>
      <div class="produto-stepper">
        <button onclick="alterarQtd('${nomeEsc}',-1)">−</button>
        <span class="produto-qtd-num">0</span>
        <button onclick="alterarQtd('${nomeEsc}',1)">+</button>
      </div>
    </div>
    <div class="produto-info"><strong>${nome}</strong><span class="preco">${fmt(preco)}</span></div>`;
  return d;
}

function montarDestaques(){
  const car=document.getElementById("carrossel"); car.innerHTML="";
  DESTAQUES.forEach(n=>{
    for(const cat in PRODUTOS){ const it=PRODUTOS[cat].find(x=>x[0]===n); if(it){ car.appendChild(criarCard(cat,it[0],it[1],it[2],true)); break; } }
  });
  document.getElementById("destaques").classList.remove("hidden");
}

function montarBanner(){
  const el=document.getElementById("banner-pratos");
  el.innerHTML=["Empadão de frango","Tapioca de Nutella","Mousse de maracujá"].filter(n=>IMAGENS[n]).map(n=>`<img src="${IMAGENS[n]}" alt="">`).join("");
}

function montarProdutos(){
  const nav = document.getElementById("nav-categorias");
  const el = document.getElementById("secoes-produtos");
  nav.innerHTML = ""; el.innerHTML = "";
  for(const cat in PRODUTOS){
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = ICONE_CATEGORIA[cat]+" "+cat;
    chip.setAttribute("aria-controls", "secao-"+cat);
    chip.onclick = ()=>document.getElementById("secao-"+cat).scrollIntoView({behavior:"smooth", block:"start"});
    nav.appendChild(chip);

    // Título real (h2), não uma <div> — ajuda leitor de tela e dá uma
    // hierarquia de títulos correta para a página (h1 > h2 por categoria)
    const titulo = document.createElement("h2");
    titulo.className = "secao-titulo"; titulo.id = "secao-"+cat;
    titulo.classList.add("menu");
    titulo.innerHTML = `<span>${ICONE_CATEGORIA[cat]||""} ${cat}</span><span class="risco" aria-hidden="true"></span><small class="sub">${TEXTO_CATEGORIA[cat]||""} · ${PRODUTOS[cat].length} opções</small>`;
    el.appendChild(titulo);
    const grid = document.createElement("div"); grid.className = "grid-produtos";
    PRODUTOS[cat].forEach(([nome,preco,emoji])=>grid.appendChild(criarCard(cat,nome,preco,emoji,false)));
    el.appendChild(grid);
  }
  montarDestaques();
  atualizarChipsAtivos();
}

function filtrarProdutos(q){
  const t=semAcento(q.trim()); let total=0;
  document.getElementById("destaques").classList.toggle("hidden",!!t);
  document.querySelectorAll("#secoes-produtos .grid-produtos").forEach(g=>{
    let vis=0;
    g.querySelectorAll(".produto").forEach(c=>{
      const ok=!t||semAcento(c.querySelector("strong").textContent).includes(t);
      c.classList.toggle("hidden",!ok); if(ok) vis++;
    });
    g.classList.toggle("hidden",vis===0);
    const tit=g.previousElementSibling; if(tit) tit.classList.toggle("hidden",vis===0);
    total+=vis;
  });
  document.getElementById("busca-vazia").classList.toggle("hidden",total>0);
}

function atualizarCardProduto(nome){
  const qtd = carrinho[nome] ? carrinho[nome].qtd : 0;
  document.querySelectorAll(".produto").forEach(card=>{
    if(card.dataset.nome!==nome) return;
    card.classList.toggle("no-carrinho", qtd>0);
    card.querySelector(".produto-qtd-num").textContent = qtd;
  });
}

let observerCategorias = null;

function atualizarChipsAtivos(){
  if(observerCategorias) observerCategorias.disconnect();
  const chips = [...document.getElementById("nav-categorias").children];
  const titulos = [...document.querySelectorAll("#secoes-produtos .secao-titulo")];
  observerCategorias = new IntersectionObserver(entradas=>{
    entradas.forEach(en=>{
      if(en.isIntersecting){
        const idx = titulos.indexOf(en.target);
        chips.forEach(c=>c.classList.remove("ativo"));
        if(chips[idx]) chips[idx].classList.add("ativo");
      }
    });
  }, {rootMargin:"-120px 0px -70% 0px"});
  titulos.forEach(t=>observerCategorias.observe(t));
}
