import pg from "pg";
import { SOURCE_PAGES, readSourcePage } from "./source-pages.js";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://casaestampa:casaestampa@localhost:5432/casaestampa";

const pool = new Pool({
  connectionString,
  max: 10
});

let ready;

export async function dbQuery(text, params = []) {
  await ensureDatabase();
  return pool.query(text, params);
}

export async function ensureDatabase() {
  if (!ready) {
    ready = initializeDatabase();
  }
  return ready;
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      slug text PRIMARY KEY,
      title text NOT NULL,
      html text NOT NULL,
      original_html text NOT NULL,
      is_home boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id bigserial PRIMARY KEY,
      filename text NOT NULL,
      public_path text NOT NULL,
      mime_type text NOT NULL,
      size_bytes integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await seedPages();
  await pool.query(
    `INSERT INTO settings (key, value)
     VALUES ('global', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [
      JSON.stringify({
        css: "",
        primaryColor: "#c2a57a",
        accentColor: "#c8960c",
        fontFamily: "Montserrat"
      })
    ]
  );
}

async function seedPages() {
  for (const page of SOURCE_PAGES) {
    const html = await readSourcePage(page);
    await pool.query(
      `INSERT INTO pages (slug, title, html, original_html, is_home)
       VALUES ($1, $2, $3, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [page.slug, page.title, html, Boolean(page.home)]
    );
  }
}

export async function getSettings() {
  const result = await dbQuery("SELECT value FROM settings WHERE key = 'global'");
  return result.rows[0]?.value || {};
}

export async function getPageBySlug(slug) {
  const result = await dbQuery(
    "SELECT slug, title, html, original_html, is_home, updated_at FROM pages WHERE slug = $1",
    [slug]
  );
  return result.rows[0] || null;
}

export async function getHomePage() {
  const result = await dbQuery(
    "SELECT slug, title, html, original_html, is_home, updated_at FROM pages WHERE is_home = true LIMIT 1"
  );
  return result.rows[0] || getPageBySlug("amorim");
}

export async function listPages() {
  const result = await dbQuery(
    "SELECT slug, title, is_home, updated_at FROM pages ORDER BY is_home DESC, title ASC"
  );
  return result.rows;
}

export function renderHtml(html, settings = {}) {
  const globalCss = buildGlobalCss(settings);
  if (!globalCss.trim()) return html;
  const tag = `<style id="casa-estampa-global-overrides">${globalCss}</style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${tag}\n</head>`);
  }
  return `${tag}\n${html}`;
}

function buildGlobalCss(settings) {
  const rules = [];
  const root = [];
  if (settings.primaryColor) root.push(`--fendi:${settings.primaryColor};`);
  if (settings.accentColor) root.push(`--mustard:${settings.accentColor};`);
  if (settings.fontFamily) {
    rules.push(`body{font-family:'${String(settings.fontFamily).replaceAll("'", "")}',sans-serif;}`);
  }
  if (root.length) rules.push(`:root{${root.join("")}}`);
  if (settings.css) rules.push(settings.css);
  return rules.join("\n");
}
