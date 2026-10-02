/**
 * FUNÇÕES DE APOIO (usadas em vários lugares do site)
 * ------------------------------------------------------
 * - fmt: transforma um número em preço formatado ("R$ 12,50")
 * - semAcento: tira acento e deixa em minúsculo, para comparar textos
 * - esc: escapa HTML perigoso (evita que alguém injete código digitando
 *        um nome de produto ou prato com tags <script>, por exemplo)
 * - idProduto / chaveBanco: transformam um nome em um "identificador"
 *   sem espaço nem acento, para usar como chave/ID
 * - tokensPrato: quebra um nome de prato em palavras, para o comparador
 *   de fotos do cardápio semanal
 * - saudacao: escolhe "Bom dia/Boa tarde/Boa noite" pela hora do dia
 */

const fmt = v => "R$ " + v.toFixed(2).replace(".", ",");

function saudacao(){ const hr=new Date().getHours(); return hr<12?"Bom dia":hr<18?"Boa tarde":"Boa noite"; }

function idProduto(nome){ return "prod-" + nome.replace(/[^a-zA-Z0-9]+/g,"-"); }

function semAcento(s){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(); }

function esc(v){ return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function tokensPrato(s){ return semAcento(s||"").replace(/[.,]/g," ").split(/\s+/).filter(w=>w.length>=4 && !STOP_PALAVRAS.has(w)); }

function chaveBanco(nome){ return semAcento(nome||"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
