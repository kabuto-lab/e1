const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

// Exercise the functions used by the real screens. No second serializer is
// maintained in the test: TypeScript only removes types from the AST nodes.
const root = path.resolve(__dirname, '..');
const files = {
  create: 'apps/web/app/dashboard/models/create/page.tsx',
  edit: 'apps/web/app/dashboard/models/[id]/edit/page.tsx',
  self: 'apps/web/app/model/profile/page.tsx',
  catalog: 'apps/web/app/models/ModelsClientPage.tsx',
};
const plain = (value) => JSON.parse(JSON.stringify(value));

function realFunction(screen, name, scope = {}) {
  const filename = path.join(root, files[screen]);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      const value = node.initializer;
      if (ts.isArrowFunction(value)) matches.push(value);
      else if (ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === 'useCallback'
        && value.arguments[0] && ts.isArrowFunction(value.arguments[0])) matches.push(value.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(matches.length, 1, `${screen}: expected the actual ${name} function exactly once`);
  const node = matches[0];
  const script = ts.isFunctionDeclaration(node)
    ? `(function () { ${node.getText(source)}\nreturn ${name}; })();`
    : `(${node.getText(source)});`;
  const compiled = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  return vm.runInNewContext(compiled.outputText, scope, { filename: files[screen] });
}

function baseForm(extra = {}) {
  return { displayName: 'Local QA profile', biography: 'A biography', rateHourly: 5000, rateOvernight: 20000,
    physicalAttributes: { city: 'Москва', country: 'Россия', age: 25 }, ...extra };
}

function createScreen(initial = null) {
  let stored = initial && plain(initial);
  const requests = [];
  const errors = [];
  const scope = {
    createdId: initial?.id ?? null, mainPhoto: '', gallery: [], videos: [], mediaBaselineRef: { current: null },
    setIsSaving() {}, setError(value) { if (value) errors.push(value); }, setSuccess() {}, setValue() {}, setModel() {},
    reset() {}, setTimeout() {}, setMainPhoto() {}, mediaSnapshotOf() { return ''; }, profileToModel(value) { return value; },
    async refreshModel() { return plain(stored); },
    setCreatedId(value) { scope.createdId = value; },
    api: { async createProfile(body) {
      requests.push({ method: 'POST', body: plain(body) });
      stored = { id: 'local-model-id', isPublished: false, ...plain(body) };
      return plain(stored);
    } },
    async putModel(id, body) {
      assert.equal(id, stored.id);
      const serialized = plain(body);
      requests.push({ method: 'PUT', body: serialized });
      // The server updates supplied top-level fields. JSONB is replaced, not
      // recursively merged; omission must therefore differ from an empty object.
      stored = { ...stored, ...serialized };
      return plain(stored);
    },
  };
  scope.buildCreatePayload = realFunction('create', 'buildCreatePayload');
  scope.buildUpdateBody = realFunction('create', 'buildUpdateBody');
  const submit = realFunction('create', 'saveModel', scope);
  return { submit, requests, errors, stored: () => plain(stored) };
}

function updateScreen(screen, initial = {}) {
  const requests = [];
  const errors = [];
  let stored = { id: 'local-model-id', displayName: 'Local QA profile', isPublished: false, ...plain(initial) };
  const scope = {
    profile: stored, modelId: stored.id, languages: [], psychotypeTags: [],
    setSaving() {}, setIsSaving() {}, setError(value) { if (value) errors.push(value); }, setSuccess() {},
    setProfile(value) { scope.profile = value; }, setModel() {}, setGallery() {}, setTagsDirty() {},
    reset() {}, setTimeout() {}, localStorage: { getItem() { return 'local-fixture-token'; } },
    apiUrl(value) { return value; },
    api: { async updateMyModelProfile(id, body) {
      assert.equal(id, stored.id);
      const serialized = plain(body); requests.push(serialized); stored = { ...stored, ...serialized };
      return plain(stored);
    } },
    async fetch(url, options) {
      assert.equal(url, `/models/${stored.id}`); assert.equal(options.method, 'PUT');
      const serialized = JSON.parse(options.body); requests.push(serialized); stored = { ...stored, ...serialized };
      return { ok: true, async json() { return plain(stored); } };
    },
  };
  const submit = realFunction(screen, screen === 'edit' ? 'saveModel' : 'onSubmit', scope);
  return { submit, requests, errors, stored: () => plain(stored) };
}

test('creating then repeatedly saving and publishing the same draft retains its selected city', async () => {
  const page = createScreen();
  await page.submit(baseForm(), 'draft');
  assert.equal(page.stored().physicalAttributes.city, 'Москва');
  const kazan = baseForm({ physicalAttributes: { city: 'Казань', country: 'Россия', age: 25 } });
  await page.submit(kazan, 'draft');
  assert.equal(page.stored().physicalAttributes.city, 'Казань');
  await page.submit({ ...kazan, biography: 'Another biography' }, 'publish');
  assert.equal(page.stored().physicalAttributes.city, 'Казань');
  assert.equal(page.stored().isPublished, true);
  assert.deepEqual(page.errors, []);
});

for (const screen of ['create', 'edit', 'self']) {
  test(`${screen}: an omitted physical-attribute section preserves previously stored values`, async () => {
    const initial = { id: 'local-model-id', physicalAttributes: { city: 'Казань', age: 25 } };
    const page = screen === 'create' ? createScreen(initial) : updateScreen(screen, initial);
    await page.submit(baseForm({ physicalAttributes: undefined }));
    const body = screen === 'create' ? page.requests.at(-1).body : page.requests.at(-1);
    assert.equal(Object.hasOwn(body, 'physicalAttributes'), false);
    assert.deepEqual(page.stored().physicalAttributes, initial.physicalAttributes);
    assert.deepEqual(page.errors, []);
  });

  test(`${screen}: clearing the last physical field sends an explicit empty object and removes the saved city`, async () => {
    const initial = { id: 'local-model-id', physicalAttributes: { city: 'Казань' } };
    const page = screen === 'create' ? createScreen(initial) : updateScreen(screen, initial);
    await page.submit(baseForm({ physicalAttributes: { city: '' } }), 'draft');
    const body = screen === 'create' ? page.requests.at(-1).body : page.requests.at(-1);
    assert.ok(body, `The real ${screen} handler must send a request`);
    assert.ok(Object.hasOwn(body, 'physicalAttributes'));
    assert.deepEqual(body.physicalAttributes, {});
    assert.deepEqual(page.stored().physicalAttributes, {});
    assert.deepEqual(page.errors, []);
  });

  test(`${screen}: removing city preserves the other submitted physical fields`, async () => {
    const initial = { id: 'local-model-id', physicalAttributes: { city: 'Казань', age: 25, country: 'Россия' } };
    const page = screen === 'create' ? createScreen(initial) : updateScreen(screen, initial);
    await page.submit(baseForm({ physicalAttributes: { city: '', age: 25, country: 'Россия' } }));
    assert.deepEqual(page.stored().physicalAttributes, { age: 25, country: 'Россия' });
    assert.deepEqual(page.errors, []);
  });

  test(`${screen}: clearing biography and prices is serialized as null instead of silently omitting them`, async () => {
    const page = screen === 'create' ? createScreen({ id: 'local-model-id' }) : updateScreen(screen);
    await page.submit(baseForm({ biography: '   ', rateHourly: null, rateOvernight: undefined }));
    const body = screen === 'create' ? page.requests.at(-1).body : page.requests.at(-1);
    for (const field of ['biography', 'rateHourly', 'rateOvernight']) {
      assert.ok(Object.hasOwn(body, field), `${field} must be explicitly present`);
      assert.equal(body[field], null);
    }
    assert.deepEqual(page.errors, []);
  });
}

test('admin edit can clear all three editable contact fields', async () => {
  const page = updateScreen('edit', { contactPhone: '+70000000000', contactTelegram: '@local_fixture', contactWhatsapp: '+70000000000' });
  await page.submit(baseForm({ contactPhone: '', contactTelegram: '   ', contactWhatsapp: null }));
  assert.equal(page.requests.length, 1);
  for (const field of ['contactPhone', 'contactTelegram', 'contactWhatsapp']) assert.equal(page.requests[0][field], null);
  assert.deepEqual(page.errors, []);
});

test('admin edit retains populated biography, prices and contacts while saving another field', async () => {
  const values = { biography: 'Existing biography', rateHourly: 5000, rateOvernight: 20000,
    contactPhone: '+70000000000', contactTelegram: '@local_fixture', contactWhatsapp: '+70000000000' };
  const page = updateScreen('edit', values);
  await page.submit(baseForm({ ...values, physicalAttributes: { city: 'Сочи' } }));
  assert.equal(page.requests.length, 1);
  for (const [field, value] of Object.entries(values)) assert.equal(page.requests[0][field], value);
  assert.deepEqual(page.errors, []);
});

test('creation-page resave omits contact fields owned by another screen and retains their existing values', async () => {
  const contacts = { contactPhone: '+70000000000', contactTelegram: '@local_fixture', contactWhatsapp: '+70000000000' };
  const page = createScreen({ id: 'local-model-id', ...contacts });
  await page.submit(baseForm());
  for (const [field, value] of Object.entries(contacts)) {
    assert.equal(Object.hasOwn(page.requests.at(-1).body, field), false);
    assert.equal(page.stored()[field], value);
  }
  assert.deepEqual(page.errors, []);
});

test('self-profile full form does not overwrite separately saved contacts', async () => {
  const page = updateScreen('self', { contactTelegram: '@local_fixture' });
  await page.submit(baseForm());
  assert.equal(Object.hasOwn(page.requests[0], 'contactTelegram'), false);
  assert.equal(page.stored().contactTelegram, '@local_fixture');
  assert.deepEqual(page.errors, []);
});

function catalogScreen() {
  const requests = [];
  const scope = {
    URLSearchParams, selectedCity: '', selectedCountry: '',
    filters: { availabilityStatus: '', verificationStatus: '', eliteStatus: false, orderBy: 'rating', order: 'desc',
      ageMin: 0, ageMax: 0, limit: 15, offset: 30, district: '', heightMin: 0, heightMax: 0,
      weightMin: 0, weightMax: 0, bustMin: 0, bustMax: 0, priceMin: 0, priceMax: 0 },
    setSelectedCity(value) { scope.selectedCity = value; }, setSelectedCountry(value) { scope.selectedCountry = value; },
    setFilters(update) { scope.filters = update(scope.filters); },
    setLoading() {}, setCatalogError(value) { scope.error = value; },
    setAllModels(value) { scope.models = value; }, setGeoModels() {}, setTotalCount(value) { scope.total = value; },
    setStats(value) { scope.stats = value; }, processModel(value) { return value; }, apiUrl(value) { return value; },
    async fetch(value) {
      requests.push(value);
      const stats = value === '/models/stats';
      return { ok: true, headers: { get(name) { return name === 'X-Total-Count' ? '17' : null; } },
        async json() { return stats ? { total: 37, online: 3, verified: 37, elite: 0 } : [{ id: 'city-result' }]; } };
    },
  };
  return { scope, requests, select: realFunction('catalog', 'handleLocationSelect', scope),
    reset: realFunction('catalog', 'resetAllFilters', scope), load: realFunction('catalog', 'loadModels', scope) };
}

test('catalog city selection resets pagination and requests the server city filter with its total count', async () => {
  const page = catalogScreen();
  page.select('', 'Казань');
  await page.load();
  const query = new URL(page.requests.find((value) => value.startsWith('/models?')), 'http://local.invalid').searchParams;
  assert.equal(query.get('city'), 'Казань');
  assert.equal(query.get('country'), null);
  assert.equal(query.get('offset'), null);
  assert.equal(query.get('limit'), '15');
  assert.equal(page.scope.filters.offset, 0);
  assert.equal(page.scope.total, 17);
  assert.deepEqual(plain(page.scope.models), [{ id: 'city-result' }]);
  assert.equal(page.scope.error, null);
});

test('catalog reset clears city, ranges and offset before requesting the complete catalog', async () => {
  const page = catalogScreen();
  page.select('', 'Сочи');
  page.scope.filters.ageMin = 30;
  page.scope.filters.priceMin = 5000;
  page.scope.filters.offset = 15;
  page.reset();
  await page.load();
  const query = new URL(page.requests.find((value) => value.startsWith('/models?')), 'http://local.invalid').searchParams;
  assert.equal(query.has('city'), false);
  assert.equal(query.has('country'), false);
  assert.equal(query.has('ageMin'), false);
  assert.equal(query.has('offset'), false);
  assert.equal(page.scope.filters.priceMin, 0);
  assert.equal(page.scope.filters.offset, 0);
});
