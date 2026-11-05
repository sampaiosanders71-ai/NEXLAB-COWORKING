import assert from 'node:assert/strict';
import { downloadImage, extractPreview } from '../supabase/functions/nexlab-mural-link-preview/preview.ts';

// The CDN may close TLS without close_notify after a complete HTTP response.
// Completed Content-Length and chunked bodies must not require another read.
const jpeg = Uint8Array.of(255,216,255,224,0,4,1,2,3,4,255,217);
const encoder = new TextEncoder();
let queued = [], addresses = ['93.184.216.34'];
const connections = [];
globalThis.Deno = {
  resolveDns: async () => addresses,
  connect: async options => {
    connections.push(options);
    const data = queued.shift();
    assert(data, 'Unexpected connection');
    let offset = 0;
    return {
      write: async bytes => bytes.length,
      read: async target => {
        if (offset >= data.length) throw Error('peer closed connection without sending TLS close_notify');
        const size = Math.min(target.length, 17, data.length - offset);
        target.set(data.subarray(offset, offset + size)); offset += size;
        return size;
      },
      close() {}
    };
  },
  startTls: async connection => connection
};
const join = (...parts) => {
  const bytes = parts.map(part => typeof part === 'string' ? encoder.encode(part) : part);
  const result = new Uint8Array(bytes.reduce((size, part) => size + part.length, 0));
  let offset = 0; for (const part of bytes) { result.set(part, offset); offset += part.length; }
  return result;
};
queued = [join(`HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`, jpeg)];
assert.deepEqual((await downloadImage('https://media.example/cover.jpg')).bytes, jpeg);
assert.equal(connections[0].hostname, addresses[0]);
queued = [join('HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nTransfer-Encoding: chunked\r\n\r\n', jpeg.length.toString(16)+'\r\n', jpeg, '\r\n0\r\n\r\n')];
assert.deepEqual((await downloadImage('https://media.example/chunked.jpg')).bytes, jpeg);
queued = [join(`HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length + 1}\r\n\r\n`, jpeg)];
await assert.rejects(() => downloadImage('https://media.example/truncated.jpg'));
queued = [join('HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: 5242881\r\n\r\n')];
await assert.rejects(() => downloadImage('https://media.example/oversized.jpg'));
queued = [join('HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1/private\r\n\r\n')];
await assert.rejects(() => downloadImage('https://media.example/redirect.jpg'));
const count = connections.length;
addresses = ['93.184.216.34', '127.0.0.1'];
await assert.rejects(() => downloadImage('https://media.example/mixed-dns.jpg'));
assert.equal(connections.length, count);
addresses = ['93.184.216.34'];
const html = '<head><meta property="og:image" content="https://media.example/cover.jpg"></head>';
queued = [join(`HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${encoder.encode(html).length}\r\n\r\n`, html)];
assert.equal(await extractPreview('https://source.example/post'), 'https://media.example/cover.jpg');
console.log('OK: HTTP completion without TLS close_notify, truncated and oversized bodies, private redirects and mixed DNS.');
