#!/usr/bin/env node
// Statusline de Claude Code: muestra el contexto consumido en tokens absolutos.
// Umbrales ABSOLUTOS (ver ARRANQUE_AGENTE_NUBE.md §1):
//   ≥ 200k → amarillo «⚠ 200k: documentar»
//   ≥ 300k → rojo «⛔ BITÁCORA + /clear»
'use strict';

const YELLOW_AT = 200_000;
const RED_AT = 300_000;

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function usedTokens(cw) {
  if (!cw || typeof cw !== 'object') return null;
  const size = Number(cw.context_window_size);
  const pct = Number(cw.used_percentage);
  if (Number.isFinite(size) && size > 0 && Number.isFinite(pct)) {
    return { used: Math.round((pct / 100) * size), pct };
  }
  const u = cw.current_usage;
  if (u && typeof u === 'object') {
    const used =
      (Number(u.input_tokens) || 0) +
      (Number(u.cache_creation_input_tokens) || 0) +
      (Number(u.cache_read_input_tokens) || 0) +
      (Number(u.output_tokens) || 0);
    const p = Number.isFinite(size) && size > 0 ? (used / size) * 100 : null;
    return { used, pct: p };
  }
  return null;
}

// Crédito de la sesión: coste acumulado que informa Claude Code (USD) pasado a
// euros con un cambio aproximado y comparado con el presupuesto. Se guarda en
// .claude/.coste-sesion.json para que el agente pueda leerlo y reportarlo.
const BUDGET_EUR = Number(process.env.DK_PRESUPUESTO_EUR) || 100;
const USD_TO_EUR = Number(process.env.DK_USD_EUR) || 0.9;

function creditText(cost) {
  const usd = Number(cost && cost.total_cost_usd);
  if (!Number.isFinite(usd)) return '';
  const eur = usd * USD_TO_EUR;
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    fs.writeFileSync(
      path.join(dir, '.claude', '.coste-sesion.json'),
      JSON.stringify({ usd, eur, presupuesto_eur: BUDGET_EUR, actualizado: new Date().toISOString() })
    );
  } catch {
    /* sin permisos de escritura: solo se muestra */
  }
  return ` · ${eur.toFixed(2)}€/${BUDGET_EUR}€`;
}

function render(input) {
  let data = {};
  try {
    data = JSON.parse(input || '{}');
  } catch {
    /* JSON inválido: se muestra el estado desconocido */
  }
  const credit = creditText(data.cost);
  const r = usedTokens(data.context_window);
  if (!r) return `ctx ?${credit}`;

  const k = Math.round(r.used / 1000);
  const pctTxt = r.pct == null ? '?' : Math.round(r.pct);
  const base = `ctx ${pctTxt}% (${k}k)${credit}`;

  if (r.used >= RED_AT) return `${C.red}${base} ⛔ BITÁCORA + /clear${C.reset}`;
  if (r.used >= YELLOW_AT) return `${C.yellow}${base} ⚠ 200k: documentar${C.reset}`;
  return `${C.green}${base}${C.reset}`;
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (buf += chunk));
process.stdin.on('end', () => process.stdout.write(render(buf)));
