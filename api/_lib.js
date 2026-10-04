import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const URL_DB = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = neon(URL_DB || 'postgresql://sem:sem@localhost/sem'); // evita travar na carga; checkEnv() avisa o que falta

// Diz com clareza o que está faltando na Vercel
export const checkEnv = () => {
  const falta = (m) => Object.assign(new Error(m), { status: 500 });
  if (!URL_DB) throw falta('Falta a variável DATABASE_URL: conecte o banco Neon ao projeto na Vercel e faça Redeploy.');
  if (!process.env.JWT_SECRET) throw falta('Falta a variável JWT_SECRET na Vercel: crie em Settings > Environment Variables e faça Redeploy.');
};
export { bcrypt };

// Tabelas criadas automaticamente na primeira chamada (não precisa rodar SQL na mão)
const TABELAS = [
  `create table if not exists users(phone text primary key, name text not null, team text not null, photo text default '', hash text not null, created_at timestamptz default now())`,
  `create table if not exists products(id serial primary key, cat text not null, name text not null, price numeric(8,2) not null, photo text default '', novo boolean default false, created_at timestamptz default now())`,
  `create table if not exists orders(id serial primary key, phone text not null, name text not null, team text not null, items jsonb not null, total numeric(10,2) not null, created_at timestamptz default now())`,
  `create table if not exists week(day text primary key, name text, price numeric(8,2), photo text default '')`,
  `create table if not exists settings(key text primary key, value jsonb)`,
];
let pronto;
export const ensure = () => (pronto ??= (async () => { for (const t of TABELAS) await sql.query(t); })());

export const sign = (payload, exp = '30d') => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: exp });
export const who = (req) => {
  try { return jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); }
  catch { return null; }
};
