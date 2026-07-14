// Vanilla dashboard: fetch the eval run + baseline, render tiles and a case
// table with a per-case drill-down drawer. No framework, no build step.

const $ = (sel) => document.querySelector(sel);

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) return null;
  return res.json();
}

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

function barColor(rate) {
  if (rate >= 0.9) return 'var(--pass)';
  if (rate >= 0.7) return 'var(--warn)';
  return 'var(--fail)';
}

function renderMeta(run) {
  const when = new Date(run.generatedAt).toLocaleString();
  $('#meta').innerHTML = `
    <div>under test · ${run.model}</div>
    <div>judge · ${run.judgeModel}</div>
    <div>${when}</div>`;
}

function renderTiles(run, baseline) {
  const tiles = run.metrics
    .map((m) => {
      const base = baseline?.metrics.find((b) => b.name === m.name);
      const delta = base ? m.rate - base.rate : null;
      return `
      <div class="tile">
        <div class="name">${m.name}</div>
        <div class="value">${pct(m.rate)}
          <span class="count">${m.passed}/${m.total}</span>
        </div>
        <div class="bar"><span style="width:${m.rate * 100}%;background:${barColor(
          m.rate,
        )}"></span></div>
        ${renderDelta(delta)}
      </div>`;
    })
    .join('');
  $('#tiles').innerHTML = tiles;
}

function renderDelta(delta) {
  if (delta === null) return `<div class="delta flat">no baseline</div>`;
  const pts = Math.round(delta * 100);
  if (Math.abs(pts) < 1) return `<div class="delta flat">± 0 vs baseline</div>`;
  const cls = pts > 0 ? 'up' : 'down';
  const arrow = pts > 0 ? '▲' : '▼';
  return `<div class="delta ${cls}">${arrow} ${pts > 0 ? '+' : ''}${pts}pt vs baseline</div>`;
}

const mark = (ok) => `<span class="mark ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'}</span>`;

function accCheck(c, name) {
  return c.accuracy.find((a) => a.name === name)?.passed ?? false;
}

function renderRows(run) {
  const rows = run.cases
    .map((c) => {
      const assertionsOk = c.assertions.every((a) => a.passed);
      const hasFail = !assertionsOk || !c.judge.passed;
      return `
      <tr data-id="${c.id}" class="${hasFail ? 'has-fail' : ''}">
        <td class="id">${c.id}</td>
        <td class="subject" title="${escapeAttr(c.subject)}">${escapeHtml(c.subject)}</td>
        <td>${mark(assertionsOk)}</td>
        <td>${mark(accCheck(c, 'category matches gold'))}</td>
        <td>${mark(accCheck(c, 'priority matches gold'))}</td>
        <td>${mark(accCheck(c, 'needs_human matches gold'))}</td>
        <td><span class="score" style="color:${c.judge.passed ? 'var(--pass)' : 'var(--fail)'}">${
          c.judge.score
        }/5</span></td>
      </tr>`;
    })
    .join('');
  $('#rows').innerHTML = rows;
  $('#rows')
    .querySelectorAll('tr')
    .forEach((tr) => tr.addEventListener('click', () => openDrawer(tr.dataset.id)));
}

let RUN = null;

function openDrawer(id) {
  const c = RUN.cases.find((x) => x.id === id);
  if (!c) return;
  const checks = (list) =>
    list
      .map(
        (ch) => `<div class="checkrow">${mark(ch.passed)}
          <div><div>${escapeHtml(ch.name)}</div>${
            ch.detail ? `<div class="detail">${escapeHtml(ch.detail)}</div>` : ''
          }</div></div>`,
      )
      .join('');

  $('#drawer-body').innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="id">${c.id}</div>
    <h3>${escapeHtml(c.subject)}</h3>

    <div class="block">
      <div class="label">Model decision</div>
      <div class="reply">category: ${c.triage.category}   ·   priority: ${
        c.triage.priority
      }   ·   needs_human: ${c.triage.needs_human}</div>
    </div>

    <div class="block">
      <div class="label">Layer 1 — assertions</div>
      ${checks(c.assertions)}
    </div>

    <div class="block">
      <div class="label">Layer 2 — golden-dataset accuracy</div>
      ${checks(c.accuracy)}
    </div>

    <div class="block">
      <div class="label">Suggested reply</div>
      <div class="reply">${escapeHtml(c.triage.suggested_reply)}</div>
    </div>

    <div class="block">
      <div class="label">Layer 3 — LLM-as-judge</div>
      <div class="judge-card">
        <div class="top">
          <span class="score">${c.judge.score}/5</span>
          <span class="pill ${c.judge.passed ? 'pass' : 'fail'}">${
            c.judge.passed ? 'PASS' : 'FAIL'
          }</span>
        </div>
        <div class="rationale">${escapeHtml(c.judge.rationale)}</div>
      </div>
    </div>`;

  const drawer = $('#drawer');
  drawer.hidden = false;
  drawer.querySelector('.close').addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });
}

function closeDrawer() {
  $('#drawer').hidden = true;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
}
const escapeAttr = escapeHtml;

async function main() {
  const [run, baseline] = await Promise.all([
    loadJSON('/results/latest.json'),
    loadJSON('/results/baseline.json'),
  ]);
  if (!run) {
    $('#tiles').innerHTML = '<p>No results yet. Run <code>npm run eval</code>.</p>';
    return;
  }
  RUN = run;
  renderMeta(run);
  renderTiles(run, baseline);
  renderRows(run);

  // Deep-link support: /?case=T-009 opens that case's drill-down on load.
  const wanted = new URLSearchParams(location.search).get('case');
  if (wanted) openDrawer(wanted);
}

main();
