#!/usr/bin/env node
/** Validate every manifest entry, including modules loaded on demand. */
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const digest = data => createHash('sha256').update(data).digest('hex');
const read = path => readFile(resolve(root, path));
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

try {
  const head = JSON.parse(await read('release-head.json'));
  const manifestBytes = await read('release-manifest.json');
  const manifest = JSON.parse(manifestBytes);
  check(head.manifest_sha256 === digest(manifestBytes), 'release-head.json: manifesto divergente');
  for (const key of ['version', 'revision', 'asset_revision', 'cache_name', 'generated_at']) {
    check(head[key] === manifest[key], `${key}: cabeçalho e manifesto divergem`);
  }
  const seen = new Set();
  const essential = manifest.essential_files || [];
  const optional = manifest.optional_files || [];
  check(essential.length >= 8, 'Manifesto sem recursos essenciais suficientes');
  for (const entry of [...essential, ...optional]) {
    const path = String(entry.path || '');
    const local = resolve(root, path);
    const rel = relative(root, local);
    if (!path || rel.startsWith('..') || isAbsolute(rel)) {
      errors.push(`Caminho inválido: ${path}`);
      continue;
    }
    check(!seen.has(path), `Arquivo duplicado: ${path}`);
    seen.add(path);
    try {
      const bytes = await readFile(local);
      check(bytes.length === entry.size, `Tamanho divergente: ${path}`);
      check(digest(bytes) === entry.sha256, `Hash divergente: ${path}`);
    } catch {
      errors.push(`Arquivo ausente: ${path}`);
    }
  }
  const essentialBytes = essential.reduce((n, entry) => n + entry.size, 0);
  for (const [name, data] of [['head', head], ['manifest', manifest]]) {
    check(data.essential_count === essential.length, `${name}: essential_count divergente`);
    check(data.essential_bytes === essentialBytes, `${name}: essential_bytes divergente`);
  }
  const identityText = (await read('assets/nexlab-release-identity.js')).toString();
  const identity = JSON.parse(identityText.split('const identity=freeze(')[1].split(');root')[0]);
  for (const [key, field] of Object.entries({ version: 'version', revision: 'revision', assetRevision: 'asset_revision', cacheName: 'cache_name', generatedAt: 'generated_at' })) {
    check(identity[key] === head[field], `Identidade divergente: ${key}`);
  }
  const resources = [];
  const visit = value => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    else if (typeof value === 'string' && /^(assets|brand|icons)\//.test(value)) resources.push(value.split('?')[0]);
  };
  visit(identity.resources);
  visit(identity.pwa);
  for (const path of new Set(resources)) {
    try { await access(resolve(root, path)); } catch { errors.push(`Recurso declarado ausente: ${path}`); }
    check(seen.has(path), `Recurso sem integridade no manifesto: ${path}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`OK: ${essential.length} arquivos essenciais e ${optional.length} sob demanda; hashes, tamanhos e identidade conferidos.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
