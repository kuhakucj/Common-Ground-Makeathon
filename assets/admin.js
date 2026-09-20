/* Common Ground — organiser console (backend wireframe).
   Edits the same CGData record the builder portal reads. */
(function () {
  'use strict';

  var data = CGData.load();
  var dirty = false;
  var editingIndex = -1;

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

  function markDirty() {
    dirty = true;
    $('save-state').textContent = 'Unsaved changes';
  }

  /* ---------------- navigation ---------------- */
  document.querySelectorAll('.admin-nav button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.admin-nav button').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      $('panel-' + btn.dataset.panel).classList.add('active');
      if (btn.dataset.panel === 'data') renderJson();
    });
  });

  /* ---------------- event fields ---------------- */
  var EVENT_FIELDS = ['name', 'edition', 'tagline', 'dates', 'venue', 'hours', 'heroNote'];

  function renderEventFields() {
    EVENT_FIELDS.forEach(function (key) { $('f-' + key).value = data.event[key] || ''; });
  }

  EVENT_FIELDS.forEach(function (key) {
    $('f-' + key).addEventListener('input', function () {
      data.event[key] = this.value;
      markDirty();
    });
  });

  /* ---------------- repeatable list editors ---------------- */
  /* Renders a stack of cards; each field writes straight back into the array. */
  function renderList(mountId, list, title, fields) {
    var mount = $(mountId);
    if (!list.length) {
      mount.innerHTML = '<p class="empty">Nothing here yet.</p>';
      return;
    }
    mount.innerHTML = list.map(function (item, i) {
      var inputs = fields.map(function (f) {
        var val = esc(item[f.key] || '');
        var control = f.type === 'textarea'
          ? '<textarea data-idx="' + i + '" data-key="' + f.key + '">' + val + '</textarea>'
          : '<input data-idx="' + i + '" data-key="' + f.key + '" value="' + val + '">';
        return '<label class="field"><span>' + f.label + '</span>' + control + '</label>';
      }).join('');
      return '<div class="edit-card">' +
        '<div class="edit-card-head"><h3>' + title + ' ' + String(i + 1).padStart(2, '0') + '</h3>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-sm" data-move="-1" data-idx="' + i + '" title="Move up">↑</button>' +
          '<button class="btn btn-sm" data-move="1" data-idx="' + i + '" title="Move down">↓</button>' +
          '<button class="btn btn-sm btn-danger" data-remove="' + i + '">Remove</button>' +
        '</div></div>' +
        inputs + '</div>';
    }).join('');
  }

  /* One delegated handler drives every list editor. */
  function wireList(mountId, getList, rerender) {
    var mount = $(mountId);

    mount.addEventListener('input', function (ev) {
      var el = ev.target;
      if (!el.dataset.key) return;
      getList()[+el.dataset.idx][el.dataset.key] = el.value;
      markDirty();
    });

    mount.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button');
      if (!btn) return;
      var list = getList();

      if (btn.dataset.remove !== undefined) {
        var i = +btn.dataset.remove;
        if (!confirm('Remove item ' + (i + 1) + '?')) return;
        list.splice(i, 1);
        markDirty(); rerender();
        return;
      }
      if (btn.dataset.move !== undefined) {
        var from = +btn.dataset.idx;
        var to = from + (+btn.dataset.move);
        if (to < 0 || to >= list.length) return;
        var moved = list.splice(from, 1)[0];
        list.splice(to, 0, moved);
        markDirty(); rerender();
      }
    });
  }

  var INTRO_FIELDS = [
    { key: 'title', label: 'HEADING' },
    { key: 'body', label: 'BODY', type: 'textarea' }
  ];
  var SCHED_FIELDS = [
    { key: 'time', label: 'TIME LABEL' },
    { key: 'title', label: 'TITLE' },
    { key: 'detail', label: 'DETAIL', type: 'textarea' }
  ];
  var FAQ_FIELDS = [
    { key: 'q', label: 'QUESTION' },
    { key: 'a', label: 'ANSWER', type: 'textarea' }
  ];

  function renderIntro() { renderList('intro-list', data.event.intro, 'BLOCK', INTRO_FIELDS); }
  function renderSched() { renderList('sched-list', data.event.schedule, 'ROW', SCHED_FIELDS); }
  function renderFaq() { renderList('faq-list', data.event.faq, 'Q', FAQ_FIELDS); }

  wireList('intro-list', function () { return data.event.intro; }, renderIntro);
  wireList('sched-list', function () { return data.event.schedule; }, renderSched);
  wireList('faq-list', function () { return data.event.faq; }, renderFaq);

  $('add-intro').addEventListener('click', function () {
    data.event.intro.push({ title: 'New block', body: '' }); markDirty(); renderIntro();
  });
  $('add-sched').addEventListener('click', function () {
    data.event.schedule.push({ time: 'DAY 00:00', title: 'New item', detail: '' }); markDirty(); renderSched();
  });
  $('add-faq').addEventListener('click', function () {
    data.event.faq.push({ q: 'New question', a: '' }); markDirty(); renderFaq();
  });

  /* ---------------- perks ---------------- */
  function renderPerks() {
    var mount = $('perk-list');
    if (!data.perks.length) { mount.innerHTML = '<p class="empty">No tool credits configured.</p>'; return; }

    mount.innerHTML = data.perks.map(function (p, i) {
      return '<div class="edit-card">' +
        '<div class="edit-card-head"><h3>' + esc(p.name || 'Untitled') + '</h3>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<span class="tag">id: ' + esc(p.id) + '</span>' +
          '<button class="btn btn-sm btn-danger" data-remove-perk="' + i + '">Remove</button>' +
        '</div></div>' +
        '<div class="field-row">' +
          '<label class="field"><span>NAME</span><input data-pidx="' + i + '" data-pkey="name" value="' + esc(p.name) + '"></label>' +
          '<label class="field"><span>ID (CODE KEY)</span><input data-pidx="' + i + '" data-pkey="id" class="code-input" value="' + esc(p.id) + '"></label>' +
          '<label class="field"><span>CATEGORY</span><input data-pidx="' + i + '" data-pkey="kind" value="' + esc(p.kind) + '"></label>' +
        '</div>' +
        '<div class="field-row">' +
          '<label class="field"><span>VALUE</span><input data-pidx="' + i + '" data-pkey="value" value="' + esc(p.value) + '"></label>' +
          '<label class="field"><span>REDEEM WINDOW</span><input data-pidx="' + i + '" data-pkey="window" value="' + esc(p.window) + '"></label>' +
        '</div>' +
        '<label class="field"><span>REDEEM URL</span><input data-pidx="' + i + '" data-pkey="redeemUrl" class="code-input" value="' + esc(p.redeemUrl) + '"></label>' +
        '<label class="field"><span>DESCRIPTION</span><textarea data-pidx="' + i + '" data-pkey="blurb">' + esc(p.blurb) + '</textarea></label>' +
        '<label class="field"><span>REDEEM STEPS (ONE PER LINE)</span><textarea data-pidx="' + i + '" data-pkey="steps" style="min-height:70px">' + esc((p.steps || []).join('\n')) + '</textarea></label>' +
        '</div>';
    }).join('');
  }

  $('perk-list').addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el.dataset.pkey) return;
    var perk = data.perks[+el.dataset.pidx];
    perk[el.dataset.pkey] = el.dataset.pkey === 'steps'
      ? el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
      : el.value;
    markDirty();
  });

  $('perk-list').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-remove-perk]');
    if (!btn) return;
    var i = +btn.dataset.removePerk;
    if (!confirm('Remove "' + data.perks[i].name + '"? Per-person codes for it stay in the data but stop showing.')) return;
    data.perks.splice(i, 1);
    markDirty(); renderPerks();
  });

  $('add-perk').addEventListener('click', function () {
    data.perks.push({
      id: 'tool' + (data.perks.length + 1), name: 'New tool', kind: 'CATEGORY',
      value: '', window: '', blurb: '', redeemUrl: 'https://', steps: []
    });
    markDirty(); renderPerks();
  });

  /* ---------------- participants ---------------- */
  function statusPill(s) {
    var cls = ['confirmed', 'waitlist', 'cancelled'].indexOf(s) > -1 ? s : 'waitlist';
    return '<span class="pill ' + cls + '">' + esc(String(s || '—').toUpperCase()) + '</span>';
  }

  function renderPeople() {
    var q = $('people-search').value.trim().toLowerCase();
    var filter = $('people-filter').value;

    var rows = data.participants
      .map(function (p, i) { return { p: p, i: i }; })
      .filter(function (r) {
        if (filter && r.p.status !== filter) return false;
        if (!q) return true;
        return [r.p.name, r.p.email, r.p.team, r.p.token].join(' ').toLowerCase().indexOf(q) > -1;
      });

    $('people-count').textContent =
      rows.length + ' of ' + data.participants.length + ' shown · ' +
      data.participants.filter(function (p) { return p.status === 'confirmed'; }).length + ' confirmed';

    if (!rows.length) {
      $('people-body').innerHTML = '<tr><td colspan="8" class="empty">No participants match.</td></tr>';
      return;
    }

    $('people-body').innerHTML = rows.map(function (r) {
      var p = r.p;
      var issued = data.perks.filter(function (k) { return p.codes && p.codes[k.id]; }).length;
      var claimed = data.perks.filter(function (k) { return p.claimed && p.claimed[k.id]; }).length;
      return '<tr>' +
        '<td><b>' + esc(p.name || '—') + '</b></td>' +
        '<td class="mono">' + esc(p.email) + '</td>' +
        '<td>' + esc(p.team || '—') + '</td>' +
        '<td class="mono">' + esc(p.ticket || '—') + '</td>' +
        '<td>' + statusPill(p.status) + '</td>' +
        '<td class="mono">' + esc(p.token || '—') + '</td>' +
        '<td class="mono">' + issued + ' issued / ' + claimed + ' redeemed</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-sm" data-edit="' + r.i + '">Edit</button>' +
          '<button class="btn btn-sm btn-danger" data-del="' + r.i + '">Delete</button>' +
        '</div></td></tr>';
    }).join('');
  }

  $('people-search').addEventListener('input', renderPeople);
  $('people-filter').addEventListener('change', renderPeople);

  $('people-body').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.edit !== undefined) { openPerson(+btn.dataset.edit); return; }
    if (btn.dataset.del !== undefined) {
      var i = +btn.dataset.del;
      if (!confirm('Delete ' + (data.participants[i].name || data.participants[i].email) + '?')) return;
      data.participants.splice(i, 1);
      markDirty(); renderPeople();
    }
  });

  $('add-person').addEventListener('click', function () { openPerson(-1); });

  /* ---- participant dialog ---- */
  var dlg = $('person-dialog');

  function randomBlock(n) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var buf = new Uint32Array(n);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < n; i++) out += chars[buf[i] % chars.length];
    return out;
  }
  function makeToken(prefix) { return prefix + '-' + randomBlock(4) + '-' + randomBlock(4); }

  function renderCodeFields(person) {
    $('d-codes').innerHTML = '<div class="edit-card" style="padding-bottom:10px">' +
      '<div class="edit-card-head"><h3>Tool credit codes</h3><span class="tag">ONE PER CREDIT</span></div>' +
      data.perks.map(function (perk) {
        var code = (person.codes && person.codes[perk.id]) || '';
        var claimed = !!(person.claimed && person.claimed[perk.id]);
        return '<label class="field"><span>' + esc(perk.name.toUpperCase()) + ' (' + esc(perk.id) + ')</span>' +
          '<div style="display:flex;gap:10px;align-items:center">' +
            '<input class="code-input" data-code="' + esc(perk.id) + '" value="' + esc(code) + '" placeholder="not issued" style="flex:1">' +
            '<label style="display:flex;gap:6px;align-items:center;font:11px var(--mono);white-space:nowrap">' +
              '<input type="checkbox" data-claimed="' + esc(perk.id) + '"' + (claimed ? ' checked' : '') + '> REDEEMED</label>' +
          '</div></label>';
      }).join('') + '</div>';
  }

  function openPerson(index) {
    editingIndex = index;
    var blank = { name: '', email: '', team: '', ticket: 'BUILDER', status: 'confirmed', token: '', codes: {}, claimed: {} };
    var p = index === -1 ? blank : data.participants[index];

    $('person-dialog-title').textContent = index === -1 ? 'Add participant' : 'Edit participant';
    $('d-name').value = p.name || '';
    $('d-email').value = p.email || '';
    $('d-team').value = p.team || '';
    $('d-ticket').value = p.ticket || 'BUILDER';
    $('d-status').value = p.status || 'confirmed';
    $('d-token').value = p.token || '';
    renderCodeFields(p);
    dlg.showModal();
  }

  $('d-gen-token').addEventListener('click', function () {
    $('d-token').value = makeToken('CG');
    data.perks.forEach(function (perk) {
      var input = $('d-codes').querySelector('[data-code="' + perk.id + '"]');
      if (input) input.value = makeToken(perk.id.slice(0, 3).toUpperCase());
    });
    toast('Generated a fresh token and codes');
  });

  dlg.addEventListener('close', function () {
    if (dlg.returnValue !== 'save') return;

    var email = $('d-email').value.trim();
    if (!email) { toast('Email is required — nothing saved.'); return; }

    var clash = data.participants.findIndex(function (p, i) {
      return i !== editingIndex && String(p.email).toLowerCase() === email.toLowerCase();
    });
    if (clash > -1) { toast('That email already exists on the roster — nothing saved.'); return; }

    var codes = {}, claimed = {};
    $('d-codes').querySelectorAll('[data-code]').forEach(function (input) {
      codes[input.dataset.code] = input.value.trim();
    });
    $('d-codes').querySelectorAll('[data-claimed]').forEach(function (box) {
      claimed[box.dataset.claimed] = box.checked;
    });

    var record = {
      name: $('d-name').value.trim(),
      email: email,
      team: $('d-team').value.trim(),
      ticket: $('d-ticket').value,
      status: $('d-status').value,
      token: $('d-token').value.trim(),
      codes: codes,
      claimed: claimed
    };

    if (editingIndex === -1) data.participants.push(record);
    else data.participants[editingIndex] = record;

    markDirty();
    renderPeople();
    toast('Participant saved locally — press Save changes to publish');
  });

  /* ---------------- data panel ---------------- */
  function renderJson() { $('json-view').value = JSON.stringify(data, null, 2); }

  $('json-view').addEventListener('input', markDirty);

  $('export-json').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'common-ground-portal.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Downloaded common-ground-portal.json');
  });

  $('copy-json').addEventListener('click', function () {
    var text = JSON.stringify(data, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast('JSON copied'); },
        function () { toast('Copy failed — use Download instead.'); }
      );
    } else { toast('Clipboard unavailable — use Download instead.'); }
  });

  $('import-json').addEventListener('click', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (!parsed.event || !Array.isArray(parsed.participants)) throw new Error('missing event or participants');
          data = parsed;
          renderAll(); markDirty();
          toast('Imported — press Save changes to publish');
        } catch (err) {
          toast('That file is not valid portal JSON.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });

  $('reset-data').addEventListener('click', function () {
    if (!confirm('Reset every field back to the sample data? Your edits are lost.')) return;
    data = CGData.reset();
    CGData.save(data);
    renderAll();
    dirty = false;
    $('save-state').textContent = 'Reset to sample data';
    toast('Back to sample data');
  });

  /* ---------------- save ---------------- */
  $('save').addEventListener('click', function () {
    // The JSON panel wins if it is the visible one and still parses.
    if ($('panel-data').classList.contains('active')) {
      try {
        var parsed = JSON.parse($('json-view').value);
        if (!parsed.event || !Array.isArray(parsed.participants)) throw new Error('shape');
        data = parsed;
        renderAll();
      } catch (err) {
        toast('JSON does not parse — fix it or switch panels before saving.');
        return;
      }
    }
    if (CGData.save(data)) {
      dirty = false;
      $('save-state').textContent = 'Saved ' + new Date().toLocaleTimeString();
      toast('Saved — the builder portal now shows this');
    } else {
      toast('Could not save. Browser storage may be blocked.');
    }
  });

  $('preview').addEventListener('click', function () {
    if (dirty && !confirm('You have unsaved changes. Open the builder view anyway?')) return;
    window.open('./index.html', '_blank', 'noopener');
  });

  window.addEventListener('beforeunload', function (ev) {
    if (!dirty) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  /* ---------------- boot ---------------- */
  function renderAll() {
    renderEventFields();
    renderIntro();
    renderSched();
    renderFaq();
    renderPerks();
    renderPeople();
    renderJson();
  }
  renderAll();
})();
