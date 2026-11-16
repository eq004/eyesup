/* Eyes Up — a ZIP written straight to the response, one file at a time.

   Video clips are too big to gather in memory on a small server (the whole
   ZIP of a class could be a gigabyte), so this writes a store-only ZIP as it
   goes: each entry's local header first, its bytes as they stream through,
   then a data descriptor with the size and checksum, and the central
   directory at the end. Any unzipper reads it. */
const { Readable } = require("stream");

const TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crcUpdate = (crc, buf) => { let c = crc; for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c; };

function dosStamp(d = new Date()) {
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { time, date };
}

/* entries: async iterable of { name, body } where body is a Buffer, a Node Readable or a web ReadableStream.
   out: a writable (the HTTP response). Resolves when the ZIP is complete. */
async function writeZip(out, entries) {
  const written = (buf) => new Promise((resolve, reject) => {
    if (out.destroyed) return reject(new Error("client gone"));
    if (out.write(buf)) resolve(); else out.once("drain", resolve);
  });
  const central = [];
  let offset = 0;
  const { time, date } = dosStamp();
  for await (const e of entries) {
    const name = Buffer.from(String(e.name), "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0808, 6); // bit 3: sizes follow the data; bit 11: UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    // crc and sizes come in the descriptor
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const start = offset;
    await written(Buffer.concat([local, name]));
    offset += local.length + name.length;
    let crc = 0xffffffff, size = 0;
    const src = Buffer.isBuffer(e.body) ? Readable.from([e.body]) : typeof e.body?.getReader === "function" ? Readable.fromWeb(e.body) : e.body;
    for await (const chunk of src) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      crc = crcUpdate(crc, buf);
      size += buf.length;
      await written(buf);
    }
    offset += size;
    crc = (crc ^ 0xffffffff) >>> 0;
    const desc = Buffer.alloc(16);
    desc.writeUInt32LE(0x08074b50, 0);
    desc.writeUInt32LE(crc, 4);
    desc.writeUInt32LE(size, 8);
    desc.writeUInt32LE(size, 12);
    await written(desc);
    offset += desc.length;
    central.push({ name, crc, size, start });
  }
  const cdStart = offset;
  for (const c of central) {
    const h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(20, 6);
    h.writeUInt16LE(0x0808, 8);
    h.writeUInt16LE(0, 10);
    h.writeUInt16LE(time, 12);
    h.writeUInt16LE(date, 14);
    h.writeUInt32LE(c.crc, 16);
    h.writeUInt32LE(c.size, 20);
    h.writeUInt32LE(c.size, 24);
    h.writeUInt16LE(c.name.length, 28);
    h.writeUInt16LE(0, 30);
    h.writeUInt16LE(0, 32);
    h.writeUInt16LE(0, 34);
    h.writeUInt16LE(0, 36);
    h.writeUInt32LE(0, 38);
    h.writeUInt32LE(c.start, 42);
    await written(Buffer.concat([h, c.name]));
    offset += h.length + c.name.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(offset - cdStart, 12);
  end.writeUInt32LE(cdStart, 16);
  end.writeUInt16LE(0, 20);
  await written(end);
  out.end();
}

module.exports = { writeZip };
