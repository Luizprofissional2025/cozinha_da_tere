import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

/* ---------- constantes e utilidades ---------- */
const TEAMS = ['EVA', 'VIVA', 'ED', 'BANCAR', 'DEV'];
const CATS = { doces: ['🍬', 'Doces'], sobremesas: ['🍮', 'Sobremesas'], lanches: ['🥪', 'Lanches'], bebidas: ['🥤', 'Bebidas'] };
const DAYS = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta']];
const R = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',');
const ym = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const dt = (t) => new Date(t).toLocaleDateString('pt-BR');
const hr = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const txt = (items) => items.map((i) => `${i.q}x ${i.n}`).join(', ');
const avatar = (u) => u.photo || 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#f5821f"/><text x="20" y="27" font-size="20" text-anchor="middle" fill="#fff">${u.name[0]}</text></svg>`);

// Reduz a foto antes de enviar (economiza banco e internet)
const resize = (file, max = 360) => new Promise((ok) => {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.72));
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
});

const beep = () => { try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.18); } catch { /* sem som */ } };

// Chamada única para a API (/api). admin=true usa o token da administração.
async function call(action, body = {}, admin = false) {
  const tk = admin ? sessionStorage.getItem('atk') : localStorage.getItem('tk') || sessionStorage.getItem('atk');
  const r = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(tk && { Authorization: 'Bearer ' + tk }) },
    body: JSON.stringify({ action, ...body }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Erro de conexão'), { status: r.status });
  return d;
}

function makePdf(orders, m) {
  const l = orders.filter((o) => ym(o.ts) === m).sort((a, b) => a.ts - b.ts);
  if (!l.length) return false;
  const D = new jsPDF(); let y = 38;
  const ln = (t, x = 14, s = 10, b = false, r) => {
    if (y > 280) { D.addPage(); y = 18; }
    D.setFontSize(s); D.setFont('helvetica', b ? 'bold' : 'normal'); D.text(t, x, y);
    if (r) D.text(r, 196, y, { align: 'right' });
    y += s * 0.5 + 2.5;
  };
  D.setFillColor(227, 52, 42); D.rect(0, 0, 210, 28, 'F'); D.setTextColor(255);
  D.setFontSize(18); D.setFont('helvetica', 'bold'); D.text('Cozinha da Tere', 14, 13);
  D.setFontSize(10); D.text(`Fechamento de ${m.slice(5)}/${m.slice(0, 4)}`, 14, 21); D.setTextColor(0);
  ln('Resumo por equipe', 14, 12, true);
  TEAMS.forEach((t) => { const x = l.filter((o) => o.team === t); if (x.length) ln(`${t} - ${new Set(x.map((o) => o.phone)).size} pessoa(s)`, 16, 10, false, R(x.reduce((s, o) => s + o.total, 0))); });
  ln('TOTAL GERAL', 14, 11, true, R(l.reduce((s, o) => s + o.total, 0))); y += 4;
  TEAMS.forEach((t) => {
    const x = l.filter((o) => o.team === t); if (!x.length) return;
    y += 3; ln(`EQUIPE ${t} - ${R(x.reduce((s, o) => s + o.total, 0))}`, 14, 12, true);
    [...new Set(x.map((o) => o.phone))].forEach((ph) => {
      const z = x.filter((o) => o.phone === ph);
      ln(`Nome: ${z[0].name}   Numero: ${ph}`, 16, 10, true);
      z.forEach((o) => o.items.forEach((i) => ln(`${i.q}x ${i.n}  (${dt(o.ts)} ${hr(o.ts)})`, 20, 9, false, R(i.p * i.q))));
      ln(`Total de ${z[0].name}`, 16, 10, true, R(z.reduce((s, o) => s + o.total, 0))); y += 2;
    });
  });
  D.save(`fechamento-${m}.pdf`);
  return true;
}

function makeCsv(orders, m) {
  let c = 'Dia;Hora;Equipe;Nome;Contato;Itens;Total\n';
  orders.filter((o) => ym(o.ts) === m).sort((a, b) => a.ts - b.ts).forEach((o) => {
    c += [dt(o.ts), hr(o.ts), o.team, o.name, o.phone, txt(o.items), o.total.toFixed(2).replace('.', ',')].join(';') + '\n';
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + c], { type: 'text/csv' }));
  a.download = `fechamento-${m}.csv`; a.click();
}

/* ---------- aplicativo ---------- */
export default function App() {
  const [tab, setTab] = useState('cad');
  const [menu, setMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdm, setIsAdm] = useState(!!sessionStorage.getItem('atk'));
  const [prods, setProds] = useState([]);
  const [week, setWeek] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState('');
  const known = useRef(null), seen = useRef(null), timer = useRef();

  const notify = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 5500); };

  // volta logado se já tiver sessão salva
  useEffect(() => {
    if (!localStorage.getItem('tk')) return;
    call('me').then((d) => { setUser(d.user); setTab('loja'); }).catch(() => localStorage.removeItem('tk'));
  }, []);

  // catálogo: atualiza a cada 6s; avisa quando um produto some da loja
  const loadCatalog = async () => {
    try {
      const d = await call('catalog');
      if (known.current) {
        const ids = new Set(d.products.map((p) => p.id));
        known.current.forEach((nome, id) => { if (!ids.has(id)) notify(`🗑️ "${nome}" foi removido da loja`); });
      }
      known.current = new Map(d.products.map((p) => [p.id, p.name]));
      setProds(d.products); setWeek(d.week);
    } catch { /* tenta de novo no próximo ciclo */ }
  };
  useEffect(() => {
    if (!user && !isAdm) return;
    loadCatalog();
    const t = setInterval(loadCatalog, 6000);
    return () => clearInterval(t);
  }, [user, isAdm]);

  // pedidos em tempo real (administração): consulta a cada 4s e avisa pedidos novos
  const loadOrders = async () => {
    try {
      const d = await call('adminOrders', {}, true);
      if (seen.current) d.orders.filter((o) => !seen.current.has(o.id)).forEach((o) => { notify(`🔔 ${o.name} (${o.team}) pegou ${txt(o.items)} · ${R(o.total)}`); beep(); });
      seen.current = new Set(d.orders.map((o) => o.id)); setOrders(d.orders);
    } catch (e) {
      if (e.status === 401 || e.status === 403) { sessionStorage.removeItem('atk'); setIsAdm(false); }
    }
  };
  useEffect(() => {
    if (!isAdm) { seen.current = null; return; }
    loadOrders();
    const t = setInterval(loadOrders, 4000);
    return () => clearInterval(t);
  }, [isAdm]);

  const logout = () => { localStorage.removeItem('tk'); setUser(null); setCart({}); setTab('cad'); };
  const TABS = [['cad', user ? 'Conta' : 'Cadastro'], ['gas', 'Meus gastos'], ['loja', 'Loja'], ['adm', 'Administração']];

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark topbar sticky-top">
        <div className="container">
          <span className="navbar-brand brand fs-4 mb-0 lh-1">Cozinha da Tere
            <small className="d-block fw-bold" style={{ color: '#ffb400', fontSize: '.7rem', fontFamily: 'Work Sans' }}>Pegou, anotou, pagou no dia 1</small>
          </span>
          <div className="d-flex align-items-center gap-2 order-md-last">
            {user && <img className="avatar" src={avatar(user)} alt="Foto de perfil" />}
            <button className="navbar-toggler" aria-label="Menu" onClick={() => setMenu(!menu)}><span className="navbar-toggler-icon" /></button>
          </div>
          <div className={'collapse navbar-collapse' + (menu ? ' show' : '')}>
            <ul className="navbar-nav ms-auto py-2 gap-md-1">
              {TABS.map(([k, l]) => (
                <li className="nav-item" key={k}>
                  <button className={'btn btn-link nav-link text-white fw-bold' + (tab === k ? ' text-decoration-underline' : '')} onClick={() => { setTab(k); setMenu(false); }}>{l}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {msg && <div className="toast-wrap"><div className="toast show text-bg-success fw-bold"><div className="toast-body">{msg}</div></div></div>}

      <main className="container py-3">
        {tab === 'cad' && (user
          ? <div className="card p-4 mx-auto" style={{ maxWidth: 520 }}>
              <h2>Olá, {user.name}!</h2>
              <p className="text-secondary">{user.team} · {user.phone}</p>
              <div className="d-flex gap-2 flex-wrap"><button className="btn btn-primary" onClick={() => setTab('loja')}>Ir para a loja</button><button className="btn btn-outline-primary" onClick={logout}>Sair</button></div>
            </div>
          : <Auth onLogin={(u) => { setUser(u); setTab('loja'); }} />)}
        {tab === 'gas' && (user ? <Spending notify={notify} /> : <div className="alert alert-warning">Faça login na aba Cadastro.</div>)}
        {tab === 'loja' && (user ? <Shop user={user} prods={prods} week={week} cart={cart} setCart={setCart} notify={notify} /> : <div className="alert alert-warning">Faça login na aba Cadastro para comprar.</div>)}
        {tab === 'adm' && (isAdm
          ? <Admin orders={orders} prods={prods} week={week} notify={notify} reload={loadCatalog} reloadOrders={loadOrders} known={known} onExit={() => { sessionStorage.removeItem('atk'); setIsAdm(false); }} />
          : <AdminLogin onOk={() => setIsAdm(true)} />)}
      </main>
    </>
  );
}

/* ---------- cadastro / login ---------- */
function Auth({ onLogin }) {
  const [up, setUp] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', team: '', password: '' });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await call(up ? 'register' : 'login', { ...f, photo: up && file ? await resize(file, 160) : '' });
      localStorage.setItem('tk', d.token); onLogin(d.user);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <form className="card p-4 mx-auto" style={{ maxWidth: 520 }} onSubmit={send}>
      <h2>{up ? 'Criar cadastro' : 'Entrar'}</h2>
      <p className="text-secondary">{up ? 'Preencha uma vez só.' : 'Use seu número e senha.'}</p>
      {up && <div className="mb-3"><label className="form-label fw-bold">Nome</label><input className="form-control" value={f.name} onChange={set('name')} required /></div>}
      <div className="mb-3"><label className="form-label fw-bold">Número (celular)</label><input className="form-control" inputMode="tel" placeholder="(00) 00000-0000" value={f.phone} onChange={set('phone')} required /></div>
      {up && <>
        <div className="mb-3"><label className="form-label fw-bold">Equipe</label>
          <select className="form-select" value={f.team} onChange={set('team')} required><option value="">Selecione sua equipe</option>{TEAMS.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="mb-3"><label className="form-label fw-bold">Foto de perfil</label><input className="form-control" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></div>
      </>}
      <div className="mb-3"><label className="form-label fw-bold">Senha (mín. 6 caracteres)</label><input className="form-control" type="password" minLength={6} value={f.password} onChange={set('password')} required /></div>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <div className="d-grid gap-2 d-sm-flex">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Aguarde...' : up ? 'Cadastrar' : 'Entrar'}</button>
        <button type="button" className="btn btn-outline-primary" onClick={() => { setUp(!up); setErr(''); }}>{up ? 'Já tenho conta' : 'Criar conta'}</button>
      </div>
    </form>
  );
}

/* ---------- loja ---------- */
function Shop({ user, prods, week, cart, setCart, notify }) {
  const [cat, setCat] = useState('doces');
  const [open, setOpen] = useState(false);
  const items = [
    ...week.map((w) => ({ key: 'w:' + w.day, name: `${DAYS.find((d) => d[0] === w.day)?.[1]}: ${w.name}`, price: w.price, photo: w.photo, cat: 'w' })),
    ...prods.map((p) => ({ ...p, key: String(p.id) })),
  ];
  const by = Object.fromEntries(items.map((i) => [i.key, i]));
  const lines = Object.entries(cart).filter(([k]) => by[k]);
  const total = lines.reduce((s, [k, q]) => s + by[k].price * q, 0), n = lines.reduce((s, [, q]) => s + q, 0);
  const add = (k) => { setCart((c) => ({ ...c, [k]: (c[k] || 0) + 1 })); notify('Adicionado ao carrinho'); };
  const qty = (k, d) => setCart((c) => { const v = { ...c, [k]: c[k] + d }; if (v[k] <= 0) delete v[k]; return v; });
  const h = new Date().getHours(), g = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const finish = async () => {
    try { await call('order', { items: lines.map(([id, q]) => ({ id, q })) }); setCart({}); setOpen(false); notify('Pedido registrado! ✅'); }
    catch (e) { notify('Erro ao enviar: ' + e.message); }
  };
  const Card = ({ x }) => (
    <div className="col"><div className="card pcard h-100 p-2">
      {x.novo && Date.now() - x.ts < 12096e5 && <span className="badge text-bg-danger tagnew">Novidade</span>}
      <div className="ph">{x.photo ? <img src={x.photo} alt={x.name} /> : CATS[x.cat]?.[0] || '🍽️'}</div>
      <div className="nm mt-2">{x.name}</div><div className="price">{R(x.price)}</div>
      <button className="btn btn-primary add" aria-label={'Adicionar ' + x.name} onClick={() => add(x.key)}>+</button>
    </div></div>
  );
  const grid = 'row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3';
  const wk = items.filter((i) => i.cat === 'w');
  return (
    <>
      <div className="hero p-4 mb-3"><h2>{g}, {user.name.split(' ')[0]}!</h2><p className="mb-0">Escolha, monte o carrinho e pronto: tudo entra na sua conta do mês.</p></div>
      {wk.length > 0 && <><h3 className="h4 mt-3">🍽️ Almoço da semana</h3><div className={grid}>{wk.map((x) => <Card key={x.key} x={x} />)}</div></>}
      <div className="d-flex gap-2 flex-wrap my-3">
        {Object.entries(CATS).map(([k, v]) => <button key={k} className={'btn rounded-pill ' + (k === cat ? 'btn-primary' : 'btn-outline-primary')} onClick={() => setCat(k)}>{v[0]} {v[1]}</button>)}
      </div>
      <h3 className="h4">{CATS[cat][0]} {CATS[cat][1]}</h3>
      <div className={grid}>{items.filter((i) => i.cat === cat).sort((a, b) => !!b.novo - !!a.novo).map((x) => <Card key={x.key} x={x} />)}</div>

      {n > 0 && <div className="cartbar bg-dark text-white p-3 d-flex justify-content-between align-items-center"><span>🛒 {n} item(ns) · {R(total)}</span><button className="btn btn-warning fw-bold" onClick={() => setOpen(true)}>Ver carrinho</button></div>}
      {open && <div className="modal d-block" style={{ background: '#0008' }} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">Seu carrinho</h5><button className="btn-close" onClick={() => setOpen(false)} /></div>
          <div className="modal-body">{lines.map(([k, q]) => (
            <div key={k} className="d-flex align-items-center gap-2 border-bottom py-2">
              <span className="flex-grow-1">{by[k].name}</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => qty(k, -1)}>−</button><b>{q}</b><button className="btn btn-sm btn-outline-secondary" onClick={() => qty(k, 1)}>+</button>
              <b className="text-end" style={{ minWidth: 70 }}>{R(by[k].price * q)}</b>
            </div>))}</div>
          <div className="modal-footer justify-content-between"><b className="fs-5">Total: {R(total)}</b><button className="btn btn-success" onClick={finish}>Finalizar pedido</button></div>
        </div></div>
      </div>}
    </>
  );
}

/* ---------- meus gastos ---------- */
function Spending({ notify }) {
  const [os, setOs] = useState([]);
  const [m, setM] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { call('myOrders').then((d) => setOs(d.orders)).catch(() => {}); }, []);
  const ms = [...new Set(os.map((o) => ym(o.ts)))].sort().reverse();
  const cur = ms.includes(m) ? m : ms[0] || '';
  const list = os.filter((o) => ym(o.ts) === cur);
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { await call('setPassword', { password: pw }); setPw(''); notify('Senha alterada. Use a nova no próximo login.'); }
    catch (x) { setErr(x.message); }
  };
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-7"><div className="card p-3">
        <h2 className="h4">Meus gastos</h2>
        <label className="form-label fw-bold">Mês</label>
        <select className="form-select mb-3" value={cur} onChange={(e) => setM(e.target.value)}>
          {ms.length ? ms.map((x) => <option key={x} value={x}>{x.slice(5)}/{x.slice(0, 4)}</option>) : <option>Sem compras ainda</option>}
        </select>
        <div className="stat bg-success mb-3"><small>Total do mês</small><b>{R(list.reduce((s, o) => s + o.total, 0))}</b></div>
        {list.map((o) => <div key={o.id} className="d-flex justify-content-between gap-2 border-bottom py-2"><span><small className="text-secondary">{dt(o.ts)} {hr(o.ts)}</small><br />{o.items.map((i, k) => <span key={k} className="badge text-bg-light border me-1">{i.q}x {i.n}</span>)}</span><b>{R(o.total)}</b></div>)}
      </div></div>
      <div className="col-12 col-lg-5"><form className="card p-3" onSubmit={save}>
        <h3 className="h5">Esqueceu a senha? Crie uma nova</h3>
        <label className="form-label fw-bold">Nova senha (mín. 6)</label>
        <input className="form-control mb-3" type="password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <div className="alert alert-danger py-2">{err}</div>}
        <button className="btn btn-primary">Salvar nova senha</button>
      </form></div>
    </div>
  );
}

/* ---------- administração ---------- */
function AdminLogin({ onOk }) {
  const [f, setF] = useState({ login: '', password: '' });
  const [err, setErr] = useState('');
  const send = async (e) => {
    e.preventDefault();
    try { const d = await call('adminLogin', f); sessionStorage.setItem('atk', d.token); onOk(); } catch (x) { setErr(x.message); }
  };
  return (
    <form className="card p-4 mx-auto" style={{ maxWidth: 420 }} onSubmit={send}>
      <h2 className="h4">Administração</h2>
      <label className="form-label fw-bold">Login</label><input className="form-control mb-3" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} required />
      <label className="form-label fw-bold">Senha</label><input className="form-control mb-3" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <button className="btn btn-primary">Entrar</button>
    </form>
  );
}

function Admin({ orders, prods, week, notify, reload, reloadOrders, known, onExit }) {
  const [fm, setFm] = useState(ym(Date.now()));
  const [rc, setRc] = useState('doces');
  const [np, setNp] = useState({ cat: 'doces', name: '', price: '' });
  const [npFile, setNpFile] = useState(null);
  const [fk, setFk] = useState(0);
  const [cred, setCred] = useState({ login: '', password: '' });
  const [wk, setWk] = useState(() => Object.fromEntries(DAYS.map(([k]) => {
    const w = week.find((x) => x.day === k) || {};
    return [k, { name: w.name || '', price: w.price ? String(w.price).replace('.', ',') : '', photo: w.photo || '' }];
  })));
  const run = async (fn, ok) => { try { await fn(); if (ok) notify(ok); } catch (e) { notify('Erro: ' + e.message); } };

  const today = new Date().toDateString(), cm = ym(Date.now());
  const to = orders.filter((o) => new Date(o.ts).toDateString() === today), mo = orders.filter((o) => ym(o.ts) === cm);
  const Stat = ({ c, l, v }) => <div className="col-6 col-md-3"><div className="stat" style={{ background: c }}><small>{l}</small><b>{v}</b></div></div>;

  const remove = (p) => confirm(`Remover "${p.name}" da loja?`) && run(async () => {
    await call('removeProduct', { id: p.id }, true);
    known.current?.delete(p.id);             // evita aviso duplicado do vigia do catálogo
    notify(`🗑️ "${p.name}" foi removido da loja`);
    await reload();
  });
  const addProduct = () => run(async () => {
    await call('addProduct', { ...np, price: parseFloat(np.price.replace(',', '.')), photo: npFile ? await resize(npFile) : '' }, true);
    setNp({ ...np, name: '', price: '' }); setNpFile(null); setFk(fk + 1); await reload();
  }, 'Produto publicado como novidade!');
  const saveWeek = () => run(() => call('saveWeek', { days: Object.fromEntries(Object.entries(wk).map(([k, w]) => [k, { ...w, price: parseFloat(w.price.replace(',', '.')) || 0 }])) }, true).then(reload), 'Cardápio da semana salvo.');
  const clearMonth = () => {
    const n = orders.filter((o) => ym(o.ts) === fm).length;
    if (n && confirm(`Apagar ${n} pedidos de ${fm}? Baixe o PDF antes!`)) run(async () => { await call('clearMonth', { month: fm }, true); await reloadOrders(); }, 'Pedidos do mês apagados.');
  };

  return (
    <>
      <div className="row g-2 mb-3">
        <Stat c="#e3342a" l="Pedidos hoje" v={to.length} />
        <Stat c="#e69500" l="Retirado hoje" v={R(to.reduce((s, o) => s + o.total, 0))} />
        <Stat c="#2e9b4e" l="Total do mês" v={R(mo.reduce((s, o) => s + o.total, 0))} />
        <Stat c="#2b1810" l="Pessoas no mês" v={new Set(mo.map((o) => o.phone)).size} />
      </div>

      <div className="card p-3 mb-3">
        <h3 className="h5">📋 Pedidos em tempo real</h3>
        <p className="text-secondary small">Cada compra feita em qualquer aparelho aparece aqui sozinha (atualiza a cada 4 segundos).</p>
        <div className="table-responsive"><table className="table table-sm table-striped align-middle">
          <thead className="table-danger"><tr><th>Dia</th><th>Hora</th><th>Equipe</th><th>Nome</th><th>Contato</th><th>Itens</th><th>Total</th><th /></tr></thead>
          <tbody>{orders.slice(0, 60).map((o) => (
            <tr key={o.id}><td>{dt(o.ts)}</td><td>{hr(o.ts)}</td><td><span className="badge team">{o.team}</span></td><td>{o.name}</td><td>{o.phone}</td>
              <td>{o.items.map((i, k) => <span key={k} className="badge text-bg-light border me-1">{i.q}x {i.n}</span>)}</td>
              <td className="fw-bold text-danger">{R(o.total)}</td>
              <td><button className="btn btn-sm btn-outline-primary" onClick={() => confirm('Excluir este pedido?') && run(async () => { await call('deleteOrder', { id: o.id }, true); await reloadOrders(); })}>Excluir</button></td></tr>
          ))}{!orders.length && <tr><td colSpan="8">Nenhum pedido ainda.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="card p-3 mb-3">
        <h3 className="h5">🍽️ Almoço da semana (segunda a sexta)</h3>
        <div className="row g-3">{DAYS.map(([k, n]) => (
          <div className="col-12 col-md-6 col-xl-4" key={k}>
            <label className="form-label fw-bold">{n}</label>
            <input className="form-control mb-2" placeholder="Nome do prato" value={wk[k].name} onChange={(e) => setWk({ ...wk, [k]: { ...wk[k], name: e.target.value } })} />
            <input className="form-control mb-2" placeholder="Preço (ex: 18,00)" value={wk[k].price} onChange={(e) => setWk({ ...wk, [k]: { ...wk[k], price: e.target.value } })} />
            <input className="form-control" type="file" accept="image/*" onChange={async (e) => e.target.files[0] && setWk({ ...wk, [k]: { ...wk[k], photo: await resize(e.target.files[0]) } })} />
          </div>))}</div>
        <div className="d-flex gap-2 mt-3 flex-wrap">
          <button className="btn btn-primary" onClick={saveWeek}>Salvar cardápio da semana</button>
          <button className="btn btn-outline-primary" onClick={() => confirm('Limpar todos os pratos?') && run(async () => { await call('saveWeek', { days: {} }, true); setWk(Object.fromEntries(DAYS.map(([k]) => [k, { name: '', price: '', photo: '' }]))); await reload(); }, 'Semana limpa.')}>Limpar semana</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-6"><div className="card p-3 h-100">
          <h3 className="h5">➕ Novo produto</h3>
          <label className="form-label fw-bold">Categoria</label>
          <select className="form-select mb-2" value={np.cat} onChange={(e) => setNp({ ...np, cat: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v[0]} {v[1]}</option>)}</select>
          <label className="form-label fw-bold">Nome</label><input className="form-control mb-2" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
          <label className="form-label fw-bold">Valor</label><input className="form-control mb-2" placeholder="ex: 4,50" value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} />
          <label className="form-label fw-bold">Foto</label><input key={fk} className="form-control mb-3" type="file" accept="image/*" onChange={(e) => setNpFile(e.target.files[0])} />
          <button className="btn btn-primary" onClick={addProduct}>Publicar produto</button>
        </div></div>
        <div className="col-12 col-lg-6"><div className="card p-3 h-100">
          <h3 className="h5">🗑️ Remover produto</h3>
          <p className="text-secondary small">Apaga o produto da loja de todos os usuários (os pedidos antigos continuam no histórico).</p>
          <select className="form-select mb-2" value={rc} onChange={(e) => setRc(e.target.value)}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v[0]} {v[1]}</option>)}</select>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {prods.filter((p) => p.cat === rc).map((p) => (
              <div key={p.id} className="d-flex align-items-center gap-2 border-bottom py-2">
                <span className="flex-grow-1">{p.name} · {R(p.price)}</span><button className="btn btn-sm btn-outline-danger" onClick={() => remove(p)}>Remover</button>
              </div>))}
            {!prods.some((p) => p.cat === rc) && <p className="text-secondary">Nenhum produto nesta categoria.</p>}
          </div>
        </div></div>
      </div>

      <div className="card p-3 mb-3">
        <h3 className="h5">📜 Fechamento mensal (todo dia 1)</h3>
        <label className="form-label fw-bold">Mês a fechar</label>
        <input type="month" className="form-control mb-3" style={{ maxWidth: 240 }} value={fm} onChange={(e) => setFm(e.target.value)} />
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-success" onClick={() => makePdf(orders, fm) || notify('Sem pedidos neste mês.')}>Gerar PDF do fechamento</button>
          <button className="btn btn-outline-primary" onClick={() => makeCsv(orders, fm)}>Baixar planilha (CSV)</button>
          <button className="btn btn-outline-danger" onClick={clearMonth}>Limpar pedidos deste mês</button>
        </div>
      </div>

      <div className="card p-3 mb-3">
        <h3 className="h5">🔑 Alterar login e senha da administração</h3>
        <div className="row g-2">
          <div className="col-12 col-md-6"><label className="form-label fw-bold">Novo login</label><input className="form-control" value={cred.login} onChange={(e) => setCred({ ...cred, login: e.target.value })} /></div>
          <div className="col-12 col-md-6"><label className="form-label fw-bold">Nova senha (mín. 6)</label><input className="form-control" type="password" value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} /></div>
        </div>
        <div className="d-flex gap-2 mt-3 flex-wrap">
          <button className="btn btn-primary" onClick={() => run(() => call('setAdmin', cred, true).then(() => setCred({ login: '', password: '' })), 'Novo acesso salvo.')}>Salvar novo acesso</button>
          <button className="btn btn-outline-primary" onClick={onExit}>Sair da administração</button>
        </div>
      </div>
    </>
  );
}
