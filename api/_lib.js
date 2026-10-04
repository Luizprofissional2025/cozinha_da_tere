import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const sql = neon(process.env.DATABASE_URL);
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
