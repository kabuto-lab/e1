const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');

const filename = path.resolve(__dirname, '../apps/web/lib/metrika.ts');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const plain = value => JSON.parse(JSON.stringify(value));

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key)),
    clear: () => values.clear(),
    values,
  };
}

// Run the shipped helper with controllable browser capabilities, without
// loading the external analytics SDK or initiating real navigations/payments.
function browser(options = {}) {
  const calls = [];
  let now = options.now ?? 1_800_000_000_000;
  const local = options.local ?? storage();
  const session = options.session ?? storage();
  const anchors = [];
  const attached = new Set();
  const document = {
    body: {
      appendChild(anchor) { attached.add(anchor); return anchor; },
      append(anchor) { attached.add(anchor); },
      removeChild(anchor) { attached.delete(anchor); return anchor; },
    },
    createElement(tag) {
      assert.equal(tag.toLowerCase(), 'a');
      const anchor = {
        tagName: 'A', clicked: 0, removed: 0, style: {},
        setAttribute(name, value) { this[name] = String(value); },
        getAttribute(name) { return this[name] ?? null; },
        click() {
          assert.ok(attached.has(this), 'the navigation link must be attached for the messenger goal to observe it');
          this.clicked++;
          if (options.clickThrows) throw new Error('navigation unavailable');
        },
        remove() { attached.delete(this); this.removed++; },
      };
      anchors.push(anchor);
      return anchor;
    },
  };
  const window = {
    location: new URL('https://mymuseclub.com/'), document,
    ym: options.sdk === undefined ? (...args) => calls.push(args) : options.sdk,
  };
  for (const [name, value] of [['localStorage', local], ['sessionStorage', session]]) {
    Object.defineProperty(window, name, {
      get() {
        if (options.blockStorage) throw new Error('storage denied');
        return value;
      },
    });
  }
  class Clock extends Date { static now() { return now; } }
  const globals = {
    window, document, location: window.location, URL, Date: Clock,
    process: { env: { NODE_ENV: options.environment ?? 'production' } },
    console,
  };
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globals, name, { get: () => window[name] });
  }
  function load() {
    const module = { exports: {} };
    vm.runInNewContext(compiled, { ...globals, exports: module.exports, module, require }, { filename });
    return module.exports;
  }
  return { helper: load(), reload: load, calls, window, local, session, anchors, attached,
    advance: ms => { now += ms; }, goals: () => calls.map(call => call[2]) };
}

const escrow = overrides => ({
  id: 'escrow-fixture', bookingId: 'booking-fixture', status: 'funded',
  paymentProvider: 'tbank', ...overrides,
});

test('successful client registration preserves the old event and adds the exact new goal', () => {
  const page = browser();
  page.helper.ymGoal('register', { role: 'client' });
  assert.deepEqual(page.goals(), ['register', 'client_register_success']);
  assert.ok(page.calls.every(call => call[0] === 111497387 && call[1] === 'reachGoal'));
});

test('successful model registration adds the model goal without counting it as a client', () => {
  const page = browser();
  page.helper.ymGoal('register', { role: 'model' });
  assert.deepEqual(page.goals(), ['register', 'model_register_success']);
});

test('login, failed registration and other roles do not produce registration-success aliases', () => {
  const page = browser();
  for (const role of ['manager', 'admin', undefined]) page.helper.ymGoal('register', { role });
  page.helper.ymGoal('login', { role: 'client' });
  page.helper.ymGoal('register_failed');
  assert.deepEqual(page.goals(), ['register', 'register', 'register', 'login', 'register_failed']);
});

test('booking creation retains its legacy goal and adds the client goal, while massage stays separate', () => {
  const page = browser();
  page.helper.ymGoal('booking_created', { guest: false });
  page.helper.ymGoal('booking_created', { guest: true });
  page.helper.ymGoal('massage_booking_created', { guest: true });
  assert.deepEqual(page.goals(), ['booking_created', 'client_booking_created', 'booking_created', 'client_booking_created', 'massage_booking_created']);
});

test('successful actions before SDK load are queued in production instead of dropped', () => {
  const page = browser({ sdk: null });
  page.helper.ymGoal('register', { role: 'client' });
  assert.equal(typeof page.window.ym, 'function');
  const queue = Array.from(page.window.ym.a ?? [], args => Array.from(args));
  assert.deepEqual(queue.map(args => args[2]), ['register', 'client_register_success']);
  assert.ok(queue.every(args => args[0] === 111497387));
});

test('SDK failures never throw into a completed user action', () => {
  const page = browser({ sdk: () => { throw new Error('analytics blocked'); } });
  assert.doesNotThrow(() => page.helper.ymGoal('register', { role: 'client' }));
  assert.doesNotThrow(() => page.helper.ymGoal('booking_created'));
});

test('helpers remain safe during SSR without a window', () => {
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, require, process: { env: { NODE_ENV: 'production' } }, URL, console }, { filename });
  const helper = module.exports;
  assert.doesNotThrow(() => helper.ymGoal('register', { role: 'client' }));
  assert.doesNotThrow(() => helper.markPaymentAttempt('booking-fixture'));
  assert.equal(helper.hasPaymentAttempt('booking-fixture'), false);
  assert.doesNotThrow(() => helper.trackPaymentReserved(escrow(), true));
  assert.equal(helper.openTelegramLink('https://t.me/fixture_bot'), false);
});

test('query intent alone, unfunded statuses and unsupported providers never count reserved money', () => {
  const page = browser();
  page.helper.trackPaymentReserved(escrow(), false);
  for (const status of ['pending', 'created', 'failed', 'cancelled', 'refunded', 'released']) {
    page.helper.trackPaymentReserved(escrow({ status }), true);
  }
  for (const paymentProvider of ['unknown', '', 'cash']) page.helper.trackPaymentReserved(escrow({ paymentProvider }), true);
  for (const invalid of [{ id: '' }, { bookingId: '' }]) page.helper.trackPaymentReserved(escrow(invalid), true);
  assert.deepEqual(page.goals(), []);
  page.helper.trackPaymentReserved(escrow(), true);
  assert.deepEqual(page.goals(), ['client_payment_reserved']);
});

test('funded/hold-period observations count once per escrow across polling and page reloads', () => {
  const page = browser();
  page.helper.trackPaymentReserved(escrow(), true);
  page.helper.trackPaymentReserved(escrow({ status: 'hold_period' }), true);
  page.reload().trackPaymentReserved(escrow(), true);
  assert.deepEqual(page.goals(), ['client_payment_reserved']);
  page.helper.trackPaymentReserved(escrow({ id: 'another-escrow', paymentProvider: 'ton_usdt' }), true);
  assert.deepEqual(page.goals(), ['client_payment_reserved', 'client_payment_reserved']);
});

test('storage restrictions still deduplicate payment polling in memory', () => {
  const page = browser({ blockStorage: true });
  assert.doesNotThrow(() => page.helper.trackPaymentReserved(escrow(), true));
  page.helper.trackPaymentReserved(escrow(), true);
  assert.deepEqual(page.goals(), ['client_payment_reserved']);
});

test('a throwing SDK does not mark a payment goal as delivered and prevent a later retry', () => {
  const page = browser({ sdk: () => { throw new Error('analytics blocked'); } });
  assert.doesNotThrow(() => page.helper.trackPaymentReserved(escrow(), true));
  page.window.ym = (...args) => page.calls.push(args);
  page.helper.trackPaymentReserved(escrow(), true);
  assert.deepEqual(page.goals(), ['client_payment_reserved']);
});

test('payment attempts survive page reloads but expire after 24 hours', () => {
  const page = browser();
  assert.equal(page.helper.hasPaymentAttempt('booking-fixture'), false);
  page.helper.markPaymentAttempt('booking-fixture');
  assert.equal(page.helper.hasPaymentAttempt('booking-fixture'), true);
  assert.equal(page.reload().hasPaymentAttempt('booking-fixture'), true);
  assert.equal(page.helper.hasPaymentAttempt('another-booking'), false);
  page.advance(24 * 60 * 60 * 1000 + 1);
  assert.equal(page.helper.hasPaymentAttempt('booking-fixture'), false);
});

test('blocked session storage falls back to an expiring in-memory payment attempt', () => {
  const page = browser({ blockStorage: true });
  assert.doesNotThrow(() => page.helper.markPaymentAttempt('booking-fixture'));
  assert.equal(page.helper.hasPaymentAttempt('booking-fixture'), true);
  page.advance(24 * 60 * 60 * 1000 + 1);
  assert.equal(page.helper.hasPaymentAttempt('booking-fixture'), false);
});

test('Telegram navigation uses an attached real link for the existing messenger goal and cleans it up', () => {
  const page = browser();
  for (const href of ['https://t.me/fixture_bot?start=fixture', 'https://telegram.me/fixture_bot', 'tg://resolve?domain=fixture_bot']) {
    assert.equal(page.helper.openTelegramLink(href), true);
  }
  assert.equal(page.anchors.length, 3);
  for (const anchor of page.anchors) {
    assert.equal(anchor.target, '_blank');
    assert.ok(anchor.rel.split(/\s+/).includes('noopener'));
    assert.ok(anchor.rel.split(/\s+/).includes('noreferrer'));
    assert.equal(anchor.clicked, 1);
  }
  assert.equal(page.attached.size, 0);
  assert.deepEqual(page.goals(), [], 'the messenger auto-goal must not be replaced by an invented reachGoal name');
});

test('non-Telegram or unsafe Telegram navigation URLs are rejected before DOM changes', () => {
  const page = browser();
  for (const href of ['', 'javascript:alert(1)', 'http://t.me/fixture', 'https://example.org/t.me/fixture', 'https://t.me.example.org/fixture', 'https://user:password@t.me/fixture']) {
    assert.equal(page.helper.openTelegramLink(href), false, href);
  }
  assert.equal(page.anchors.length, 0);
});

test('failed Telegram navigation remains harmless and removes its temporary link', () => {
  const page = browser({ clickThrows: true });
  assert.equal(page.helper.openTelegramLink('https://t.me/fixture_bot'), false);
  assert.equal(page.attached.size, 0);
});

function authForm(page, responsePromise, { isLogin = false, role = 'client' } = {}) {
  const authSource = fs.readFileSync(path.resolve(__dirname, '../apps/web/page/Auth/index.tsx'), 'utf8');
  const output = ts.transpileModule(authSource, {
    fileName: 'Auth.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loginCalls = [], requests = [], redirects = [];
  const query = new URLSearchParams({ role, tab: isLogin ? 'login' : 'register' });
  const Role = { Client: 'client', Model: 'model', Manager: 'manager', Admin: 'admin', Moderator: 'moderator' };
  const mocks = {
    react: { ...React, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] },
    '@/components/AuthProvider': { useAuth: () => ({ login: (...args) => loginCalls.push(args) }) },
    '@/components/Logo': { __esModule: true, default: () => null },
    '@/enums': { Role, ContactMethod: { Telegram: 'telegram' } },
    '@/lib/api-url': { apiUrl: path => '/api' + path },
    '@/lib/metrika': page.helper,
    'next/link': { __esModule: true, default: () => null },
    'next/navigation': { useRouter: () => ({ push: value => redirects.push(value) }), useSearchParams: () => query },
    './ui/LoginForm': { LoginForm: () => null },
    './ui/RecoveryCode': { RecoveryCode: () => null },
    './ui/RegistrationForm': { RegfistrationForm: () => null },
  };
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports, module,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    fetch: (url, init) => { requests.push({ url, init }); return responsePromise; },
    URLSearchParams, console,
  }, { filename: 'apps/web/page/Auth/index.tsx' });
  function* elements(value) {
    if (Array.isArray(value)) {
      for (const child of value) yield* elements(child);
    } else if (value && typeof value === 'object' && value.props) {
      yield value; yield* elements(value.props.children);
    }
  }
  const tree = module.exports.Auth();
  const form = [...elements(tree)].find(element => element.type === 'form');
  assert.ok(form, 'the real Auth component must expose its form handler');
  return { submit: () => form.props.onSubmit({ preventDefault() {} }), loginCalls, requests, redirects };
}

test('the real registration handler waits for successful server creation before sending client/model goals', async () => {
  for (const role of ['client', 'model']) {
    const page = browser();
    let respond;
    const pending = new Promise(resolve => { respond = resolve; });
    const form = authForm(page, pending, { role });
    const action = form.submit();
    assert.deepEqual(page.goals(), []);
    assert.equal(form.requests[0].url, '/api/auth/register');
    respond({ ok: true, json: async () => ({ accessToken: 'fixture-access', refreshToken: 'fixture-refresh', user: { role } }) });
    await action;
    assert.deepEqual(page.goals(), ['register', role === 'client' ? 'client_register_success' : 'model_register_success']);
    assert.equal(form.loginCalls.length, 1);
  }
});

test('the real registration handler does not report success for failed or malformed responses', async () => {
  for (const response of [
    { ok: false, status: 400, json: async () => ({ message: 'Registration rejected' }) },
    { ok: true, json: async () => ({ user: { role: 'client' } }) },
  ]) {
    const page = browser();
    const form = authForm(page, Promise.resolve(response));
    await form.submit();
    assert.deepEqual(page.goals(), ['register_failed']);
    assert.equal(form.loginCalls.length, 0);
  }
});

test('the real login handler keeps the old login event without falsely counting a new registration', async () => {
  const page = browser();
  const form = authForm(page, Promise.resolve({ ok: true, json: async () => ({ accessToken: 'fixture-access', user: { role: 'client' } }) }), { isLogin: true });
  await form.submit();
  assert.equal(form.requests[0].url, '/api/auth/login');
  assert.deepEqual(page.goals(), ['login']);
  assert.equal(form.loginCalls.length, 1);
});
