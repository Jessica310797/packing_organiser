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
const LEVELS = { pg: 0, "adults only": 1, unhinged: 2, light: 0, mild: 0, cheeky: 1, spicy: 1, spicey: 1, sickening: 2 };

async function readCards(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("Cards") || wb.worksheets[0];
  const text = v => (v && typeof v === "object" ? (v.text ?? v.result ?? (v.richText || []).map(r => r.text).join("")) : v ?? "").toString().trim();
  const cards = [], problems = [], seen = new Set();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const [word, cat, lvl, tags] = [1, 2, 3, 4].map(i => text(row.getCell(i).value));
    if (!word && !cat && !lvl) return;
    const c = cat.toLowerCase(), l = lvl.toLowerCase();
    if (!word) return problems.push(`row ${n}: no word`);
    if (!CATEGORIES.includes(c)) return problems.push(`row ${n}: unknown category "${cat}"`);
    if (!(l in LEVELS)) return problems.push(`row ${n}: unknown level "${lvl}"`);
    if (word.length > 60) return problems.push(`row ${n}: "${word}" is over 60 characters`);
    const key = c + ":" + word.toLowerCase();
    if (seen.has(key)) return problems.push(`row ${n}: "${word}" is already in ${cat}`);
    seen.add(key);
    cards.push({ word, cat: c, lvl: LEVELS[l], tags: tags.toLowerCase().split(/[\s,]+/).filter(Boolean).sort() });
  });
  return { cards, problems };
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
    const json = JSON.stringify(cards.map(c => [c.word, c.cat, c.lvl, c.tags])).replace(/<\//g, "<\\/");
    page = page.replace(/\/\* BANK_JSON:start \*\/[\s\S]*?\/\* BANK_JSON:end \*\//,
      () => `/* BANK_JSON:start */const BANK_JSON = ${json};/* BANK_JSON:end */`);
    fs.writeFileSync(pagePath, page);
    console.log(`Loaded ${cards.length} cards from cards.xlsx${problems.length ? ` (skipped ${problems.length} rows)` : ""}`);
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
