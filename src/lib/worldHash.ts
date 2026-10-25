/** Deterministic cell hash shared by /world sprite variety and maze era skins. */
export function worldHash(x: number, y: number, s: number) {
  let a = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) >>> 0;
  a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;
  a = (a ^ (a >>> 16)) >>> 0;
  return a / 4294967296;
}
