// Leonida Platinum Atlas — saved progress, counters, notes, export/import.
// Everything lives in one localStorage key; the app never touches the network.
export const KEY = 'leonida-platinum-atlas-v1';

export const KINDS = [
  ['story', 'Story'], ['collectibles', 'Collectibles'], ['activities', 'Activities'],
  ['strands', 'Strands'], ['crime', 'Crime'], ['misc', 'Misc'], ['online', 'Online'],
];

export const STAGES = {
  1: { title: 'Stage 1 · Chapters 1–2 — story first', time: 'Ch 1–2',
       blurb: 'Play the story, do the Chapter 1 balcony meditation before it is gone, and pick up the early activities.' },
  2: { title: 'Stage 2 · Chapters 3–5 — story continues', time: 'Ch 3–5',
       blurb: 'Finish the story and the final mission. The last gold lands here; keep a save before the finale.' },
  3: { title: 'Stage 3 · Side strands — character questlines', time: 'Ch 1–4',
       blurb: 'Andy, Kenton, Billy, Randy, Tyrone, Bret — and the 8 stranger strands. All stay open after the story.' },
  4: { title: 'Stage 4 · Activities & races', time: 'Anytime',
       blurb: 'Stunts, shooting ranges, drone races, races, challenges and the 9 activity types.' },
  5: { title: 'Stage 5 · Collectibles & world', time: 'Anytime',
       blurb: 'Cards, WAiNK scans, vehicles, garages and the full map of Leonida.' },
  6: { title: 'Stage 6 · Robberies & crime', time: 'Ch 2–4',
       blurb: 'Vaults, jewelry, armored trucks, gangs and the partner heists. Bring your partner.' },
  7: { title: 'Stage 7 · Feats, money & cleanup', time: 'After story',
       blurb: '100% completion, max Strength for both characters, profile actions and the easter eggs.' },
};

export const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

export function defaultState() {
  return {
    earned: [], counters: {}, notes: {},
    spoilers: true, selected: 28, tab: 'checklist',
    kind: 'all', grade: 'all', show: 'all', sort: 'roadmap', query: '',
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

export function isEarned(state, id) { return state.earned.includes(id); }

export function toggleEarned(state, id) {
  const i = state.earned.indexOf(id);
  if (i === -1) state.earned.push(id);
  else state.earned.splice(i, 1);
  saveState(state);
}

export function setCounter(state, id, value, total) {
  const v = Math.max(0, Math.min(total, value));
  if (v === 0) delete state.counters[id];
  else state.counters[id] = v;
  saveState(state);
}

export function counterOf(state, trophy) {
  return state.counters[trophy.id] ?? 0;
}

export function exportState(state) {
  return JSON.stringify({
    app: 'Leonida Platinum Atlas', game: 'Grand Theft Auto VI',
    exported_at: new Date().toISOString(),
    earned: state.earned, counters: state.counters, notes: state.notes,
  }, null, 2);
}

export function importState(state, text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.earned)) throw new Error('bad file');
  state.earned = data.earned.filter((n) => Number.isInteger(n));
  state.counters = data.counters && typeof data.counters === 'object' ? data.counters : {};
  state.notes = data.notes && typeof data.notes === 'object' ? data.notes : {};
  saveState(state);
}
