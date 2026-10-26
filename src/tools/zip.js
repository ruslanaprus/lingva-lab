import { encodeText } from "./encoding.js";
// UTF-8 filenames; file content defaults to UTF-8, with explicit UTF-16LE support.
export function zipFiles(files) {
  if (!Array.isArray(files) || files.length > 1000)
    throw new Error("Invalid ZIP files");
  const encoder = new TextEncoder(),
    names = new Set();
  const entries = files.map(({ name, content, encoding = "utf8" }) => {
    if (
      typeof name !== "string" ||
      !name ||
      name.includes("\\") ||
      Array.from(name).some((char) => char.codePointAt(0) < 32) ||
      name.split("/").some((part) => !part || part === ".." || part === ".") ||
      names.has(name) ||
      typeof content !== "string"
    )
      throw new Error("Invalid ZIP entry");
    names.add(name);
    const filename = encoder.encode(name),
      bytes = encodeText(content, encoding);
    if (filename.length > 65535 || bytes.length > 1000000)
      throw new Error("ZIP entry too large");
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return { filename, bytes, crc: (crc ^ 0xffffffff) >>> 0 };
  });
  const locals = [],
    central = [];
  let offset = 0;
  for (const entry of entries) {
    const header = new Uint8Array(30 + entry.filename.length),
      view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(12, 0x21, true);
    view.setUint32(14, entry.crc, true);
    view.setUint32(18, entry.bytes.length, true);
    view.setUint32(22, entry.bytes.length, true);
    view.setUint16(26, entry.filename.length, true);
    header.set(entry.filename, 30);
    const directory = new Uint8Array(46 + entry.filename.length),
      d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x0800, true);
    d.setUint16(14, 0x21, true);
    d.setUint32(16, entry.crc, true);
    d.setUint32(20, entry.bytes.length, true);
    d.setUint32(24, entry.bytes.length, true);
    d.setUint16(28, entry.filename.length, true);
    d.setUint32(42, offset, true);
    directory.set(entry.filename, 46);
    locals.push(header, entry.bytes);
    central.push(directory);
    offset += header.length + entry.bytes.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(
    12,
    central.reduce((sum, part) => sum + part.length, 0),
    true,
  );
  e.setUint32(16, offset, true);
  return new Blob([...locals, ...central, end], { type: "application/zip" });
}
