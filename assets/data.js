/* Common Ground — portal wireframe data layer.
   Everything lives in localStorage so the admin portal and the front portal
   share one source of truth. Swap this file for real API calls later:
   CGData.load()  -> GET  /api/portal
   CGData.save(d) -> PUT  /api/portal
*/
(function (global) {
  const STORE_KEY = 'cg-portal-v1';

  const SEED = {
    event: {
      name: 'Common Ground',
      edition: 'EDITION 01 / 2026',
      tagline: 'A 48-hour makeathon for people who would rather build the thing than describe it.',
      dates: '14 — 16 MARCH 2026',
      venue: 'The Foundry, Level 3',
      capacity: '120 BUILDERS / 30 TEAMS',
      heroNote: 'Bring a problem you actually have. Leave with something that runs.',
      intro: [
        { title: 'What this is',
          body: 'Common Ground is a weekend-long makeathon. No pitch decks, no theatre. You show up with a team (or find one here), you pick something worth making, and you spend two days making it. Friday night we open, Sunday afternoon we demo.' },
        { title: 'What you get',
          body: 'Every confirmed builder gets a Common Ground token. That token unlocks the tool credits below — Codex, Figma and Mobbin — plus food, a desk, power, and people who know things you do not.' },
        { title: 'What we ask',
          body: 'Build in the open. Help the team next to you when they are stuck. Ship something honest on Sunday, even if it is held together with tape.' }
      ],
      schedule: [
        { time: 'FRI 18:00', title: 'Doors + dinner', detail: 'Badge pickup, token activation, food.' },
        { time: 'FRI 19:30', title: 'Opening + team forming', detail: 'Brief, themes, and the part where strangers become a team.' },
        { time: 'FRI 21:00', title: 'Build starts', detail: 'Clock starts. Mentors float until midnight.' },
        { time: 'SAT 10:00', title: 'Workshops', detail: 'Three tracks, 40 minutes each. Optional, genuinely useful.' },
        { time: 'SAT 16:00', title: 'Checkpoint', detail: 'Five minutes per team with a mentor. Course-correct early.' },
        { time: 'SUN 12:00', title: 'Tools down', detail: 'Freeze your build. Rehearse the demo instead.' },
        { time: 'SUN 14:00', title: 'Demos + close', detail: 'Four minutes on stage. Then we eat.' }
      ],
      faq: [
        { q: 'I signed up with a different email.', a: 'Use the address on your confirmation email. If that still fails, find us at the front desk and we will merge the records.' },
        { q: 'Do I need a team before Friday?', a: 'No. Roughly half of every Common Ground team forms on the night.' },
        { q: 'How long do the tool credits last?', a: 'Each credit has its own window — check the card. Redeem them before the event, not during.' },
        { q: 'Can I bring existing work?', a: 'Bring libraries, components and boilerplate. Do not bring a finished product.' }
      ]
    },

    /* The redeemable tool credits shown on a builder's token page. */
    perks: [
      { id: 'codex', name: 'Codex', kind: 'AI PAIR PROGRAMMER',
        value: '3 months Pro', window: 'REDEEM BEFORE 12 MAR',
        blurb: 'Full Pro access for the duration of the event and two months after, so the thing you start here does not stall on Monday.',
        redeemUrl: 'https://example.com/redeem/codex',
        steps: ['Open the redeem link', 'Sign in with the email below', 'Paste your code at checkout'] },
      { id: 'figma', name: 'Figma', kind: 'DESIGN + PROTOTYPING',
        value: 'Pro seat, 90 days', window: 'REDEEM BEFORE 12 MAR',
        blurb: 'A Pro seat on the Common Ground org, with the shared team library, the demo deck template and the component kit already in it.',
        redeemUrl: 'https://example.com/redeem/figma',
        steps: ['Open the redeem link', 'Accept the org invite', 'Your seat upgrades automatically'] },
      { id: 'mobbin', name: 'Mobbin', kind: 'UI REFERENCE LIBRARY',
        value: 'Pro, 6 months', window: 'REDEEM ANY TIME',
        blurb: 'Every screen and flow in the library, unlocked. Useful at 2am when you know the pattern exists but cannot remember who did it well.',
        redeemUrl: 'https://example.com/redeem/mobbin',
        steps: ['Open the redeem link', 'Create or sign in to your account', 'Enter the code under Billing'] }
    ],

    /* Wireframe roster. Replace with a real participants table. */
    participants: [
      { email: 'ada@example.com', name: 'Ada Okonkwo', team: 'Team Driftwood', ticket: 'BUILDER',
        status: 'confirmed', token: 'CG-7K4M-QX21',
        codes: { codex: 'CDX-8841-RRTP', figma: 'FIG-2093-LMQZ', mobbin: 'MOB-5517-VVKD' },
        claimed: { codex: true, figma: false, mobbin: false } },
      { email: 'jun@example.com', name: 'Jun Park', team: 'Team Driftwood', ticket: 'BUILDER',
        status: 'confirmed', token: 'CG-2P9X-HW40',
        codes: { codex: 'CDX-1120-BQNE', figma: 'FIG-7734-KPAX', mobbin: 'MOB-9028-ZTRC' },
        claimed: { codex: false, figma: false, mobbin: false } },
      { email: 'mentor@example.com', name: 'Rosa Lindqvist', team: 'Mentor pool', ticket: 'MENTOR',
        status: 'confirmed', token: 'CG-5D1T-JE83',
        codes: { codex: 'CDX-3312-WWYL', figma: 'FIG-6650-WQDR', mobbin: 'MOB-4471-XNBH' },
        claimed: { codex: true, figma: true, mobbin: true } },
      { email: 'waitlist@example.com', name: 'Theo Marchetti', team: '—', ticket: 'BUILDER',
        status: 'waitlist', token: '—',
        codes: { codex: '', figma: '', mobbin: '' },
        claimed: { codex: false, figma: false, mobbin: false } }
    ]
  };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  const CGData = {
    STORE_KEY,
    seed: function () { return clone(SEED); },

    load: function () {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return clone(SEED);
        const parsed = JSON.parse(raw);
        // Shallow repair so a half-written record never blanks the portal.
        return {
          event: Object.assign(clone(SEED.event), parsed.event || {}),
          perks: Array.isArray(parsed.perks) ? parsed.perks : clone(SEED.perks),
          participants: Array.isArray(parsed.participants) ? parsed.participants : clone(SEED.participants)
        };
      } catch (err) {
        console.warn('Common Ground: falling back to seed data.', err);
        return clone(SEED);
      }
    },

    save: function (data) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
        return true;
      } catch (err) {
        console.warn('Common Ground: could not save.', err);
        return false;
      }
    },

    reset: function () {
      try { localStorage.removeItem(STORE_KEY); } catch (err) { /* private mode */ }
      return clone(SEED);
    },

    findByEmail: function (data, email) {
      const needle = String(email || '').trim().toLowerCase();
      if (!needle) return null;
      return data.participants.find(function (p) {
        return String(p.email || '').trim().toLowerCase() === needle;
      }) || null;
    }
  };

  global.CGData = CGData;
})(window);
