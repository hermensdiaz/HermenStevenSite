export const GAME_W = 1280;
export const GAME_H = 720;

export const PLAYER = {
  maxHp: 100,
  speed: 235,
  accel: 0.22,
  mag: 12,            // balas por cargador (balas infinitas, pero hay que recargar)
  reloadMs: 1100,
  fireDelay: 150,
  bulletSpeed: 760,
  bulletLife: 850,
  bulletDmg: 1,
  batDmg: 3,
  batDelay: 430,
  batRange: 100,
  batArc: 1.3,        // radianes a cada lado de la mira
  dashSpeed: 640,
  dashMs: 170,
  dashCd: 1100,
};

export const ENEMY = {
  mamut:   { hp: 6, speed: 92,  dmg: 12, radius: 30, vr: 36 },
  barrita: { hp: 4, speed: 125, dmg: 6,  shotDmg: 9, radius: 19, vr: 24 },
};

export const DEPTH = {
  FLOOR: -100000,
  DECO: -50000,
  ACTOR: 1000000,   // + y  (orden por profundidad vista cenital)
  BULLET: 1500000,
  FX: 2000000,
};
