// UTF-16LE is used only for a declared teaching file; other downloads stay UTF-8.
export function encodeText(content, encoding = "utf8") {
  if (typeof content !== "string") throw new Error("Invalid text");
  if (encoding === "utf8") return new TextEncoder().encode(content);
  if (encoding !== "utf16le") throw new Error("Unsupported text encoding");
  const bytes = new Uint8Array(2 + content.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < content.length; i++)
    view.setUint16(2 + i * 2, content.charCodeAt(i), true);
  return bytes;
}
