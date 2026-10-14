export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TEXT_FONT = '"Trebuchet MS", Verdana, sans-serif';

export function textStyle(size, color = '#ffffff', extra = {}) {
  return {
    fontFamily: TEXT_FONT,
    fontSize: size + 'px',
    color,
    fontStyle: 'bold',
    stroke: '#1a0b12',
    strokeThickness: Math.max(2, Math.round(size / 8)),
    ...extra,
  };
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
