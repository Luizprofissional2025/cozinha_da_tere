/**
 * PONTO DE PARTIDA DO SITE
 * -----------------------------
 * mostrarAba(): troca entre a tela "Loja" e a tela "Administração".
 * O bloco (async function iniciar) lá embaixo roda sozinho assim que a
 * página carrega: liga o Store, busca o cardápio da semana e o banco de
 * fotos, e deixa tudo pronto para o usuário usar o site.
 *
 * ESTE ARQUIVO TEM QUE SER O ÚLTIMO <script> CARREGADO NO index.html,
 * porque a função iniciar() usa coisas definidas em todos os outros
 * arquivos (Store, carregarCardapio, montarBanner, etc.).
 */

window.addEventListener("hashchange",()=>{ if(location.hash==="#admin") mostrarAba("admin"); });
if(location.hash==="#admin") setTimeout(()=>mostrarAba("admin"),0);

function mostrarAba(aba){
  document.getElementById("aba-loja").classList.toggle("hidden", aba!=="loja");
  document.getElementById("aba-admin").classList.toggle("hidden", aba!=="admin");
  document.getElementById("nav-loja").classList.toggle("ativo", aba==="loja");
  document.getElementById("nav-admin").classList.toggle("ativo", aba==="admin");
}

(async function iniciar(){
  preencherCadastro();
  verificarAvisoFechamento(); montarBanner();
  atualizarStatus(await Store.pronto);
  carregarCardapio();
})();
