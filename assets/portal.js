/* Common Ground — front portal (builder-facing).
   Renders event content from CGData and looks up a token by email. */
(function () {
  'use strict';

  var data = CGData.load();
  var current = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('visible'); }, 2200);
  }

  /* ---------------- render event content ---------------- */
  function renderEvent() {
    var e = data.event;
    $('hero-edition').textContent = e.edition;
    $('hero-tagline').textContent = e.tagline;
    $('meta-dates').textContent = e.dates;
    $('meta-venue').textContent = e.venue;
    $('meta-hours').textContent = e.hours;
    $('meta-note').textContent = e.heroNote;
    $('foot-dates').textContent = e.dates;
    $('top-caption').textContent = 'BUILDER PORTAL / ' + e.edition;
    document.title = e.name + ' — Builder Portal';

    $('intro-grid').innerHTML = (e.intro || []).map(function (block, i) {
      return '<article class="intro-card">' +
        '<span class="idx">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<h3>' + esc(block.title) + '</h3>' +
        '<p>' + esc(block.body) + '</p></article>';
    }).join('');

    $('schedule').innerHTML = (e.schedule || []).map(function (row) {
      return '<div class="sched-row">' +
        '<time>' + esc(row.time) + '</time>' +
        '<strong>' + esc(row.title) + '</strong>' +
        '<span>' + esc(row.detail) + '</span></div>';
    }).join('');

    $('faq').innerHTML = (e.faq || []).map(function (item) {
      return '<div><h3>' + esc(item.q) + '</h3><p>' + esc(item.a) + '</p></div>';
    }).join('');
  }

  /* ---------------- token lookup ---------------- */
  function showError(msg) {
    var el = $('gate-error');
    el.innerHTML = msg;
    el.classList.add('visible');
    $('result').classList.remove('visible');
  }

  function clearError() {
    $('gate-error').classList.remove('visible');
  }

  function renderResult(p) {
    current = p;
    clearError();

    $('p-name').textContent = p.name || p.email;
    $('p-detail').textContent = [p.email, p.team, p.ticket].filter(Boolean).join('  ·  ');

    var status = $('p-status');
    status.textContent = String(p.status || '').toUpperCase();
    status.className = 'badge ' + (p.status === 'confirmed' ? 'ok' : 'warn');

    $('p-token').textContent = p.token || '—';

    if (p.status !== 'confirmed') {
      $('perks').innerHTML =
        '<div class="perk"><div class="perk-head"><h3>Nothing to redeem yet</h3></div>' +
        '<p>Your place is not confirmed, so no tool credits have been issued. As soon as a spot opens we email you, ' +
        'and this page fills in on its own.</p>' +
        '<p class="perk-steps" style="padding-left:0">STATUS · ' + esc(String(p.status || 'pending').toUpperCase()) + '</p></div>';
    } else {
      $('perks').innerHTML = (data.perks || []).map(function (perk) {
        var code = (p.codes && p.codes[perk.id]) || '';
        var claimed = !!(p.claimed && p.claimed[perk.id]);
        var steps = (perk.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
        return '<article class="perk' + (claimed ? ' claimed' : '') + '">' +
          '<div class="perk-head"><div><h3>' + esc(perk.name) + '</h3>' +
            '<div class="perk-kind">' + esc(perk.kind) + '</div></div>' +
            '<span class="perk-value">' + esc(perk.value) + '</span></div>' +
          '<p>' + esc(perk.blurb) + '</p>' +
          '<div class="perk-code">' +
            '<code id="code-' + esc(perk.id) + '">' + esc(code || 'NOT ISSUED') + '</code>' +
            (code ? '<button class="copy-btn btn-sm" type="button" data-copy-target="code-' + esc(perk.id) + '">Copy</button>' : '') +
          '</div>' +
          '<ol class="perk-steps">' + steps + '</ol>' +
          '<div class="perk-foot">' +
            '<span class="perk-window">' + (claimed ? '<span class="claim-tag">✓ ALREADY REDEEMED</span>' : esc(perk.window)) + '</span>' +
            '<a class="redeem" href="' + esc(perk.redeemUrl) + '" target="_blank" rel="noopener noreferrer">Redeem <span aria-hidden="true">↗</span></a>' +
          '</div></article>';
      }).join('');
    }

    var result = $('result');
    result.classList.add('visible');
    result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  $('gate-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var value = $('email').value.trim();

    if (!value) { showError('Enter the email address you signed up with.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      showError('That does not look like an email address. Check for a typo.');
      return;
    }

    var person = CGData.findByEmail(data, value);
    if (!person) {
      showError('We cannot find <b>' + esc(value) + '</b> on the list. ' +
        'Sign-ups are matched on the exact address from your confirmation email — ' +
        'try another address, or find us at the front desk.');
      return;
    }
    renderResult(person);
  });

  $('email').addEventListener('input', clearError);

  /* ---------------- copy buttons (delegated) ---------------- */
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-copy-target]');
    if (!btn) return;
    var src = $(btn.getAttribute('data-copy-target'));
    if (!src) return;
    var text = src.textContent.trim();
    if (!text || text === '—' || text === 'NOT ISSUED') return;

    var label = btn.textContent;
    function done() {
      btn.textContent = '✓ Copied';
      btn.classList.add('done');
      toast('Copied ' + text);
      setTimeout(function () { btn.textContent = label; btn.classList.remove('done'); }, 1600);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { toast('Copy failed — select it by hand.'); });
    } else {
      // file:// and older browsers
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed — select it by hand.'); }
      document.body.removeChild(ta);
    }
  });

  /* Pick up admin edits made in another tab. */
  window.addEventListener('storage', function (ev) {
    if (ev.key !== CGData.STORE_KEY) return;
    data = CGData.load();
    renderEvent();
    if (current) {
      var again = CGData.findByEmail(data, current.email);
      if (again) renderResult(again); else $('result').classList.remove('visible');
    }
    toast('Portal content updated');
  });

  /* Deep link: index.html?email=ada@example.com */
  renderEvent();
  var qs = new URLSearchParams(location.search).get('email');
  if (qs) { $('email').value = qs; $('gate-form').dispatchEvent(new Event('submit')); }
})();
