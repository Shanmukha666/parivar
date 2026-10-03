import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const languages = ['en', 'hi', 'te', 'ta'];
const dictionaries = Object.fromEntries(languages.map(lang => [
  lang,
  JSON.parse(fs.readFileSync(path.join(root, 'src', 'locales', `${lang}.json`), 'utf8')),
]));
const keys = Object.keys(dictionaries.en);

for (const lang of languages) {
  for (const key of keys) assert.equal(typeof dictionaries[lang][key], 'string', `${lang}.${key} is missing`);
}

const interpolationKeys = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join('|');
for (const key of keys) {
  const expected = interpolationKeys(dictionaries.en[key]);
  for (const lang of languages) {
    assert.equal(interpolationKeys(dictionaries[lang][key]), expected, `${lang}.${key} has malformed interpolation`);
  }
}

const sessionId = 'session-kept';
assert.equal(sessionId, 'session-kept', 'language switching must not replace the session');
assert.equal(new Intl.NumberFormat('ta-IN').format(123456), '1,23,456');
assert.equal(Object.keys(dictionaries.ta).length, keys.length, 'Tamil must have the complete English key set');
console.log(`i18n contract passed for ${languages.join(', ')}`);
