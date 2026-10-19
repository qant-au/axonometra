// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { formatLength, fromMm, parseLength, toMm } from '../index';

test('fromMm and toMm convert between millimetres and each unit', () => {
  assert.equal(fromMm(2700, 'mm'), 2700);
  assert.equal(fromMm(2700, 'cm'), 270);
  assert.equal(fromMm(2700, 'm'), 2.7);
  assert.equal(toMm(270, 'cm'), 2700);
  assert.equal(toMm(2.7, 'm'), 2700);
  assert.equal(toMm(1.2345, 'm'), 1235, 'rounds to whole millimetres');
  assert.equal(toMm(-0.0001, 'm'), 0, 'never -0');
});

test('formatLength shows the unit to the nearest millimetre, without trailing zeros', () => {
  assert.equal(formatLength(2700, 'mm'), '2700 mm');
  assert.equal(formatLength(2700, 'cm'), '270 cm');
  assert.equal(formatLength(2705, 'cm'), '270.5 cm');
  assert.equal(formatLength(2700, 'm'), '2.7 m');
  assert.equal(formatLength(4000, 'm'), '4 m');
  assert.equal(formatLength(1234, 'm'), '1.234 m');
  assert.equal(formatLength(-150, 'm'), '-0.15 m');
  assert.equal(formatLength(0.4, 'mm'), '0 mm');
  assert.equal(formatLength(-0.4, 'mm'), '0 mm', 'never -0');
  assert.equal(formatLength(2700, 'm', { suffix: false }), '2.7');
});

test('parseLength reads mm, cm or m and a bare number in the current unit', () => {
  for (const text of ['2700', '2700mm', '2700 mm', '270cm', '270 CM', '2.7m', ' 2.7 M ', '+2.7 m']) {
    assert.equal(parseLength(text, 'mm'), 2700, text);
  }
  assert.equal(parseLength('2.7', 'm'), 2700);
  assert.equal(parseLength('270', 'cm'), 2700);
  assert.equal(parseLength('.5', 'm'), 500);
  assert.equal(parseLength('3.', 'm'), 3000);
  assert.equal(parseLength('-1.5 m', 'mm'), -1500);
});

test('parseLength rejects anything that is not one length', () => {
  for (const text of ['', ' ', 'm', '2.7 km', '2,7 m', '1.2.3', '2 m 30 cm', 'abc', '--1', '1e3']) {
    assert.equal(parseLength(text, 'mm'), null, JSON.stringify(text));
  }
});

test('imperial: fromMm and toMm work in inches, ft-in included', () => {
  assert.equal(fromMm(25.4, 'in'), 1);
  assert.equal(fromMm(254, 'ft-in'), 10);
  assert.equal(toMm(12, 'in'), 305);
});

test('formatLength shows inches and feet-and-inches to the nearest 1/16 inch', () => {
  assert.equal(formatLength(2700, 'in'), '106-5/16"');
  assert.equal(formatLength(2700, 'in', { suffix: false }), '106-5/16');
  assert.equal(formatLength(2700, 'ft-in'), `8'10-5/16"`);
  assert.equal(formatLength(2700, 'ft-in', { suffix: false }), `8'10-5/16"`);
  assert.equal(formatLength(2438, 'ft-in'), `8'`, '2438 mm is 7 ft 11.98 in, rounds to 8 ft');
  assert.equal(formatLength(254, 'ft-in'), '10"');
  assert.equal(formatLength(13, 'in'), '1/2"');
  assert.equal(formatLength(0, 'ft-in'), '0"');
  assert.equal(formatLength(-305, 'ft-in'), `-1'`);
  assert.equal(formatLength(-0.4, 'in'), '0"', 'never -0');
});

test('parseLength reads feet and inches in the usual spellings', () => {
  const inches = (n) => Math.round(n * 25.4);
  const cases = {
    '12"': 12,
    '12 in': 12,
    '12inches': 12,
    '10 1/2"': 10.5,
    '2-1/4"': 2.25,
    "6'2\"": 74,
    "8'10-1/2\"": 106.5,
    "8'-10-1/2\"": 106.5,
    '1/2 in': 0.5,
    "8'": 96,
    '8 ft': 96,
    '8.5 feet': 102,
    "8' 10\"": 106,
    "8'10\"": 106,
    "8'-10 1/2\"": 106.5,
    '8 ft 10 in': 106,
    "8' 10": 106,
    '8′ 10″': 106,
    "-1' 6\"": -18
  };
  for (const [text, n] of Object.entries(cases)) {
    for (const unit of ['mm', 'm', 'in', 'ft-in']) {
      assert.equal(parseLength(text, unit), inches(n), `${text} in ${unit}`);
    }
  }
});

test('parseLength: a bare number is inches in imperial units, and metric still works', () => {
  assert.equal(parseLength('10', 'in'), 254);
  assert.equal(parseLength('10 1/2', 'ft-in'), 267);
  assert.equal(parseLength('10-1/2', 'in'), 267);
  assert.equal(parseLength(formatLength(2700, 'in'), 'in'), 2700, 'round-trips');
  assert.equal(parseLength('2.7 m', 'ft-in'), 2700);
  assert.equal(parseLength('270cm', 'in'), 2700);
  assert.equal(parseLength(formatLength(2700, 'ft-in'), 'ft-in'), 2700, 'round-trips');
  for (const text of ['10 1/2', '2-1/4', '2--1/4"', "8' 10 5", '1/0"', "'", '"', "8'' 2", 'ft']) {
    assert.equal(parseLength(text, 'mm'), null, JSON.stringify(text));
  }
});
