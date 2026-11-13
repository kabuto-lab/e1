const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const web = path.resolve(__dirname, '../apps/web');

// Execute the real modules while replacing only network/context dependencies.
function load(relative, mocks = {}, globals = {}) {
  const filename = path.join(web, relative);
  const source = process.env.CATALOG_TEST_BASE
    ? execFileSync('git', ['show', `${process.env.CATALOG_TEST_BASE}:apps/web/${relative}`], { cwd: path.join(web, '../..'), encoding: 'utf8' })
    : fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const customRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) {
      const target = name.slice(2);
      return load(fs.existsSync(path.join(web, `${target}.ts`)) ? `${target}.ts` : `${target}.tsx`, mocks, globals);
    }
    return require(name);
  };
  vm.runInNewContext(output, { module, exports: module.exports, require: customRequire, process, console, URLSearchParams, ...globals }, { filename });
  return module.exports;
}

test('failed SSR request remains a failure rather than a successful empty catalog', async () => {
  for (const fetch of [async () => { throw new Error('offline'); }, async () => ({ ok: false })]) {
    const api = load('lib/api-server.ts', {}, { fetch });
    assert.equal(await api.serverFetchModelsWithTotal(), null);
  }
});

test('a genuinely empty successful catalog remains valid server data', async () => {
  const api = load('lib/api-server.ts', {}, { fetch: async () => ({ ok: true, json: async () => [], headers: new Headers({ 'X-Total-Count': '0' }) }) });
  const result = await api.serverFetchModelsWithTotal();
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});

test('successful SSR keeps the API pagination total', async () => {
  const api = load('lib/api-server.ts', {}, { fetch: async () => ({ ok: true, json: async () => [{ id: 'fixture' }], headers: new Headers({ 'X-Total-Count': '37' }) }) });
  const result = await api.serverFetchModelsWithTotal();
  assert.equal(result.total, 37);
  assert.equal(result.items.length, 1);
});

test('SSR failure passes no initialModels so the existing mount effect fetches automatically', async () => {
  const { default: page } = load('app/models/page.tsx', {
    './ModelsClientPage': { ModelsClientPage: () => null },
    '@/lib/api-server': { serverFetchModelsWithTotal: async () => null, serverFetchModelStats: async () => ({ total: 0 }) },
  });
  const element = await page();
  assert.equal(element.props.initialModels, undefined);
  assert.equal(element.props.initialTotalCount, undefined);
});

test('successful empty SSR is not converted into an unavailable request', async () => {
  const { default: page } = load('app/models/page.tsx', {
    './ModelsClientPage': { ModelsClientPage: () => null },
    '@/lib/api-server': { serverFetchModelsWithTotal: async () => ({ items: [], total: 0 }), serverFetchModelStats: async () => ({ total: 0 }) },
  });
  const element = await page();
  assert.equal(element.props.initialModels.length, 0);
  assert.equal(element.props.initialTotalCount, 0);
});

test('server-provided profiles are visible in the first HTML render before effects or filters', () => {
  const { ModelsClientPage } = load('app/models/ModelsClientPage.tsx', {
    'next/image': { __esModule: true, default: ({ src, alt }) => React.createElement('img', { src, alt }) },
    'next/link': { __esModule: true, default: ({ href, children }) => React.createElement('a', { href }, children) },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/components/Header': { Header: () => null },
    '@/components/LocationSidebar': { LocationSidebar: () => null },
    '@/components/SelectDropdown': { SelectDropdown: () => null },
    '@/components/GuestBookingModal': { GuestBookingModal: () => null },
    '@/components/AuthProvider': { useAuth: () => ({ user: null, loading: false }) },
    '@/hooks/useMassageMode': { useMassageMode: () => ({ enabled: false, catalogMode: 'open' }) },
    '@/lib/api-client': { __esModule: true, default: {}, api: {} },
  });
  const fixture = { id: 'catalog-fixture', slug: 'catalog-fixture', displayName: 'Catalog fixture', userId: 'fixture-owner', managerId: null, verificationStatus: 'verified', eliteStatus: false, availabilityStatus: 'online', rateHourly: null, rateOvernight: null, psychotypeTags: [], languages: [], mainPhotoUrl: null, physicalAttributes: null, ratingReliability: '0', totalMeetings: 0, photoCount: 0, videoWalkthroughUrl: null, createdAt: '2026-01-01T00:00:00Z' };
  const html = renderToStaticMarkup(React.createElement(ModelsClientPage, { initialModels: [fixture], initialTotalCount: 1 }));
  assert.match(html, /href="\/models\/catalog-fixture"/);
  assert.match(html, /Catalog fixture/);
});
