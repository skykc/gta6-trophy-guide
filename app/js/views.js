// Leonida Platinum Atlas — HTML builders for every view. Pure functions: they
// take the trophy data and the saved state and return HTML strings. main.js
// wires the events. Nothing here touches the network.
import { KINDS, STAGES, GRADE_ORDER, isEarned, counterOf } from './store.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function medal(grade) {
  return `<span class="medal ${grade}" title="${grade}"></span>`;
}

export function kindLabel(kind) {
  const found = KINDS.find(([k]) => k === kind);
  return found ? found[1] : kind;
}

export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

export function fmtNum(n) {
  return n.toLocaleString('en-US');
}

export function isHiddenFrom(state, t) {
  return state.spoilers && t.hidden && !isEarned(state, t.id);
}

export function displayName(state, t) {
  if (isHiddenFrom(state, t)) return t.kind === 'story' ? 'Hidden story trophy' : 'Hidden trophy';
  return t.name;
}

export function displayDesc(state, t) {
  if (isHiddenFrom(state, t)) return 'Earn this trophy to reveal its name and description.';
  return t.description;
}

export function dots(n) {
  return '●'.repeat(n) + '○'.repeat(5 - n);
}

function sourceLink(data, ref) {
  const s = data.sources.find((x) => x.ref === ref);
  if (!s) return '';
  return `<li>[${s.ref}] <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a> <span class="ret">— retrieved 19 Nov 2026</span></li>`;
}

function counterHtml(state, t) {
  if (!t.target) return '';
  const v = counterOf(state, t);
  const unit = t.target.unit === '$' ? '$' : '';
  const shown = unit ? unit + fmtNum(v) : fmtNum(v);
  const total = unit ? unit + fmtNum(t.target.total) : fmtNum(t.target.total);
  return `<div class="counter-row" data-counter="${t.id}">
    <button type="button" data-action="counter-dec" data-id="${t.id}" aria-label="Decrease">−</button>
    <span><strong>${shown}</strong> / ${total} ${esc(t.target.label)}</span>
    <button type="button" data-action="counter-inc" data-id="${t.id}" aria-label="Increase">+</button>
  </div>`;
}

export function trophyRow(state, t) {
  const earned = isEarned(state, t.id);
  const hidden = isHiddenFrom(state, t);
  const chips = [`<span class="chip">${esc(kindLabel(t.kind))}</span>`,
    `<span class="chip">S${t.stage}</span>`,
    t.missable ? '<span class="chip miss">Missable</span>' : '',
    hidden ? '<span class="chip hidden-t">Hidden</span>' : '',
    t.unconfirmed ? '<span class="chip unconf">Unconfirmed</span>' : '',
    (t.sources || []).length ? `<span class="chip src">Sources ${(t.sources || []).join('·')}</span>` : ''].join('');
  const counter = t.target
    ? `<span class="counter-badge">${counterOf(state, t)}/${fmtNum(t.target.total)} ${esc(t.target.label)}</span>` : '';
  return `<div class="trow${earned ? ' earned' : ''}${state.selected === t.id ? ' selected' : ''}"
      data-id="${t.id}" data-action="select" role="button" tabindex="0">
    <input type="checkbox" ${earned ? 'checked' : ''} data-action="toggle" data-id="${t.id}" aria-label="Mark ${esc(displayName(state, t))} earned">
    ${medal(t.grade)}
    <div class="tbody">
      <div class="tname">${esc(displayName(state, t))}${earned ? ' ✓' : ''}</div>
      <div class="tdesc">${esc(displayDesc(state, t))}</div>
      <div class="tmeta">${chips}</div>
    </div>
    ${counter}
  </div>`;
}

export function detailHtml(data, state, t) {
  if (!t) return '<p class="empty">Select a trophy to see its guide.</p>';
  const earned = isEarned(state, t.id);
  const hidden = isHiddenFrom(state, t);
  const tags = [`<span class="chip">${medal(t.grade)} ${gradeLabel(t.grade)}</span>`,
    `<span class="chip">${esc(kindLabel(t.kind))}</span>`,
    t.missable ? '<span class="chip miss">Missable</span>' : '',
    hidden ? '<span class="chip hidden-t">Hidden on PSN</span>' : '',
    t.unconfirmed ? '<span class="chip unconf">Unconfirmed</span>' : ''].join('');
  const next = nextTrophy(data, state, t);
  return `
  <h2>${esc(displayName(state, t))}</h2>
  <div class="dtags">${tags}</div>
  ${hidden ? `<p class="guide-text">This trophy is hidden on PlayStation until earned, and this guide hides story spoilers until then. Its name and description stay hidden here too.</p>
  <div class="detail-actions"><button type="button" class="ghost-btn" data-action="reveal">Reveal anyway</button></div>`
  : `
  <p class="dlabel">Official description · PlayStation</p>
  <p class="offdesc">&ldquo;${esc(t.description)}&rdquo;</p>
  ${t.missable && t.missable_note ? `<p class="dlabel">Missable: when and why</p><div class="miss-box"><b>Point of no return.</b> ${esc(t.missable_note)}</div>` : ''}
  ${t.unconfirmed && t.unconfirmed_note && !t.missable ? `<p class="dlabel">Not pinned down yet</p><div class="unconf-box"><b>Honest gap.</b> ${esc(t.unconfirmed_note)}</div>` : ''}
  <p class="dlabel">Steps</p>
  <ol class="steps">${(t.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  ${t.target ? `<p class="dlabel">Counter</p>${counterHtml(state, t)}` : ''}
  <p class="dlabel">Sources — where each fact comes from</p>
  <ol class="src-list">${(t.sources || []).map((r) => sourceLink(data, r)).join('')}</ol>
  <p class="dlabel">Where / how</p>
  <div class="facts"><span>Difficulty <b class="dots">${dots(t.difficulty)}</b> ${t.difficulty}/5</span><span>Time <b>${esc(t.time)}</b></span><span>Chapter <b>${esc(t.chapter)}</b></span></div>
  <p class="dlabel">Guide · in our words</p>
  <p class="guide-text">${esc(t.guide)}</p>
  <p class="dlabel">Your note</p>
  <textarea class="note-area" data-note="${t.id}" placeholder="Your own note for this trophy…">${esc(state.notes[t.id] || '')}</textarea>`}
  <div class="detail-actions">
    <button type="button" class="mark-btn" data-action="toggle" data-id="${t.id}">${earned ? '✓ Earned — unmark' : 'Mark earned'}</button>
    <button type="button" class="ghost-btn" data-action="prev">← Previous</button>
    <button type="button" class="ghost-btn" data-action="next">Next →</button>
  </div>
  ${next ? `<p class="next-line">Next up: <button type="button" data-action="select" data-id="${next.id}">#${next.id} ${esc(displayName(state, next))}</button> — Stage ${next.stage} — ${esc(next.chapter)}</p>` : ''}`;
}

export function nextTrophy(data, state, t) {
  const ordered = [...data.trophies].sort((a, b) => a.stage - b.stage || a.id - b.id);
  const i = ordered.findIndex((x) => x.id === t.id);
  for (let j = i + 1; j < ordered.length; j++) {
    if (!isEarned(state, ordered[j].id)) return ordered[j];
  }
  return ordered.find((x) => !isEarned(state, x.id)) || null;
}

export function stageCardHtml(data, state, stage) {
  const list = data.trophies.filter((t) => t.stage === stage);
  const earned = list.filter((t) => isEarned(state, t.id)).length;
  const pct = Math.round((earned / list.length) * 100);
  const meta = STAGES[stage];
  return `<div class="stage-card">
    <h3><span>S${stage}</span> · ${esc(meta.title.replace(/^Stage \d · /, ''))}</h3>
    <p>${esc(meta.blurb)}</p>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <p><b>${earned}/${list.length} earned</b> · ${esc(meta.time)}</p>
    <p class="names">${list.map((t) => (isEarned(state, t.id) ? '✓ ' : '') + esc(displayName(state, t))).join(' · ')}</p>
  </div>`;
}

export function roadmapHtml(data, state) {
  const cards = Object.keys(STAGES).map((s) => stageCardHtml(data, state, Number(s))).join('');
  return `<h2>Platinum roadmap — 7 stages to Vice Got a Price!</h2>
  <p class="lede">Built from the official descriptions: story first, then side strands, then activities and collectibles, then robberies, then the 100% cleanup. Difficulty 4/10, about 200 hours, one playthrough, no mission replay — keep a manual save at the start of each chapter (15 slots + 1 autosave). Cheats switch trophies and saving off, so keep them off on your trophy save.</p>
  <div class="plan">
    <div class="plan-step"><h3><b>Step 1</b> · Story + side missions</h3><p>60–80 hours. Finish the 5 chapters, do the optional missions as they appear, scan vehicles and study animals as you go. Do the Chapter 1 balcony meditation.</p></div>
    <div class="plan-step"><h3><b>Step 2</b> · 100% checklist</h3><p>About 100 hours. After the story the checklist opens under Progress &gt; Stats &gt; 100% Completion. Lenient — about 60% true completion; 70 of 80 challenges is enough.</p></div>
    <div class="plan-step"><h3><b>Step 3</b> · Strangers &amp; cleanup</h3><p>About 10 hours. The stranger strands are not needed for 100%, so clean them up last, then anything left over.</p></div>
  </div>
  <div class="stage-cards">${cards}</div>`;
}

export function missablesHtml(data, state) {
  const pma = data.trophies.find((t) => t.id === 28);
  return `<h2>Missables — 1 trophy can be missed</h2>
  <p class="lede">PowerPyx and GTABase both flag exactly one trophy as potentially missable. Everything else stays available after the story in free-roam.</p>
  <div class="watch"><h3>⚠ ${esc(pma.name)} — the only missable trophy</h3>
  <p>${esc(pma.missable_note || '')}</p>
  <p><b>What to do:</b> after Down to Earth in Chapter 1, talk to Lucia in the kitchen in the morning, follow her to the balcony and accept the meditation. Then keep a manual Chapter 1 save until this trophy pops.</p>
  <p><b>Honest gap:</b> ${esc(pma.unconfirmed_note || '')}</p></div>
  <div class="watch"><h3>Time-sensitive — do these the moment they appear</h3>
  <ul><li><b>Race Against Yago</b> (Chapter 3, Yago's street-racing strand): hourglass icon — the strand counts toward Strangers &amp; Freaks. Save first, then race.</li>
  <li><b>Optional missions with hourglass icons</b> can fail after a while, but they are not needed for trophies — there are far more than the 100 the checklist wants.</li></ul></div>
  <div class="watch"><h3>Not missable — do not worry about these</h3>
  <ul><li>Quest givers who go quiet mid-story (Kenton, for example) come back later; all trophy-related characters are available again after the story.</li>
  <li>Some fences disappear permanently, but new ones unlock — no trophy needs a lost fence.</li>
  <li>A few magazine collectibles sit in story buildings that close, but they also spawn elsewhere and no trophy needs all of them.</li>
  <li>There is no mission replay and no New Game+, so keep one save at the start of each chapter and one before the final mission.</li></ul></div>`;
}

export function nextupHtml(data, state) {
  const ordered = [...data.trophies].sort((a, b) => a.stage - b.stage || a.id - b.id);
  const todo = ordered.filter((t) => !isEarned(state, t.id)).slice(0, 6);
  const why = {
    4: 'Story first — the next chapter trophy in Stage 1.',
    28: 'Do the Chapter 1 meditation NOW, before the chapter ends — the only missable trophy.',
    5: 'Next chapter trophy after Chapter 2.',
    20: 'Cal’s fishing questline opens in Chapter 1 — quick win while you are there.',
    21: 'Play any of the 4 arcade games at the TV at home — doable from Chapter 1.',
    16: 'Try the 9 activity types as you play — most come free from the story.',
  };
  return `<h2>Next up — your planner</h2>
  <p class="lede">The next trophies in roadmap order. Work them top to bottom and the platinum stays on schedule.</p>
  <div class="next-list">${todo.map((t, i) => `<div class="next-item" data-action="select" data-id="${t.id}" role="button" tabindex="0">
    <span class="rank">${i + 1}</span>
    <div><b>#${t.id} ${esc(displayName(state, t))}</b> <span class="chip">${esc(kindLabel(t.kind))}</span> <span class="chip">S${t.stage}</span> <span class="chip">${esc(t.chapter)}</span>
    <p>${esc(why[t.id] || t.description)}</p></div>
  </div>`).join('')}</div>`;
}

export function progressHtml(data, state) {
  const total = data.trophies.length;
  const earned = state.earned.length;
  const gradeRows = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const list = data.trophies.filter((t) => t.grade === g);
    const e = list.filter((t) => isEarned(state, t.id)).length;
    return `<div class="row"><span>${medal(g)} ${gradeLabel(g)}</span><b>${e}/${list.length}</b></div>`;
  }).join('');
  const kindRows = KINDS.filter(([k]) => k !== 'online').map(([k, label]) => {
    const list = data.trophies.filter((t) => t.kind === k);
    const e = list.filter((t) => isEarned(state, t.id)).length;
    return `<div class="row"><span>${label}</span><b>${e}/${list.length}</b></div>`;
  }).join('');
  const stageRows = Object.keys(STAGES).map((s) => {
    const list = data.trophies.filter((t) => t.stage === Number(s));
    const e = list.filter((t) => isEarned(state, t.id)).length;
    return `<div class="row"><span>Stage ${s}</span><b>${e}/${list.length}</b></div>`;
  }).join('');
  const notes = Object.keys(state.notes).filter((k) => state.notes[k] && state.notes[k].trim()).length;
  const pct = Math.round((earned / total) * 100);
  return `<h2>Progress &amp; export — ${earned}/${total} · ${pct}%</h2>
  <p class="lede">Your progress is saved in this browser (localStorage). Export it to a file before you clear browser data, and import it back on any device.</p>
  <div class="prog-grid">
    <div class="prog-card"><h3>By grade</h3>${gradeRows}</div>
    <div class="prog-card"><h3>By kind</h3>${kindRows}</div>
    <div class="prog-card"><h3>By roadmap stage</h3>${stageRows}</div>
    <div class="prog-card"><h3>Your data</h3>
      <div class="row"><span>Trophies earned</span><b>${earned}/${total}</b></div>
      <div class="row"><span>Notes written</span><b>${notes}</b></div>
      <div class="row"><span>Counters tracked</span><b>${Object.keys(state.counters).length}</b></div>
      <div class="row"><span>Spoilers</span><b>${state.spoilers ? 'Hidden' : 'Shown'}</b></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="row"><span>To the platinum</span><b>${total - earned} to go</b></div>
    </div>
  </div>
  <div class="btn-row">
    <button type="button" data-action="export">Export progress</button>
    <label class="import-btn">Import progress<input type="file" data-action="import" accept="application/json,.json"></label>
    <button type="button" data-action="print">Print checklist</button>
    <button type="button" class="danger" data-action="reset">Reset progress</button>
  </div>
  <h2>About &amp; sources</h2>
  <p class="src-full">Leonida Platinum Atlas is an unofficial fan guide, not affiliated with Rockstar Games or Sony. Trophy names, descriptions and grades are as PlayStation publishes them. Every guide is written in our own words for this entry and cites its sources beside each trophy; where a fact is not confirmed, the guide says so honestly. Difficulty 4/10, about 200 hours to the platinum (PowerPyx). Sources retrieved 19 Nov 2026:</p>
  <ol class="src-list">${data.sources.map((s) => `<li>[${s.ref}] <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ol>`;
}

export { GRADE_ORDER };
