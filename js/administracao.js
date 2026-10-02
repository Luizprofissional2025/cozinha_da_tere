/**
 * ABA DE ADMINISTRAÇÃO
 * -------------------------
 * Tudo que só a responsável pela cozinha vê e usa depois de logar:
 *  - renderTabelaAdmin / renderStats: a tabela de pedidos em tempo real e
 *    os cards de resumo (pedidos hoje, total do mês, etc.)
 *  - excluirPedido / limparMes: apagar um pedido específico ou o mês inteiro
 *  - gerarFechamentoPDF / baixarPlanilha: os dois formatos de fechamento
 *    mensal (PDF bonito e planilha CSV para o Excel)
 *  - corEquipe: dá uma cor fixa para cada nome de equipe (EVA, VIVA, etc.)
 */

const CORES_EQUIPE = ["#E4352B","#2E9E4F","#2F80ED","#F2711C","#8E44AD","#0F9D8A","#C2185B","#5D6D7E"];

function corEquipe(nome){
  let h = 0; for(let i=0;i<nome.length;i++) h = (h*31 + nome.charCodeAt(i)) >>> 0;
  return CORES_EQUIPE[h % CORES_EQUIPE.length];
}

let todosPedidos = [];

async function excluirPedido(id){
  const p=todosPedidos.find(x=>x.__id===id); if(!p) return;
  if(!confirm(`Excluir o pedido de ${p.nome} (${p.dia} ${p.hora}, ${fmt(p.total)})? Isso não pode ser desfeito.`)) return;
  try{ await Store.remover([id]); }catch(e){ console.error(e); alert("Não foi possível excluir agora. Tente de novo."); }
}

function renderTabelaAdmin(){
  if(!adminLogado) return;
  const tb = document.getElementById("tabela-pedidos");
  if(todosPedidos.length===0){ tb.innerHTML = '<tr><td colspan="8" class="small">Nenhum pedido ainda.</td></tr>'; renderStats(); return; }
  tb.innerHTML = todosPedidos.map(p=>{
    const chips = p.itens.map(i=>`<span class="chip-item">${esc(i.qtd)}x ${esc(i.nome)}</span>`).join("");
    return `<tr><td>${esc(p.dia)}</td><td>${esc(p.hora)}</td><td><span class="badge-equipe" style="background:${corEquipe(String(p.equipe))}">${esc(p.equipe)}</span></td><td>${esc(p.nome)}</td><td>${esc(p.numero)}</td><td><div class="chips-itens">${chips}</div></td><td class="col-total">${fmt(p.total)}</td><td><button class="btn-x" title="Excluir este pedido" onclick="excluirPedido('${esc(p.__id)}')">Excluir</button></td></tr>`;
  }).join("");
  renderStats();
}

function renderStats(){
  if(!adminLogado) return;
  const el = document.getElementById("stats-grid");
  const hoje = new Date();
  const hojeStr = hoje.toLocaleDateString("pt-BR");
  const mesAtual = hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0");
  const doHoje = todosPedidos.filter(p=>p.dia===hojeStr);
  const doMesAtual = todosPedidos.filter(p=>p.mesRef===mesAtual);
  const totalHoje = doHoje.reduce((s,p)=>s+p.total,0);
  const totalMes = doMesAtual.reduce((s,p)=>s+p.total,0);
  const pessoasMes = new Set(doMesAtual.map(p=>p.nome+"|"+p.numero)).size;
  const cards = [
    {icone:"🛒", valor:doHoje.length, rotulo:"Pedidos hoje", cor:"var(--telha)", texto:"#fff"},
    {icone:"💰", valor:fmt(totalHoje), rotulo:"Retirado hoje", cor:"var(--mostarda)", texto:"#2B1A14"},
    {icone:"📅", valor:fmt(totalMes), rotulo:"Total do mês", cor:"var(--sálvia)", texto:"#fff"},
    {icone:"👥", valor:pessoasMes, rotulo:"Pessoas no mês", cor:"var(--tinta)", texto:"var(--creme)"}
  ];
  el.innerHTML = cards.map(c=>`<div class="stat-card" style="background:${c.cor};color:${c.texto}"><span class="icone">${c.icone}</span><span class="valor">${c.valor}</span><span class="rotulo">${c.rotulo}</span></div>`).join("");
}

function verificarAvisoFechamento(){
  const hoje = new Date();
  const aviso = document.getElementById("aviso-fechamento");
  const mesInput = document.getElementById("mes-fechar");
  if(hoje.getDate()===1){
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1);
    const ref = anterior.getFullYear()+"-"+String(anterior.getMonth()+1).padStart(2,"0");
    mesInput.value = ref;
    aviso.textContent = "Hoje é dia 1 — feche a folha do mês anterior para a cobrança de hoje.";
    aviso.classList.remove("hidden");
  } else {
    mesInput.value = hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0");
  }
}

async function limparMes(){
  const ref = document.getElementById("mes-fechar").value;
  if(!ref){ alert("Escolha o mês."); return; }
  const doMes = todosPedidos.filter(p=>p.mesRef===ref);
  if(doMes.length===0){ alert("Não há pedidos registrados para este mês."); return; }
  const [ano,mes] = ref.split("-");
  const nomeMes = new Date(ano,mes-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  if(!confirm(`Isso vai apagar ${doMes.length} pedido(s) de ${nomeMes} do sistema. Baixe o PDF antes, se ainda não baixou. Continuar?`)) return;
  try{
    await Store.remover(doMes.map(p=>p.__id));
    alert("Pedidos de "+nomeMes+" apagados.");
  }catch(e){ console.error(e); alert("Não foi possível limpar o mês agora. Tente de novo."); }
}

async function baixarArquivo(blob, filename){
  if(downloadsCap){ try{ await downloadsCap.save({filename, data: blob}); return; }catch(e){ console.error(e); } }
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function baixarPlanilha(){
  const ref=document.getElementById("mes-fechar").value; if(!ref){ alert("Escolha o mês."); return; }
  const doMes=todosPedidos.filter(p=>p.mesRef===ref).sort((a,b)=>(a.ts||0)-(b.ts||0));
  if(!doMes.length){ alert("Não há pedidos registrados para este mês."); return; }
  const num=v=>Number(v).toFixed(2).replace(".",",");
  const cel=v=>{ let s=String(v==null?"":v); if(/^[=+\-@]/.test(s)) s="'"+s; return '"'+s.replace(/"/g,'""')+'"'; };
  const linhas=[["Dia","Hora","Equipe","Nome","Contato","Produto","Qtd","Valor unit.","Subtotal"].map(cel).join(";")];
  const pessoas={};
  doMes.forEach(p=>{
    const k=p.nome+"|"+p.equipe+"|"+p.numero;
    pessoas[k]=pessoas[k]||{equipe:p.equipe,nome:p.nome,numero:p.numero,total:0}; pessoas[k].total+=p.total;
    p.itens.forEach(i=>linhas.push([p.dia,p.hora,p.equipe,p.nome,p.numero,i.nome,i.qtd,num(i.valor),num(i.valor*i.qtd)].map(cel).join(";")));
  });
  linhas.push("", ["Resumo por pessoa"].map(cel).join(";"), ["Equipe","Nome","Contato","Total do mês"].map(cel).join(";"));
  Object.values(pessoas).sort((a,b)=>a.equipe.localeCompare(b.equipe)||a.nome.localeCompare(b.nome))
    .forEach(x=>linhas.push([x.equipe,x.nome,x.numero,num(x.total)].map(cel).join(";")));
  const total=doMes.reduce((s,p)=>s+p.total,0);
  linhas.push(["Total geral","","",num(total)].map(cel).join(";"));
  baixarArquivo(new Blob(["\uFEFF"+linhas.join("\r\n")],{type:"text/csv;charset=utf-8"}),"fechamento-cozinha-da-tere-"+ref+".csv");
}

async function gerarFechamentoPDF(){
  const ref = document.getElementById("mes-fechar").value; // YYYY-MM
  if(!ref){ alert("Escolha o mês."); return; }
  const doMes = todosPedidos.filter(p=>p.mesRef===ref);
  if(doMes.length===0){ alert("Não há pedidos registrados para este mês."); return; }

  const porProduto = {}; const porPessoa = {};
  doMes.forEach(p=>{
    const chavePessoa = p.nome+"|"+p.equipe+"|"+p.numero;
    if(!porPessoa[chavePessoa]) porPessoa[chavePessoa] = {nome:p.nome, equipe:p.equipe, numero:p.numero, total:0, itens:{}};
    porPessoa[chavePessoa].total += p.total;
    p.itens.forEach(i=>{
      if(!porProduto[i.nome]) porProduto[i.nome] = {qtd:0, total:0, valor:i.valor};
      porProduto[i.nome].qtd += i.qtd;
      porProduto[i.nome].total += i.valor*i.qtd;
      const itensPessoa = porPessoa[chavePessoa].itens;
      if(!itensPessoa[i.nome]) itensPessoa[i.nome] = {qtd:0, dias:new Set()};
      itensPessoa[i.nome].qtd += i.qtd;
      itensPessoa[i.nome].dias.add(p.dia);
    });
  });
  const porEquipe = {};
  Object.values(porPessoa).forEach(p=>{
    if(!porEquipe[p.equipe]) porEquipe[p.equipe] = {nome:p.equipe, pessoas:[], total:0};
    porEquipe[p.equipe].pessoas.push(p);
    porEquipe[p.equipe].total += p.total;
  });
  const equipesOrdenadas = Object.values(porEquipe).sort((a,b)=>a.nome.localeCompare(b.nome));

  const TELHA=[228,53,43], TINTA=[43,26,20], MOSTARDA=[255,180,0], CREME=[255,249,239], ZEBRA=[255,244,222], LINHA=[240,223,203], BRANCO=[255,255,255];
  const ML=14, MR=196, LARGURA=182;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const [ano,mes] = ref.split("-");
  const nomeMes = new Date(ano,mes-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  let y = 0;

  function cabecalho(){
    doc.setFillColor(...TELHA); doc.rect(0,0,210,30,"F");
    doc.setTextColor(...BRANCO); doc.setFont("helvetica","bold"); doc.setFontSize(18);
    doc.text("Cozinha da Tere",ML,15);
    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    doc.text("Fechamento de "+nomeMes,ML,23);
    doc.setFontSize(9); doc.text("Emitido em "+new Date().toLocaleDateString("pt-BR"),MR,23,{align:"right"});
    doc.setTextColor(...TINTA);
    y = 40;
  }
  function tituloSecao(txt){
    checarQuebra(12);
    doc.setFillColor(...TINTA); doc.rect(ML,y-5,LARGURA,8,"F");
    doc.setTextColor(...BRANCO); doc.setFont("helvetica","bold"); doc.setFontSize(11);
    doc.text(txt,ML+3,y);
    doc.setTextColor(...TINTA); doc.setFont("helvetica","normal");
    y+=8;
  }
  function checarQuebra(altura){ if(y+altura>282){ doc.addPage(); cabecalhoContinuacao(); } }
  function cabecalhoContinuacao(){
    doc.setFillColor(...MOSTARDA); doc.rect(0,0,210,12,"F");
    doc.setTextColor(...TINTA); doc.setFont("helvetica","bold"); doc.setFontSize(10);
    doc.text("Cozinha da Tere · Fechamento de "+nomeMes,ML,8);
    doc.setFont("helvetica","normal"); y = 20;
  }

  cabecalho();

  tituloSecao("Resumo por equipe");
  doc.setFontSize(9);
  equipesOrdenadas.forEach((e,idx)=>{
    checarQuebra(7);
    if(idx%2===0){ doc.setFillColor(...ZEBRA); doc.rect(ML,y-4.2,LARGURA,6.2,"F"); }
    doc.setFont("helvetica","bold"); doc.text(e.nome,ML+3,y);
    doc.setFont("helvetica","normal");
    doc.text(e.pessoas.length+" pessoa(s)",110,y);
    doc.setFont("helvetica","bold"); doc.text(fmt(e.total),MR-3,y,{align:"right"});
    doc.setFont("helvetica","normal");
    y+=6.2;
  });
  y+=6;

  tituloSecao("Produtos retirados no mês");
  doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text("Produto",ML+3,y); doc.text("Qtd",125,y,{align:"right"}); doc.text("Valor unit.",160,y,{align:"right"}); doc.text("Total",MR-3,y,{align:"right"});
  doc.setFont("helvetica","normal"); y+=2;
  doc.setDrawColor(...LINHA); doc.line(ML,y,MR,y); y+=4.5;
  let totalGeral = 0; let linha=0;
  Object.entries(porProduto).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([nome,d])=>{
    checarQuebra(6);
    if(linha%2===0){ doc.setFillColor(...ZEBRA); doc.rect(ML,y-4.2,LARGURA,6,"F"); }
    doc.text(nome.substring(0,48),ML+3,y); doc.text(String(d.qtd),125,y,{align:"right"});
    doc.text(fmt(d.valor),160,y,{align:"right"}); doc.text(fmt(d.total),MR-3,y,{align:"right"});
    totalGeral += d.total; y+=6; linha++;
  });
  y+=2; checarQuebra(10);
  doc.setFillColor(...MOSTARDA); doc.rect(ML,y-5,LARGURA,8,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("Total geral do mês",ML+3,y); doc.text(fmt(totalGeral),MR-3,y,{align:"right"});
  doc.setFont("helvetica","normal"); y+=13;

  equipesOrdenadas.forEach(equipe=>{
    checarQuebra(14);
    tituloSecao(equipe.nome+"  ·  "+fmt(equipe.total));
    equipe.pessoas.sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(p=>{
      const nItens = Object.keys(p.itens).length;
      checarQuebra(8+nItens*4.5);
      doc.setFillColor(...TELHA); doc.rect(ML,y-3.6,1.2,5.2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10);
      doc.text(`${p.nome}   ·   ${p.numero}`,ML+4,y); y+=5.5;
      doc.setFont("helvetica","normal"); doc.setFontSize(8.8); doc.setTextColor(90,68,52);
      Object.entries(p.itens).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([nome,d])=>{
        checarQuebra(4.5);
        const dias = Array.from(d.dias).sort().join(", ");
        doc.text(`•  ${d.qtd}x ${nome}  (${dias})`,ML+4,y); y+=4.3;
      });
      doc.setTextColor(...TINTA); doc.setFont("helvetica","bold"); doc.setFontSize(9.3);
      doc.text(`Total de ${p.nome}: ${fmt(p.total)}`,ML+4,y); y+=3;
      doc.setFont("helvetica","normal");
      y+=2.5; doc.setDrawColor(...LINHA); doc.line(ML,y,MR,y); y+=4.5;
    });
    y+=3;
  });

  const totalPaginas = doc.internal.getNumberOfPages();
  for(let i=1;i<=totalPaginas;i++){
    doc.setPage(i);
    doc.setDrawColor(...LINHA); doc.line(ML,289,MR,289);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(140,120,100);
    doc.text("Cozinha da Tere",ML,294);
    doc.text(`Página ${i} de ${totalPaginas}`,MR,294,{align:"right"});
  }

  const blob = doc.output("blob");
  const filename = "fechamento-cozinha-da-tere-"+ref+".pdf";
  if(downloadsCap){
    try{ await downloadsCap.save({filename, data: blob}); return; }catch(e){ console.error(e); }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
}
