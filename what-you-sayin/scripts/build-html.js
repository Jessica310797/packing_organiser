// Builds the game the app loads:
//  1. reads the card bank from cards.xlsx (if it's there) and writes it into web/index.html
//  2. wraps web/index.html into a full HTML document with the logo images inlined
//  3. writes that to src/gameHtml.ts
// Run after editing cards.xlsx or anything in web/:  npm run build-html
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const root = path.join(__dirname, "..");
const pagePath = path.join(root, "web", "index.html");
const CATEGORIES = ["object", "person", "place", "world", "action", "nature", "random"];
// PG, Adults Only, Unhinged. The older four level names still work: Sickening counts as Unhinged.
const ALIASES = { people: "person", actions: "action", places: "place", objects: "object" };
const LEVELS = { pg: 0, "adults only": 1, unhinged: 2, light: 0, mild: 0, cheeky: 1, spicy: 1, spicey: 1, sickening: 2 };

async function readCards(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("Cards") || wb.worksheets[0];
  const text = v => (v && typeof v === "object" ? (v.text ?? v.result ?? (v.richText || []).map(r => r.text).join("")) : v ?? "").toString().trim();
  const cards = [], problems = [], seen = new Set();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const [word, cat, lvl, tags, quality, overlaps] = [1, 2, 3, 4, 5, 6].map(i => text(row.getCell(i).value));
    if (!word && !cat && !lvl) return;
    const c = ALIASES[cat.toLowerCase()] || cat.toLowerCase(), l = lvl.toLowerCase();
    if (!word) return problems.push(`row ${n}: no word`);
    if (!CATEGORIES.includes(c)) return problems.push(`row ${n}: unknown category "${cat}"`);
    if (!(l in LEVELS)) return problems.push(`row ${n}: unknown level "${lvl}"`);
    if (word.length > 60) return problems.push(`row ${n}: "${word}" is over 60 characters`);
    const key = c + ":" + word.toLowerCase();
    if (seen.has(key)) return problems.push(`row ${n}: "${word}" is already in ${cat}`);
    seen.add(key);
    const q = quality === "" ? 1 : Number(quality);
    if (![1, 1.5, 2].includes(q)) return problems.push(`row ${n}: quality "${quality}" isn't 1, 1.5 or 2`);
    cards.push({ word, cat: c, lvl: LEVELS[l], tags: tags.toLowerCase().split(/[\s,]+/).filter(Boolean).sort(), q, overlaps });
  });
  return { cards, problems };
}

// Cards that mustn't be dealt in the same game: ones listed in each other's Overlaps,
// and the same card in two categories. Each group gets a number; 0 means no group.
const looseKey = w => w.toLowerCase().replace(/[\u2018\u2019]/g, "'").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim().replace(/^(a|an|the) /, "");
function overlapGroups(cards) {
  const parent = cards.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a, b) => { parent[find(a)] = find(b); };
  const byKey = new Map();
  cards.forEach((c, i) => { const k = looseKey(c.word); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(i); });
  for (const list of byKey.values()) list.slice(1).forEach(i => join(i, list[0]));
  cards.forEach((c, i) => c.overlaps.split(/[,/]/).map(x => looseKey(x)).filter(Boolean)
    .forEach(k => (byKey.get(k) || []).forEach(j => join(i, j))));
  const size = new Map(), ids = new Map();
  cards.forEach((_, i) => size.set(find(i), (size.get(find(i)) || 0) + 1));
  return cards.map((_, i) => {
    const r = find(i);
    if (size.get(r) < 2) return 0;
    if (!ids.has(r)) ids.set(r, ids.size + 1);
    return ids.get(r);
  });
}

async function readTeamNames(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("Team names") || wb.worksheets[0];
  const text = v => (v && typeof v === "object" ? (v.text ?? v.result ?? (v.richText || []).map(r => r.text).join("")) : v ?? "").toString().trim();
  const names = [], problems = [], seen = new Set();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const name = text(row.getCell(1).value), lvl = text(row.getCell(2).value).toLowerCase();
    if (!name && !lvl) return;
    if (!name) return problems.push(`row ${n}: no name`);
    if (name.length > 30) return problems.push(`row ${n}: "${name}" is over 30 characters`);
    if (!(lvl in LEVELS)) return problems.push(`row ${n}: unknown level "${lvl}"`);
    if (seen.has(name.toLowerCase())) return problems.push(`row ${n}: "${name}" is a duplicate`);
    seen.add(name.toLowerCase());
    names.push([name, LEVELS[lvl]]);
  });
  return { names, problems };
}

async function main() {
  let page = fs.readFileSync(pagePath, "utf8");

  const xlsx = path.join(root, "cards.xlsx");
  if (fs.existsSync(xlsx)) {
    const { cards, problems } = await readCards(xlsx);
    problems.forEach(p => console.warn("Skipped " + p));
    if (!cards.length) throw new Error("cards.xlsx has no usable cards, so nothing was changed.");
    const groups = overlapGroups(cards);
    const json = JSON.stringify(cards.map((c, i) => [c.word, c.cat, c.lvl, c.tags, c.q, groups[i]])).replace(/<\//g, "<\\/");
    page = page.replace(/\/\* BANK_JSON:start \*\/[\s\S]*?\/\* BANK_JSON:end \*\//,
      () => `/* BANK_JSON:start */const BANK_JSON = ${json};/* BANK_JSON:end */`);
    fs.writeFileSync(pagePath, page);
    console.log(`Loaded ${cards.length} cards from cards.xlsx${problems.length ? ` (skipped ${problems.length} rows)` : ""}`);
    console.log(`  ${cards.filter(c => c.q >= 1.5).length} are ranked 1.5 or 2 for full games; ${new Set(groups.filter(Boolean)).size} groups of overlapping cards`);
  }

  const teamXlsx = path.join(root, "team-names.xlsx");
  if (fs.existsSync(teamXlsx)) {
    const { names, problems } = await readTeamNames(teamXlsx);
    problems.forEach(p => console.warn("Skipped team name " + p));
    if (!names.length) throw new Error("team-names.xlsx has no usable names, so nothing was changed.");
    page = page.replace(/\/\* TEAM_NAMES:start \*\/[\s\S]*?\/\* TEAM_NAMES:end \*\//,
      `/* TEAM_NAMES:start */const TEAM_NAMES = ${JSON.stringify(names)};/* TEAM_NAMES:end */`);
    fs.writeFileSync(pagePath, page);
    console.log(`Loaded ${names.length} team names from team-names.xlsx${problems.length ? ` (skipped ${problems.length} rows)` : ""}`);
  }

  page = page.replace(/src="(img\/[\w.-]+\.png)"/g, (_, file) => {
    const data = fs.readFileSync(path.join(root, "web", file)).toString("base64");
    return `src="data:image/png;base64,${data}"`;
  });

  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>${page}</body></html>`;

  const out = `// Generated by scripts/build-html.js from web/index.html. Don't edit by hand.\nexport default ${JSON.stringify(html)};\n`;
  fs.writeFileSync(path.join(root, "src", "gameHtml.ts"), out);
  console.log(`Wrote src/gameHtml.ts (${Math.round(out.length / 1024)} KB)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
