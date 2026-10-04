import { sql, ensure, checkEnv, bcrypt, sign, who } from './_lib.js';
import { BASE } from './_catalog.js';

const TEAMS = ['EVA', 'VIVA', 'ED', 'BANCAR', 'DEV'];
const CATS = ['doces', 'sobremesas', 'lanches', 'bebidas'];
const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex'];

const bad = (m, s = 400) => { throw Object.assign(new Error(m), { status: s }); };
const needUser = (u) => u?.role === 'user' || bad('Faça login para continuar', 401);
const needAdm = (u) => u?.role === 'admin' || bad('Acesso restrito à administração', 403);
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
const pubUser = (r) => ({ phone: r.phone, name: r.name, team: r.team, photo: r.photo });
const money = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

const actions = {
  /* ---------- usuário ---------- */
  async register(b) {
    const phone = onlyDigits(b.phone), name = String(b.name || '').trim();
    if (!name || phone.length < 10 || !TEAMS.includes(b.team) || String(b.password || '').length < 6)
      bad('Preencha nome, número, equipe e senha (mín. 6 caracteres).');
    if ((await sql`select 1 from users where phone=${phone}`).length) bad('Esse número já está cadastrado.');
    const hash = await bcrypt.hash(b.password, 10);
    const photo = String(b.photo || '').slice(0, 200000);
    await sql`insert into users(phone,name,team,photo,hash) values(${phone},${name},${b.team},${photo},${hash})`;
    return { token: sign({ role: 'user', phone }), user: { phone, name, team: b.team, photo } };
  },
  async login(b) {
    const [r] = await sql`select * from users where phone=${onlyDigits(b.phone)}`;
    if (!r || !(await bcrypt.compare(String(b.password || ''), r.hash))) bad('Número ou senha incorretos.', 401);
    return { token: sign({ role: 'user', phone: r.phone }), user: pubUser(r) };
  },
  async me(b, u) {
    needUser(u);
    const [r] = await sql`select * from users where phone=${u.phone}`;
    if (!r) bad('Sessão inválida', 401);
    return { user: pubUser(r) };
  },
  async setPassword(b, u) {
    needUser(u);
    if (String(b.password || '').length < 6) bad('Mínimo 6 caracteres.');
    await sql`update users set hash=${await bcrypt.hash(b.password, 10)} where phone=${u.phone}`;
  },
  async myOrders(b, u) {
    needUser(u);
    const rows = await sql`select id, items, total, extract(epoch from created_at)*1000 as ts from orders where phone=${u.phone} order by created_at desc limit 500`;
    return { orders: rows.map((r) => ({ ...r, total: +r.total, ts: +r.ts })) };
  },

  /* ---------- loja ---------- */
  async catalog(b, u) {
    if (!u) bad('Faça login para continuar', 401);
    const [semeado] = await sql`select 1 from settings where key='seeded'`;
    if (!semeado) { // primeira vez: carrega a lista de produtos inicial
      await sql`insert into products(cat,name,price) select * from unnest(${BASE.map((x) => x.cat)}::text[], ${BASE.map((x) => x.name)}::text[], ${BASE.map((x) => x.price)}::numeric[])`;
      await sql`insert into settings(key,value) values('seeded','true') on conflict do nothing`;
    }
    const products = (await sql`select id,cat,name,price,photo,novo, extract(epoch from created_at)*1000 as ts from products order by id`)
      .map((r) => ({ ...r, price: +r.price, ts: +r.ts }));
    const week = (await sql`select day,name,price,photo from week`).map((r) => ({ ...r, price: +r.price }));
    return { products, week };
  },
  async order(b, u) {
    needUser(u);
    const req = (Array.isArray(b.items) ? b.items : []).slice(0, 60);
    if (!req.length) bad('Carrinho vazio.');
    const ids = req.map((i) => +i.id).filter(Number.isInteger);
    const P = ids.length ? await sql`select id,name,price from products where id = any(${ids})` : [];
    const W = await sql`select day,name,price from week`;
    const items = req.map((i) => {
      const q = Math.min(50, Math.max(1, parseInt(i.q) || 1));
      const p = String(i.id).startsWith('w:') ? W.find((x) => 'w:' + x.day === i.id) : P.find((x) => x.id === +i.id);
      if (!p) bad('Um item do carrinho saiu da loja. Atualize e tente de novo.');
      return { n: p.name, p: +p.price, q }; // preço vem do banco, nunca do navegador
    });
    const total = money(items.reduce((s, i) => s + i.p * i.q, 0));
    const [usr] = await sql`select name,team from users where phone=${u.phone}`;
    await sql`insert into orders(phone,name,team,items,total) values(${u.phone},${usr.name},${usr.team},${JSON.stringify(items)}::jsonb,${total})`;
  },

  /* ---------- administração ---------- */
  async adminLogin(b) {
    const login = String(b.login || ''), pw = String(b.password || '');
    const [r] = await sql`select value from settings where key='admin'`;
    let ok = false;
    if (r) {
      ok = r.value.login === login && (await bcrypt.compare(pw, r.value.hash));
    } else if (pw && login === process.env.ADMIN_LOGIN && pw === process.env.ADMIN_PASSWORD) {
      ok = true; // primeiro acesso: usa as variáveis da Vercel e guarda a senha criptografada
      await sql`insert into settings(key,value) values('admin',${JSON.stringify({ login, hash: await bcrypt.hash(pw, 10) })}::jsonb) on conflict do nothing`;
    }
    if (!ok) bad('Login ou senha incorretos.', 401);
    return { token: sign({ role: 'admin' }, '12h') };
  },
  async setAdmin(b, u) {
    needAdm(u);
    const login = String(b.login || '').trim();
    if (!login || String(b.password || '').length < 6) bad('Informe login e senha (mín. 6).');
    const v = JSON.stringify({ login, hash: await bcrypt.hash(b.password, 10) });
    await sql`insert into settings(key,value) values('admin',${v}::jsonb) on conflict (key) do update set value=excluded.value`;
  },
  async adminOrders(b, u) {
    needAdm(u);
    const rows = await sql`select id,phone,name,team,items,total, extract(epoch from created_at)*1000 as ts from orders order by created_at desc limit 3000`;
    return { orders: rows.map((r) => ({ ...r, total: +r.total, ts: +r.ts })) };
  },
  async deleteOrder(b, u) { needAdm(u); await sql`delete from orders where id=${+b.id}`; },
  async clearMonth(b, u) {
    needAdm(u);
    if (!/^\d{4}-\d{2}$/.test(b.month)) bad('Mês inválido.');
    await sql`delete from orders where to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM') = ${b.month}`;
  },
  async addProduct(b, u) {
    needAdm(u);
    const name = String(b.name || '').trim();
    if (!CATS.includes(b.cat) || !name || !(+b.price >= 0)) bad('Informe categoria, nome e valor.');
    await sql`insert into products(cat,name,price,photo,novo) values(${b.cat},${name},${money(b.price)},${String(b.photo || '').slice(0, 200000)},true)`;
  },
  async removeProduct(b, u) { // remoção de verdade: apaga a linha do banco
    needAdm(u);
    const [r] = await sql`delete from products where id=${+b.id} returning name`;
    if (!r) bad('Produto não encontrado (talvez já removido).', 404);
    return { name: r.name };
  },
  async saveWeek(b, u) {
    needAdm(u);
    await sql`delete from week`;
    for (const d of DAYS) {
      const w = b.days?.[d];
      if (w?.name) await sql`insert into week(day,name,price,photo) values(${d},${String(w.name).trim()},${money(w.price)},${String(w.photo || '').slice(0, 200000)})`;
    }
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    checkEnv();
    await ensure();
    const { action, ...body } = req.body || {};
    if (!actions[action]) bad('Ação inválida');
    res.status(200).json((await actions[action](body, who(req))) ?? { ok: true });
  } catch (e) {
    if (!e.status) console.error(e);
    // sem status = erro inesperado: mostra o motivo para facilitar achar o problema
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Erro no servidor: ' + String(e.message).slice(0, 140) });
  }
}
