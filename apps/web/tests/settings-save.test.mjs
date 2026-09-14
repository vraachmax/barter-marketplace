import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import { buildSettingsPatch, autoReplyChanged } from '../src/lib/settings-patch.ts';

const account = {
  id: 'seller-test', email: 'seller@example.test', phone: null, name: 'Максим',
  avatarUrl: null, about: null, companyName: null, companyInfo: null, appTheme: 'LIGHT',
  notificationsEnabled: true, marketingEnabled: false, showEmailPublic: false, showPhonePublic: false,
};
const form = { ...account, phone: '', avatarUrl: '', about: '', companyName: '', companyInfo: '' };

function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [tree];
  return [tree, ...nodes(tree.props?.children)];
}
function button(tree, caption) {
  return nodes(tree).find(node => node?.type === 'Button' && nodes(node.props.children).includes(caption));
}
function input(tree, value) {
  return nodes(tree).find(node => node?.type === 'Input' && node.props.value === value);
}
const flush = () => new Promise(resolve => setImmediate(resolve));

// Exercise actual component handlers with fake responses. No account or production writes.
async function harness(section, handler = async () => undefined) {
  const state = [];
  const effects = [];
  const calls = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!(index in state)) { state[index] = true; effects.push(effect); }
    },
  };
  const request = async (path, init = {}) => {
    calls.push({ path, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined });
    const custom = await handler(path, init);
    if (custom !== undefined) return custom;
    return { ok: true, data: path === '/auth/me' ? { ...account, ...(init.body ? JSON.parse(init.body) : {}) } : { enabled: true, text: 'Здравствуйте!' } };
  };
  const source = readFileSync(new URL('../src/app/profile/settings/settings-content.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports, AbortSignal, Error,
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'next/navigation') return { useRouter: () => ({ push() {} }), useSearchParams: () => new URLSearchParams({ section }) };
      if (name === '@/lib/api') return { apiFetchJson: request };
      if (name === '@/lib/settings-patch') return { buildSettingsPatch, autoReplyChanged };
      if (name === '@/lib/theme') return {
        applyThemePreference() {}, getStoredThemePreference: () => null,
        getCurrentThemePreference: () => 'LIGHT', subscribeTheme: () => () => {},
      };
      return new Proxy({}, { get: (_, key) => String(key) });
    },
  });
  function render() {
    cursor = 0;
    return exports.ProfileSettingsContent();
  }
  render();
  effects.splice(0).forEach(effect => effect());
  await flush();
  await flush();
  return { render, writes: () => calls.filter(call => call.method !== 'GET') };
}

test('a theme edit sends only the theme, never blank contacts or another section draft', () => {
  assert.deepEqual(buildSettingsPatch('appearance', { ...form, appTheme: 'DARK', name: 'Черновик' }, account), { appTheme: 'DARK' });
  assert.deepEqual(buildSettingsPatch('account', form, account), {});
  assert.throws(() => buildSettingsPatch('account', { ...form, email: '' }, account), /Укажите email/);
});

test('failed auto-reply load cannot overwrite existing reply when the storefront is saved', async () => {
  const h = await harness('storefront', async (path, init) => path.includes('auto-reply') && !init.method ? { ok: false, status: 500 } : undefined);
  input(h.render(), 'Максим').props.onChange({ target: { value: 'Максим новый' } });
  button(h.render(), 'Сохранить').props.onClick();
  await flush();
  assert.deepEqual(h.writes().map(call => ({ path: call.path, body: call.body })), [{ path: '/auth/me', body: { name: 'Максим новый' } }]);
  assert(nodes(h.render()).includes('Настройки раздела сохранены'));
  assert(nodes(h.render()).some(node => node?.type === 'fieldset' && node.props.disabled === true));
});

test('saving appearance does not write the loaded auto-reply', async () => {
  const h = await harness('appearance');
  nodes(h.render()).find(node => node?.type === 'button' && nodes(node.props.children).includes('Тёмная')).props.onClick();
  button(h.render(), 'Сохранить').props.onClick();
  await flush();
  assert.deepEqual(h.writes().map(call => call.body), [{ appTheme: 'DARK' }]);
});

test('two clicks before render make one request and inputs remain disabled until completion', async () => {
  let finish;
  const h = await harness('account', async (_path, init) => init.method === 'PATCH' ? new Promise(resolve => { finish = resolve; }) : undefined);
  input(h.render(), 'seller@example.test').props.onChange({ target: { value: 'new@example.test' } });
  const save = button(h.render(), 'Сохранить').props.onClick;
  save();
  save();
  assert.equal(h.writes().length, 1);
  assert(button(h.render(), 'Сохраняем…').props.disabled);
  finish({ ok: true, data: { ...account, email: 'new@example.test' } });
  await flush();
  assert(nodes(h.render()).includes('Настройки раздела сохранены'));
});

test('a partial save retries only the failed auto-reply and retains the draft', async () => {
  let puts = 0;
  const h = await harness('storefront', async (_path, init) => {
    if (init.method !== 'PUT') return undefined;
    puts++;
    return puts === 1 ? { ok: false, status: 500 } : { ok: true, data: JSON.parse(init.body) };
  });
  input(h.render(), 'Максим').props.onChange({ target: { value: 'Новый продавец' } });
  nodes(h.render()).find(node => node?.type === 'Textarea' && node.props.value === 'Здравствуйте!').props.onChange({ target: { value: 'Скоро отвечу' } });
  button(h.render(), 'Сохранить').props.onClick();
  await flush();
  assert(!nodes(h.render()).includes('Настройки раздела сохранены'));
  assert(nodes(h.render()).includes('Витрина сохранена, но автоответ не удалось обновить. Повторите сохранение.'));
  button(h.render(), 'Сохранить').props.onClick();
  await flush();
  assert.deepEqual(h.writes().map(call => call.method), ['PATCH', 'PUT', 'PUT']);
  assert.equal(h.writes().at(-1).body.text, 'Скоро отвечу');
  assert(nodes(h.render()).includes('Настройки раздела сохранены'));
});

test('expired authentication preserves fields and provides a section return link', async () => {
  const h = await harness('account', async (_path, init) => init.method === 'PATCH' ? { ok: false, status: 401 } : undefined);
  input(h.render(), 'seller@example.test').props.onChange({ target: { value: 'new@example.test' } });
  button(h.render(), 'Сохранить').props.onClick();
  await flush();
  assert(input(h.render(), 'new@example.test'));
  assert(!nodes(h.render()).includes('Настройки раздела сохранены'));
  assert(nodes(h.render()).some(node => node?.props?.href === '/auth?next=%2Fprofile%2Fsettings%3Fsection%3Daccount'));
});

test('a new edit clears the previous success message', async () => {
  const h = await harness('account');
  input(h.render(), 'seller@example.test').props.onChange({ target: { value: 'new@example.test' } });
  button(h.render(), 'Сохранить').props.onClick();
  await flush();
  assert(nodes(h.render()).includes('Настройки раздела сохранены'));
  input(h.render(), 'new@example.test').props.onChange({ target: { value: 'second@example.test' } });
  assert(!nodes(h.render()).includes('Настройки раздела сохранены'));
});
