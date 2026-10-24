export function exportTextGrid(start, end, label) {
  return `File type = "ooTextFile"\nObject class = "TextGrid"\n\nxmin = 0\nxmax = 1.8\ntiers? <exists>\nsize = 1\nitem []:\n    item [1]:\n        class = "IntervalTier"\n        name = "segments"\n        xmin = 0\n        xmax = 1.8\n        intervals: size = 3\n        intervals [1]:\n            xmin = 0\n            xmax = ${start}\n            text = ""\n        intervals [2]:\n            xmin = ${start}\n            xmax = ${end}\n            text = "${String(label).replaceAll('"', '""')}"\n        intervals [3]:\n            xmin = ${end}\n            xmax = 1.8\n            text = ""\n`;
}

export function signalSample(t) {
  const segment = t < 0.6 ? 0 : t < 1.1 ? 1 : 2,
    starts = [0, 0.6, 1.1],
    ends = [0.6, 1.1, 1.8],
    edge = Math.min(1, (t - starts[segment]) / 0.04, (ends[segment] - t) / 0.04);
  return (
    0.65 * Math.max(0, edge) * Math.sin(2 * Math.PI * [180, 260, 340][segment] * t)
  );
}

export function signalWav() {
  const rate = 16000,
    length = Math.round(rate * 1.8),
    buffer = new ArrayBuffer(44 + length * 2),
    v = new DataView(buffer);
  const text = (offset, s) =>
    [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++)
    v.setInt16(44 + i * 2, Math.round(signalSample(i / rate) * 32767), true);
  return buffer;
}
