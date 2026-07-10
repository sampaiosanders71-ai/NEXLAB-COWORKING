import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const index = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('nexlab-sw.js');

assert.match(index, /name="nexlab-version" content="26\.7"/, 'index.html não declara v26.7');
assert.equal(manifest.name, 'NEXLAB');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifesto precisa de quatro ícones');
assert.match(sw, /nexlab-v26-7-shell-r1/, 'Service Worker não usa cache v26.7');
assert.match(index, /Content-Security-Policy/, 'CSP não encontrada');
assert.doesNotMatch(index, /http:\/\//, 'Referência HTTP insegura encontrada');

const references = [...index.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^" ]*)?"/g)].map((match) => match[1]);
for (const reference of references) {
  assert.ok(exists(reference.slice(2)), `Arquivo referenciado ausente: ${reference}`);
}

const shellBlock = sw.match(/const SHELL_FILES = \[(.*?)\];/s)?.[1] || '';
const shellFiles = [...shellBlock.matchAll(/"(\.\/[^"?]+)(?:\?[^" ]*)?"/g)].map((match) => match[1]);
for (const file of shellFiles) {
  if (file === './') continue;
  assert.ok(exists(file.slice(2)), `Arquivo do shell ausente: ${file}`);
}

for (const icon of manifest.icons) {
  assert.ok(exists(icon.src), `Ícone ausente: ${icon.src}`);
}

const jsFiles = [
  'assets/index-CKPsxFpP.js',
  'assets/nexlab-bootstrap-v26-7.js',
  'assets/nexlab-visual-v26-7.js',
  'nexlab-sw.js'
];
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Sintaxe inválida em ${file}: ${result.stderr}`);
}

assert.ok(exists('supabase/supabase_v26_4_1_seguranca_integridade_CORRIGIDO.sql'), 'Migration de segurança corrigida ausente');
assert.ok(exists('homologacao.html'), 'Página de homologação ausente');
assert.ok(exists('RELATORIO_NEXLAB_V26_7.html'), 'Relatório da v26.7 ausente');
assert.ok(exists('prontidao.html'), 'Página de prontidão ausente');
assert.ok(exists('release.json'), 'release.json ausente');
assert.ok(exists('supabase/supabase_v26_7_observabilidade_prontidao.sql'), 'Migration v26.7 ausente');
const release = JSON.parse(read('release.json'));
assert.equal(release.version, '26.7', 'release.json não informa v26.7');

console.log(`NEXLAB v26.7: ${references.length} referências, ${shellFiles.length} arquivos de shell e ${jsFiles.length} scripts validados.`);