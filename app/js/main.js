// Leonida Platinum Atlas — boot and wiring. Loads app/data/trophies.json, renders
// the header, filters, checklist, detail pane and tab panes, and wires every
// control (tabs, filters, search with the "/" shortcut, spoiler toggle, counters,
// notes, export/import, print). Offline: the only fetch is the local data file.
import { loadState, saveState, toggleEarned, setCounter, counterOf, isEarned,
  exportState, importState, KINDS, STAGES, GRADE_ORDER } from './store.js';
import * as V from './views.js';

const $ = (sel) => document.querySelector(sel);
const state = loadState();
let data = null;

function gradeCounts() {
  const out = {};
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const list = data.trophies.filter((t) => t.grade === g);
    out[g] = [list.filter((t) => isEarned(state, t.id)).length, list.length];
  }
  return out;
}

function renderHeader() {
  const total = data.trophies.length;
  const earned = state.earned.length;
  const pct = Math.round((earned / total) * 100);
  $('#earnedBig').textContent = `${earned}/${total}`;
  $('#earnedPct').textContent = `${pct}% · ${total - earned} to go`;
  $('#earnedBar').style.width = `${pct}%`;
  const gc = gradeCounts();
  $('#gradeChips').innerHTML = ['platinum', 'gold', 'silver', 'bronze'].map((g) =>
    `<span>${V.medal(g)}<b>${gc[g][0]}/${gc[g][1]}</b> ${V.gradeLabel(g)}</span>`).join('');
  const hiddenLeft = data.trophies.filter((t) => t.hidden && !isEarned(state, t.id)).length;
  const btn = $('#spoilerBtn');
  btn.textContent = state.spoilers ? `Spoilers hidden · ${hiddenLeft}` : 'Spoilers shown';
  btn.classList.toggle('on', state.spoilers);
  const cited = data.trophies.filter((t) => t.sources && t.sources.length).length;
  $('#auditBar').innerHTML = `<b>SELF-AUDIT</b> · ${total}/${total} trophies · ${total}/${total} guides · ${cited}/${total} cited · ${data.meta.hidden_total}/${data.meta.hidden_total} hidden · ${data.meta.missable_total} missable · ${data.meta.unconfirmed_total} unconfirmed — listed honestly · Sources retrieved ${data.meta.sources_retrieved}`;
  $('#footSources').innerHTML = data.sources.map((s) =>
    `[${s.ref}] <a href="${V.esc(s.url)}" target="_blank" rel="noopener" style="color:#8ff0e2">${V.esc(s.name)}</a>`).join(' · ');
}

function renderStrip() {
  $('#roadmapStrip').innerHTML = Object.keys(STAGES).map((s) => {
    const list = data.trophies.filter((t) => t.stage === Number(s));
    const e = list.filter((t) => isEarned(state, t.id)).length;
    const pct = Math.round((e / list.length) * 100);
    return `<button type="button" class="stage-mini" data-action="goto-roadmap" data-stage="${s}">
      <b>S${s} · ${V.esc(STAGES[s].title.replace(/^Stage \d · /, ''))}</b>
      <span class="bar"><i style="width:${pct}%"></i></span>
      <span>${e}/${list.length} earned</span></button>`;
  }).join('');
}

function renderChips() {
  const chips = [{ k: 'all', label: 'All', n: data.trophies.length, e: state.earned.length },
    ...KINDS.filter(([k]) => k !== 'online').map(([k, label]) => {
      const list = data.trophies.filter((t) => t.kind === k);
      return { k, label, n: list.length, e: list.filter((t) => isEarned(state, t.id)).length };
    }),
    { k: 'missable', label: 'Missable', n: data.trophies.filter((t) => t.missable).length,
      e: data.trophies.filter((t) => t.missable && isEarned(state, t.id)).length },
    { k: 'online', label: 'Online', n: 0, e: 0 }];
  $('#kindChips').innerHTML = chips.map((c) =>
    `<button type="button" data-kind="${c.k}" class="${state.kind === c.k ? 'active' : ''}">${V.esc(c.label)} ${c.e}/${c.n}</button>`).join('');
}

function filtered() {
  let list = [...data.trophies];
  if (state.kind === 'missable') list = list.filter((t) => t.missable);
  else if (state.kind !== 'all') list = list.filter((t) => t.kind === state.kind);
  if (state.grade !== 'all') list = list.filter((t) => t.grade === state.grade);
  if (state.show === 'todo') list = list.filter((t) => !isEarned(state, t.id));
  if (state.show === 'earned') list = list.filter((t) => isEarned(state, t.id));
  const q = state.query.trim().toLowerCase();
  if (q) {
    list = list.filter((t) => [t.name, t.description, t.guide, (t.steps || []).join(' ')]
      .join(' ').toLowerCase().includes(q));
  }
  if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === 'grade') list.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else if (state.sort === 'difficulty') list.sort((a, b) => b.difficulty - a.difficulty || a.id - b.id);
  else list.sort((a, b) => a.stage - b.stage || a.id - b.id);
  return list;
}

function renderList() {
  const list = filtered();
  const earnedShown = list.filter((t) => isEarned(state, t.id)).length;
  const parts = [];
  if (state.kind !== 'all' || state.grade !== 'all' || state.show !== 'all' || state.query.trim()) parts.push('filtered');
  $('#listHeadText').textContent = `${list.length} of ${data.trophies.length} shown · ${earnedShown} earned${parts.length ? ' · ' + parts.join(', ') : ' · no filter'} · Order: ${state.sort === 'roadmap' ? 'Roadmap' : state.sort}`;
  if (!list.length) {
    $('#list').innerHTML = '<p class="empty">No trophies match these filters. Clear the search or pick another kind.</p>';
    return;
  }
  if (state.sort === 'roadmap') {
    let html = '';
    for (const s of Object.keys(STAGES)) {
      const group = list.filter((t) => t.stage === Number(s));
      if (!group.length) continue;
      const e = group.filter((t) => isEarned(state, t.id)).length;
      html += `<div class="stage-head"><h2>Stage ${s} · ${V.esc(STAGES[s].title.replace(/^Stage \d · /, ''))}</h2><span>${e}/${group.length} earned</span></div>`;
      html += group.map((t) => V.trophyRow(state, t)).join('');
    }
    $('#list').innerHTML = html;
  } else {
    $('#list').innerHTML = list.map((t) => V.trophyRow(state, t)).join('');
  }
}

function renderDetail() {
  const t = data.trophies.find((x) => x.id === state.selected) || data.trophies[0];
  $('#detailPane').innerHTML = V.detailHtml(data, state, t);
}

function renderTabs() {
  document.querySelectorAll('#tabs button[data-tab]').forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === state.tab));
  const isChecklist = state.tab === 'checklist';
  $('#main').hidden = !isChecklist;
  $('#filters').style.display = isChecklist ? '' : 'none';
  $('#roadmapStrip').style.display = isChecklist ? '' : 'none';
  const pane = $('#tabPane');
  if (isChecklist) { pane.hidden = true; return; }
  pane.hidden = false;
  pane.innerHTML = state.tab === 'roadmap' ? V.roadmapHtml(data, state)
    : state.tab === 'missables' ? V.missablesHtml(data, state)
    : state.tab === 'nextup' ? V.nextupHtml(data, state)
    : V.progressHtml(data, state);
}

function renderAll() {
  renderHeader(); renderStrip(); renderChips(); renderList(); renderDetail(); renderTabs();
}

function selectTrophy(id, { focusDetail = false } = {}) {
  state.selected = id;
  saveState(state);
  renderList(); renderDetail();
  if (focusDetail) $('#detailPane').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('#tabs button[data-tab]');
  if (tabBtn) { state.tab = tabBtn.dataset.tab; saveState(state); renderTabs(); return; }
  const chip = e.target.closest('#kindChips button[data-kind]');
  if (chip) { state.kind = chip.dataset.kind; saveState(state); renderChips(); renderList(); return; }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id ? Number(el.dataset.id) : null;
  if (action === 'select') {
    if (state.tab !== 'checklist') { state.tab = 'checklist'; renderTabs(); }
    selectTrophy(id);
  } else if (action === 'toggle') {
    toggleEarned(state, id);
    renderHeader(); renderStrip(); renderChips(); renderList(); renderDetail();
    if (state.tab !== 'checklist') renderTabs();
  } else if (action === 'counter-inc' || action === 'counter-dec') {
    const t = data.trophies.find((x) => x.id === id);
    setCounter(state, id, counterOf(state, t) + (action === 'counter-inc' ? 1 : -1), t.target.total);
    renderDetail(); renderList();
  } else if (action === 'reveal') {
    state.spoilers = false; saveState(state); renderAll();
  } else if (action === 'prev' || action === 'next') {
    const ordered = [...data.trophies].sort((a, b) => a.stage - b.stage || a.id - b.id);
    const i = ordered.findIndex((x) => x.id === state.selected);
    const n = ordered[(i + (action === 'next' ? 1 : -1) + ordered.length) % ordered.length];
    selectTrophy(n.id);
  } else if (action === 'goto-roadmap') {
    state.tab = 'roadmap'; saveState(state); renderTabs();
  } else if (action === 'export') {
    download('leonida-platinum-atlas-progress.json', exportState(state));
  } else if (action === 'print') {
    window.print();
  } else if (action === 'reset') {
    if (confirm('Reset all progress, counters and notes?')) {
      state.earned = []; state.counters = {}; state.notes = {};
      saveState(state); renderAll();
    }
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.id === 'gradeSel') { state.grade = e.target.value; saveState(state); renderList(); }
  if (e.target.id === 'earnedSel') { state.show = e.target.value; saveState(state); renderList(); }
  if (e.target.id === 'sortSel') { state.sort = e.target.value; saveState(state); renderList(); }
  if (e.target.id === 'importFile' || e.target.dataset.action === 'import') {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try { importState(state, await file.text()); renderAll(); }
    catch { alert('That file is not a Leonida Platinum Atlas progress export.'); }
    e.target.value = '';
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'searchInput') { state.query = e.target.value; renderList(); }
  if (e.target.classList && e.target.classList.contains('note-area')) {
    state.notes[Number(e.target.dataset.note)] = e.target.value;
    saveState(state);
  }
});

$('#spoilerBtn').addEventListener('click', () => {
  state.spoilers = !state.spoilers; saveState(state); renderAll();
});
$('#exportBtn').addEventListener('click', () => download('leonida-platinum-atlas-progress.json', exportState(state)));
$('#bannerShow').addEventListener('click', () => {
  state.tab = 'checklist'; renderTabs(); selectTrophy(28, { focusDetail: true });
});

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  if (e.key === '/' && !typing) { e.preventDefault(); $('#searchInput').focus(); }
  if (e.key === 'Escape' && document.activeElement === $('#searchInput')) $('#searchInput').blur();
});

const res = await fetch('data/trophies.json');
data = await res.json();
renderAll();
window.__shotReady = true;
