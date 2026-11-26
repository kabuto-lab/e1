import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG_CITIES, CITIES, buildCityOptions } from './cities.ts';

const BASE_OPTIONS = [
  { value: '', label: 'Не указан' },
  { value: 'Москва', label: 'Москва' },
  { value: 'Санкт-Петербург', label: 'Санкт-Петербург' },
  { value: 'Казань', label: 'Казань' },
  { value: 'Сочи', label: 'Сочи' },
];

test('CITIES — точный список и порядок', () => {
  assert.deepEqual([...CITIES], ['Москва', 'Санкт-Петербург', 'Казань', 'Сочи']);
});

test('пустое значение (\'\', undefined, null) → «Не указан» + 4 города', () => {
  for (const current of ['', undefined, null]) {
    assert.deepEqual(buildCityOptions(current), BASE_OPTIONS);
  }
});

test('город из списка → без лишнего пункта', () => {
  assert.deepEqual(buildCityOptions('Казань'), BASE_OPTIONS);
});

test('город не из списка → добавляется пункт «(не из списка)»', () => {
  const options = buildCityOptions('СПб');
  assert.equal(options.length, 6);
  assert.deepEqual(options.slice(0, 5), BASE_OPTIONS);
  assert.deepEqual(options[5], { value: 'СПб', label: 'СПб (не из списка)' });
});

test('пробелы по краям значимы — «Москва » не из списка', () => {
  const options = buildCityOptions('Москва ');
  assert.equal(options.length, 6);
  assert.deepEqual(options.slice(0, 5), BASE_OPTIONS);
  assert.deepEqual(options[5], { value: 'Москва ', label: 'Москва  (не из списка)' });
});

test('CATALOG_CITIES — временно только Москва и подмножество CITIES', () => {
  assert.deepEqual([...CATALOG_CITIES], ['Москва']);
  for (const c of CATALOG_CITIES) {
    assert.ok((CITIES as readonly string[]).includes(c));
  }
});
