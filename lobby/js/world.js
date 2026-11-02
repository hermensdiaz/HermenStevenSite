/* =========================================================
   MUNDO ABIERTO: terreno, río, estanques, caminos, puente,
   plaza con fuente, letrero de direcciones, las 7 maravillas
   con sus carteles, árboles, flores y nubes.
   La cabaña está en el origen; el suelo está a y = −3.2.
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.MAP = {
  radius: 330,                 // hasta dónde se puede caminar
  plaza: [10, -26],
  stream: [[72, -340], [58, -220], [70, -110], [52, -20], [60, 60], [62, 150], [78, 250], [70, 350]],
  bridge: { x0: 38, x1: 66, z: -20, width: 4.4, arch: 3.0 },
  ponds: [
    { x: -45, z: 45, r: 9 }, { x: 38, z: -62, r: 7 }, { x: -150, z: -150, r: 10 },
    { x: 98, z: 140, r: 9 }, { x: -62, z: 118, r: 8 }, { x: -30, z: -95, r: 7 }
  ],
  wall: [[-218, -178], [-203, -95], [-212, -20], [-197, 50], [-207, 130], [-192, 198]],
  // caminos (polilíneas [x, z])
  paths: [
    [[13.4, -8.4], [13.2, -12], [11.5, -17.5]],                                   // escalera → plaza
    [[10, -34.5], [8, -55], [3, -80], [0, -100]],                                  // → Chichén Itzá
    [[1.5, -27], [-25, -38]],                                                      // plaza → cruce oeste
    [[-25, -38], [-50, -48], [-72, -62]],                                          // → Coliseo
    [[-25, -38], [-45, -20], [-80, -5], [-130, 0], [-170, 8], [-188, 10]],         // → Gran Muralla
    [[-80, -5], [-88, 25], [-97, 50]],                                             // → Cristo Redentor
    [[18.6, -24], [30, -22], [38.5, -21]],                                         // plaza → puente
    [[66, -20], [80, -20]],                                                        // puente → cruce este
    [[80, -20], [92, -40], [100, -58]],                                            // → Taj Mahal
    [[80, -20], [95, 10], [108, 40], [118, 58]],                                   // → Machu Picchu
    [[30, -22], [35, -8], [36, 10], [32, 45], [22, 88], [2, 118], [-4, 146], [-7, 163]] // → Petra (por el Siq)
  ],
  // maravillas: centro, punto hacia el que mira su frente, cartel
  wonders: [
    { id: "chichen", center: [0, -145], face: [0, -100], pathEnd: [0, -100], prev: [3, -80] },
    { id: "coliseo", center: [-120, -82], face: [-72, -62], pathEnd: [-72, -62], prev: [-50, -48] },
    { id: "muralla", center: [-205, 10], face: [-188, 10], pathEnd: [-188, 10], prev: [-170, 8] },
    { id: "cristo", center: [-110, 95], face: [-97, 50], pathEnd: [-97, 50], prev: [-88, 25] },
    { id: "taj", center: [140, -110], face: [100, -58], pathEnd: [100, -58], prev: [92, -40] },
    { id: "machu", center: [150, 95], face: [118, 58], pathEnd: [118, 58], prev: [108, 40] },
    { id: "petra", center: [-8, 175], face: [2, 112], pathEnd: [22, 88], prev: [32, 45] }
  ]
};

Lobby.buildWorld = function (scene, shadowGen, S) {
  const MAP = Lobby.MAP;
  const G = -Lobby.DIM.stilt;
  const V = (x, y, z) => new BABYLON.Vector3(x, y, z);
  const mat = (hex, o) => Lobby.softMat(scene, hex, o);
  const { roundedBox, beam } = Lobby.Shapes;
  const colliders = [], walkables = [], obstacles = [], waterTests = [];

  /* ---------- utilidades ---------- */
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let seed = 1337;
  const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  function spline(pts, per) {
    if (pts.length < 3) {
      const out = [];
      const [a, b] = pts, n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
      return out;
    }
    const c = BABYLON.Curve3.CreateCatmullRomSpline(pts.map(([x, z]) => V(x, 0, z)), per || 10, false);
    return c.getPoints().map((p) => [p.x, p.z]);
  }
  function distToPolyline(x, z, pts) {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = clamp01(((x - ax) * dx + (z - az) * dz) / L2);
      const ex = ax + dx * t - x, ez = az + dz * t - z;
      const d = ex * ex + ez * ez;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  const streamPts = spline(MAP.stream, 24);
  const streamDist = (x, z) => (Math.abs(x - 64) > 60 ? 99 : distToPolyline(x, z, streamPts));
  const pathPts = MAP.paths.map((p) => spline(p, 8));
  const wallPts = spline(MAP.wall, 6);

  // zonas planas: cabaña, plaza, puente y base de cada maravilla
  const flatZones = [
    { x: 0, z: 0, r: 34 }, { x: MAP.plaza[0], z: MAP.plaza[1], r: 16 }, { x: 52, z: -20, r: 20 },
    { x: 0, z: -145, r: 46 }, { x: -120, z: -82, r: 58 }, { x: -110, z: 95, r: 42 },
    { x: 140, z: -110, r: 75 }, { x: 150, z: 95, r: 50 }, { x: -8, z: 175, r: 75 }
  ];

  /* ---------- altura del terreno ---------- */
  function heightAt(x, z) {
    let u = 0.85 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.018 + 0.4) + 0.45 * Math.sin((x - z) * 0.043);
    for (const f of flatZones) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + 25) u *= sstep(f.r, f.r + 25, d);
    }
    const r = Math.hypot(x, z);
    if (r > 270) {
      const ang = Math.atan2(z, x);
      u += sstep(270, 400, r) * (38 + 12 * Math.sin(ang * 5) + 8 * Math.sin(ang * 13 + 1));
    }
    const sd = streamDist(x, z);
    if (sd < 11) u -= 2.6 * sstep(11, 4, sd);
    for (const p of MAP.ponds) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r + 3) u -= 2.2 * sstep(p.r + 3, p.r - 1.5, d);
    }
    return G + u;
  }

  /* ---------- agua: ¿hay agua aquí? (bloquea el paso) ---------- */
  waterTests.push((x, z) => streamDist(x, z) < 7.8);
  MAP.ponds.forEach((p) => waterTests.push((x, z) => Math.hypot(x - p.x, z - p.z) < p.r + 0.9));
  waterTests.push((x, z) => Math.hypot(x - MAP.plaza[0], z - MAP.plaza[1]) < 3.4);
  const waterAt = (x, z) => waterTests.some((f) => f(x, z));

  /* =========================================================
     TERRENO
     ========================================================= */
  const SIZE = 820, SUB = 240;
  const ground = BABYLON.MeshBuilder.CreateGround("terrain", { width: SIZE, height: SIZE, subdivisions: SUB, updatable: true }, scene);
  const pos = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const cols = [];
  const grassA = BABYLON.Color3.FromHexString("#a6dbaa"), grassB = BABYLON.Color3.FromHexString("#bfe6b1");
  const sand = BABYLON.Color3.FromHexString("#f1dcb3"), wet = BABYLON.Color3.FromHexString("#cdbf9c");
  const hillA = BABYLON.Color3.FromHexString("#93cf9c"), hillTop = BABYLON.Color3.FromHexString("#d6eccb");
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], z = pos[i + 2];
    const y = heightAt(x, z);
    pos[i + 1] = y;
    const n = 0.5 + 0.5 * Math.sin(x * 0.11) * Math.cos(z * 0.13) * Math.sin((x + z) * 0.05);
    let c = BABYLON.Color3.Lerp(grassA, grassB, n);
    const r = Math.hypot(x, z);
    if (r > 280) c = BABYLON.Color3.Lerp(c, BABYLON.Color3.Lerp(hillA, hillTop, sstep(15, 45, y - G)), sstep(280, 330, r));
    let wd = streamDist(x, z) - 1;
    for (const p of MAP.ponds) wd = Math.min(wd, Math.hypot(x - p.x, z - p.z) - p.r + 1);
    if (wd < 13) c = BABYLON.Color3.Lerp(c, sand, sstep(13, 8, wd));
    if (wd < 7) c = BABYLON.Color3.Lerp(c, wet, sstep(7, 3, wd));
    cols.push(c.r, c.g, c.b, 1);
  }
  ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
  ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, cols);
  const gn = []; BABYLON.VertexData.ComputeNormals(pos, ground.getIndices(), gn);
  ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, gn);
  ground.material = mat("#ffffff", { vcol: true });
  ground.receiveShadows = true;
  ground.isPickable = false;
  ground.freezeWorldMatrix();

  /* =========================================================
     AGUA (río, estanques) con brillo animado
     ========================================================= */
  const waterTex = new BABYLON.DynamicTexture("waterTex", { width: 256, height: 256 }, scene, true);
  (function () {
    const c = waterTex.getContext();
    c.fillStyle = "#86cfee"; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      c.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.25})`;
      c.lineWidth = 1.5 + rnd() * 2;
      const x = rnd() * 256, y = rnd() * 256, w = 16 + rnd() * 30;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 4, x + w, y); c.stroke();
    }
    waterTex.update();
    waterTex.wrapU = waterTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  })();
  const water = new BABYLON.StandardMaterial("waterMat", scene);
  water.diffuseTexture = waterTex;
  water.emissiveColor = BABYLON.Color3.FromHexString("#4f9fc7").scale(0.35);
  water.specularColor = new BABYLON.Color3(0.5, 0.55, 0.6);
  water.specularPower = 48;
  water.alpha = 0.9;
  water.maxSimultaneousLights = 6;
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.00002;
    waterTex.vOffset = t * 3; waterTex.uOffset = Math.sin(t * 40) * 0.02;
  });

  // río: cinta que sigue el cauce
  (function () {
    const L = [], R = [];
    for (let i = 0; i < streamPts.length; i++) {
      const [x, z] = streamPts[i];
      const [nx0, nz0] = streamPts[Math.min(i + 1, streamPts.length - 1)];
      const [px0, pz0] = streamPts[Math.max(i - 1, 0)];
      let tx = nx0 - px0, tz = nz0 - pz0; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const y = G - 1.0;
      L.push(V(x - tz * 10, y, z + tx * 10)); R.push(V(x + tz * 10, y, z - tx * 10));
    }
    const rib = BABYLON.MeshBuilder.CreateRibbon("stream", { pathArray: [L, R], sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    rib.material = water; rib.isPickable = false; rib.receiveShadows = true;
    waterTex.uScale = 1; waterTex.vScale = 1;
  })();

  // estanques con rocas, nenúfares y juncos
  const deco = Lobby.Batch(scene, shadowGen, "deco");
  const dbox = (w, h, d, x, y, z, hex, r, opts, rotY) => {
    const m = r > 0 ? roundedBox("d", w, h, d, r, scene) : BABYLON.MeshBuilder.CreateBox("d", { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); if (rotY) m.rotation.y = rotY;
    return deco.add(m, mat(hex), opts);
  };
  const dcyl = (dt, db, h, x, y, z, hex, tess, opts) => {
    const m = BABYLON.MeshBuilder.CreateCylinder("c", { diameterTop: dt, diameterBottom: db, height: h, tessellation: tess || 16 }, scene);
    m.position.set(x, y, z); return deco.add(m, mat(hex), opts);
  };
  const dsph = (d, x, y, z, hex, sy, opts) => {
    const m = BABYLON.MeshBuilder.CreateSphere("s", { diameter: d, segments: 10 }, scene);
    m.position.set(x, y, z); if (sy) m.scaling.y = sy; return deco.add(m, mat(hex, opts && opts.glow ? { glow: true } : undefined), opts);
  };

  MAP.ponds.forEach((p, k) => {
    const disc = BABYLON.MeshBuilder.CreateDisc("pond" + k, { radius: p.r + 2.6, tessellation: 40 }, scene);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(p.x, G - 0.8, p.z);
    disc.material = water; disc.isPickable = false; disc.receiveShadows = true;
    const n = 12 + Math.floor(p.r);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.3, rr = p.r + 2.4 + rnd() * 1.2;
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      const s = 0.9 + rnd() * 1.1;
      dbox(s * 1.4, s, s * 1.2, x, heightAt(x, z) + s * 0.3, z, i % 3 ? "#d9d2e2" : "#cfc6d8", s * 0.4, null, a);
      obstacles.push({ x, z, r: s * 0.6 });
    }
    for (let i = 0; i < 5 + Math.floor(p.r / 2); i++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * (p.r - 1.5);
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      dcyl(1.6, 1.6, 0.06, x, G - 0.74, z, "#86c98e", 16, { cast: false });
      if (i % 2 === 0) dsph(0.45, x + 0.2, G - 0.58, z, "#f6a9c4", 0.7, { cast: false });
    }
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, rr = p.r + 0.8 + rnd();
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      for (let j = 0; j < 3; j++) dcyl(0.08, 0.12, 1.6 + rnd(), x + j * 0.25, G + 0.2, z + (j % 2) * 0.2, "#7fbf86", 6, { cast: false });
    }
  });

  /* =========================================================
     CAMINOS
     ========================================================= */
  const pathMat = mat("#f4ddb6"), edgeMat = mat("#e4c79c");
  function pathRibbon(pts, half, lift, material) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const [ax, az] = pts[Math.max(i - 1, 0)], [bx, bz] = pts[Math.min(i + 1, pts.length - 1)];
      let tx = bx - ax, tz = bz - az; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const lx = x - tz * half, lz = z + tx * half, rx = x + tz * half, rz = z - tx * half;
      L.push(V(lx, heightAt(lx, lz) + lift, lz)); R.push(V(rx, heightAt(rx, rz) + lift, rz));
    }
    const m = BABYLON.MeshBuilder.CreateRibbon("path", { pathArray: [L, R], sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    m.material = material; m.receiveShadows = true; m.isPickable = false;
    return m;
  }
  // los caminos se densifican para que sigan bien el terreno
  const dense = (pts) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2.5));
      for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const pathMeshes = [];
  pathPts.forEach((pts) => {
    const d = dense(pts);
    pathMeshes.push(pathRibbon(d, 2.5, 0.05, edgeMat), pathRibbon(d, 2.0, 0.09, pathMat));
  });
  BABYLON.Mesh.MergeMeshes(pathMeshes.filter((_, i) => i % 2 === 0), true, true).material = edgeMat;
  BABYLON.Mesh.MergeMeshes(pathMeshes.filter((_, i) => i % 2 === 1), true, true).material = pathMat;

  // farolitos a lo largo de los caminos
  pathPts.forEach((pts, k) => {
    const d = dense(pts);
    for (let i = 6; i < d.length - 3; i += 14) {
      const [x, z] = d[i], [bx, bz] = d[i + 1];
      let tx = bx - x, tz = bz - z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const side = (i / 14) % 2 ? 1 : -1;
      const lx = x - tz * 3.1 * side, lz = z + tx * 3.1 * side, ly = heightAt(lx, lz);
      dcyl(0.18, 0.24, 2.4, lx, ly + 1.2, lz, "#b47a52", 10);
      dsph(0.55, lx, ly + 2.6, lz, "#fff3cf", 1, { cast: false, glow: true });
      obstacles.push({ x: lx, z: lz, r: 0.3 });
    }
  });

  /* =========================================================
     PLAZA CON FUENTE
     ========================================================= */
  const [PX, PZ] = MAP.plaza;
  const plaza = BABYLON.MeshBuilder.CreateDisc("plaza", { radius: 10, tessellation: 48 }, scene);
  plaza.rotation.x = Math.PI / 2; plaza.position.set(PX, G + 0.1, PZ);
  plaza.material = mat("#f7e6cb"); plaza.receiveShadows = true; plaza.isPickable = false;
  const ring = BABYLON.MeshBuilder.CreateTorus("plazaRing", { diameter: 20, thickness: 0.7, tessellation: 64 }, scene);
  ring.position.set(PX, G + 0.05, PZ); deco.add(ring, mat("#e8cfa8"), { cast: false });
  const basin = BABYLON.MeshBuilder.CreateLathe("basin", {
    shape: [[0, 0.1], [3.4, 0.1], [3.7, 0.95], [3.3, 1.05], [3.05, 0.55], [0, 0.55]].map(([r, y]) => V(r, y, 0)),
    tessellation: 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE
  }, scene);
  basin.position.set(PX, G, PZ); deco.add(basin, mat("#f3e8df"));
  const fw = BABYLON.MeshBuilder.CreateDisc("fountainWater", { radius: 3.15, tessellation: 40 }, scene);
  fw.rotation.x = Math.PI / 2; fw.position.set(PX, G + 0.8, PZ); fw.material = water; fw.isPickable = false;
  dcyl(0.9, 1.1, 2.4, PX, G + 1.2, PZ, "#f3e8df", 20);
  const bowl = BABYLON.MeshBuilder.CreateLathe("bowl", {
    shape: [[0, 2.2], [1.7, 2.35], [1.85, 2.75], [0, 2.6]].map(([r, y]) => V(r, y, 0)),
    tessellation: 32, sideOrientation: BABYLON.Mesh.DOUBLESIDE
  }, scene);
  bowl.position.set(PX, G, PZ); deco.add(bowl, mat("#f3e8df"));
  dsph(0.9, PX, G + 3.1, PZ, "#bfe7f7", 1.4, { cast: false });
  const jet = BABYLON.MeshBuilder.CreateCylinder("jet", { diameterTop: 0.15, diameterBottom: 0.5, height: 1.4, tessellation: 12 }, scene);
  jet.position.set(PX, G + 3.8, PZ); jet.material = water; jet.isPickable = false;
  obstacles.push({ x: PX, z: PZ, r: 3.9 });
  // bancas alrededor
  [0.6, 2.2, 3.8, 5.3].forEach((a) => {
    const x = PX + Math.cos(a) * 7.3, z = PZ + Math.sin(a) * 7.3;
    dbox(2.4, 0.18, 0.7, x, G + 0.55, z, "#f7a96b", 0.08, null, -a + Math.PI / 2);
    dbox(2.0, 0.45, 0.5, x, G + 0.25, z, "#b47a52", 0.08, null, -a + Math.PI / 2);
    obstacles.push({ x, z, r: 1.0 });
  });

  /* ---------- letrero de direcciones ---------- */
  const signTexts = [];
  function textPlane(w, h, canvasW, canvasH, draw, emissive) {
    const tex = new BABYLON.DynamicTexture("txt", { width: canvasW, height: canvasH }, scene, true);
    draw(tex.getContext(), canvasW, canvasH);
    tex.update();
    tex.hasAlpha = true;
    const m = new BABYLON.StandardMaterial("txtMat", scene);
    m.diffuseTexture = tex; m.useAlphaFromDiffuseTexture = true;
    m.emissiveColor = new BABYLON.Color3(emissive || 0.45, emissive || 0.45, emissive || 0.45);
    m.specularColor = BABYLON.Color3.Black();
    m.maxSimultaneousLights = 6;
    const p = BABYLON.MeshBuilder.CreatePlane("txtPlane", { width: w, height: h }, scene);
    p.material = m; p.isPickable = false;
    signTexts.push(p);
    return p;
  }
  // coloca un plano de texto mirando hacia la dirección (fx, fz)
  function orientPlane(p, x, y, z, fx, fz) {
    p.position.set(x, y, z);
    p.rotation.y = Math.atan2(-fx, -fz);
  }

  (function signpost() {
    const sx = PX + 7.2, sz = PZ + 6.5, sy = heightAt(sx, sz);
    dcyl(0.35, 0.4, 6.6, sx, sy + 3.3, sz, "#b47a52", 12);
    dsph(0.6, sx, sy + 6.7, sz, "#f7a96b");
    obstacles.push({ x: sx, z: sz, r: 0.5 });
    MAP.wonders.forEach((w, k) => {
      const info = Lobby.WONDERS_INFO[w.id];
      let dx = w.center[0] - sx, dz = w.center[1] - sz; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      const y = sy + 1.7 + k * 0.62;
      const yaw = Math.atan2(dx, dz); // eje Z local apunta al destino
      const bx = sx + dx * 1.35, bz = sz + dz * 1.35;
      dbox(0.12, 0.5, 2.5, bx, y, bz, info.color, 0.05, null, yaw);
      dbox(0.12, 0.354, 0.354, sx + dx * 2.6, y, sz + dz * 2.6, info.color, 0.03, null, yaw).rotation.x = Math.PI / 4;
      // texto en ambas caras
      [1, -1].forEach((side) => {
        const nx = dz * side, nz = -dx * side; // normal de la cara
        const p = textPlane(2.3, 0.44, 512, 98, (c, W, H) => {
          c.clearRect(0, 0, W, H);
          c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle";
          let fs = 54;
          do { c.font = `900 ${fs}px Nunito, 'Trebuchet MS', sans-serif`; fs -= 2; } while (c.measureText(info.emoji + " " + info.name).width > W - 24 && fs > 20);
          c.shadowColor = "rgba(0,0,0,0.25)"; c.shadowBlur = 6;
          c.fillText(info.emoji + " " + info.name, W / 2, H / 2 + 3);
        }, 0.7);
        orientPlane(p, bx + nx * 0.075, y, bz + nz * 0.075, nx, nz);
      });
    });
    // cartelito superior (legible por ambos lados)
    const fx = PX - sx, fz = PZ - sz, fl = Math.hypot(fx, fz);
    [1, -1].forEach((side) => {
      const top = textPlane(3.2, 0.9, 640, 180, (c, W, H) => {
        c.fillStyle = "#fff8f1"; roundRect(c, 4, 4, W - 8, H - 8, 40); c.fill();
        c.fillStyle = "#5b3f33"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = "900 60px Nunito, 'Trebuchet MS', sans-serif"; c.fillText("Las 7 maravillas", W / 2, 70);
        c.font = "700 34px Nunito, 'Trebuchet MS', sans-serif"; c.fillStyle = "#c46f45"; c.fillText("Sigue los caminos", W / 2, 130);
      }, 0.6);
      const nx = (fx / fl) * side, nz = (fz / fl) * side;
      orientPlane(top, sx + nx * 0.02, sy + 7.6, sz + nz * 0.02, nx, nz);
    });
  })();

  /* =========================================================
     PUENTE ARQUEADO SOBRE EL RÍO
     ========================================================= */
  const BR = MAP.bridge;
  const deckY = (x) => G + 0.18 + BR.arch * Math.sin(Math.PI * clamp01((x - BR.x0) / (BR.x1 - BR.x0)));
  (function bridge() {
    const N = 34, hw = BR.width / 2, z = BR.z;
    for (let i = 0; i < N; i++) {
      const xa = BR.x0 + (BR.x1 - BR.x0) * i / N, xb = BR.x0 + (BR.x1 - BR.x0) * (i + 0.9) / N;
      deco.add(beam("plank", V(xa, deckY(xa) - 0.12, z), V(xb, deckY(xb) - 0.12, z), BR.width, 0.28, 0.08, scene), mat(i % 2 ? "#e0a978" : "#d49a6c"));
    }
    // vigas del arco por debajo
    [-hw + 0.3, hw - 0.3].forEach((dz) => {
      for (let i = 0; i < 16; i++) {
        const xa = BR.x0 + 1 + (BR.x1 - BR.x0 - 2) * i / 16, xb = BR.x0 + 1 + (BR.x1 - BR.x0 - 2) * (i + 1) / 16;
        deco.add(beam("arch", V(xa, deckY(xa) - 0.75, z + dz), V(xb, deckY(xb) - 0.75, z + dz), 0.35, 0.7, 0.12, scene), mat("#b47a52"));
      }
    });
    // barandales con postes y pasamanos
    [-hw - 0.05, hw + 0.05].forEach((dz) => {
      const M = 18;
      for (let i = 0; i <= M; i++) {
        const x = BR.x0 + (BR.x1 - BR.x0) * i / M;
        deco.add(roundedBox("bpost", 0.22, 1.3, 0.22, 0.06, scene), mat("#c98d63")).position.set(x, deckY(x) + 0.55, z + dz);
        if (i % 6 === 0) dsph(0.36, x, deckY(x) + 1.35, z + dz, "#fff3cf", 1, { cast: false });
        if (i < M) {
          const x2 = BR.x0 + (BR.x1 - BR.x0) * (i + 1) / M;
          deco.add(beam("rail", V(x, deckY(x) + 1.15, z + dz), V(x2, deckY(x2) + 1.15, z + dz), 0.18, 0.14, 0.06, scene), mat("#f08a6c"), { collide: true });
          deco.add(beam("rail2", V(x, deckY(x) + 0.6, z + dz), V(x2, deckY(x2) + 0.6, z + dz), 0.1, 0.1, 0.04, scene), mat("#f08a6c"), { collide: true });
        }
      }
    });
    // estribos de piedra
    [BR.x0 - 0.6, BR.x1 + 0.6].forEach((x) => {
      [-hw - 0.6, hw + 0.6].forEach((dz) => dbox(1.4, 1.4, 1.4, x, G + 0.5, z + dz, "#d9d2e2", 0.4, { collide: true }));
    });
    // superficie invisible para caminar sobre el arco
    const L = [], R = [];
    for (let i = 0; i <= 60; i++) {
      const x = BR.x0 - 0.5 + (BR.x1 - BR.x0 + 1) * i / 60;
      L.push(V(x, deckY(x) + 0.02, z - hw)); R.push(V(x, deckY(x) + 0.02, z + hw));
    }
    const walk = BABYLON.MeshBuilder.CreateRibbon("bridgeWalk", { pathArray: [L, R], sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    walk.isVisible = false; walk.metadata = { walk: true }; walk.isPickable = true;
    walkables.push(walk);
  })();

  /* =========================================================
     LAS 7 MARAVILLAS + CARTELES
     ========================================================= */
  const tour = [];
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function wrap(c, text, maxW) {
    const words = text.split(" "), lines = []; let line = "";
    words.forEach((w) => {
      const t = line ? line + " " + w : w;
      if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  function makeSign(info, x, z, fx, fz) {
    const y = heightAt(x, z);
    const yaw = Math.atan2(fx, fz);
    const px = Math.cos(yaw), pz = -Math.sin(yaw); // eje X local del cartel
    // postes, tablero y techito
    [-2.7, 2.7].forEach((o) => {
      dcyl(0.32, 0.38, 4.9, x + px * o, y + 2.45, z + pz * o, "#b47a52", 12);
      obstacles.push({ x: x + px * o, z: z + pz * o, r: 0.35 });
    });
    dbox(6.4, 4.1, 0.3, x, y + 2.75, z, "#fff7ee", 0.12, null, yaw);
    dbox(6.8, 0.35, 0.6, x, y + 4.95, z, info.color, 0.12, null, yaw);
    // texto en ambas caras
    [1, -1].forEach((side) => {
      const p = textPlane(6.1, 3.85, 1024, 646, (c, W, H) => {
        c.fillStyle = "#fff8f1"; c.fillRect(0, 0, W, H);
        c.fillStyle = info.color; roundRect(c, 24, 22, W - 48, 150, 34); c.fill();
        c.fillStyle = "#ffffff"; c.textBaseline = "middle"; c.textAlign = "left";
        c.font = "84px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
        c.fillText(info.emoji, 52, 100);
        let fs = 74;
        do { c.font = `900 ${fs}px Nunito, 'Trebuchet MS', sans-serif`; fs -= 2; } while (c.measureText(info.name).width > W - 230 && fs > 36);
        c.fillText(info.name, 160, 100);
        c.fillStyle = "#c46f45"; c.font = "800 34px Nunito, 'Trebuchet MS', sans-serif";
        c.fillText(info.place + "  ·  " + info.date, 44, 212);
        c.fillStyle = "#5b3f33"; c.font = "700 30px Nunito, 'Trebuchet MS', sans-serif";
        let ly = 270;
        info.facts.forEach((f) => {
          const lines = wrap(c, f, W - 120);
          lines.forEach((ln, i) => {
            if (i === 0) { c.fillStyle = info.color; c.beginPath(); c.arc(56, ly, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = "#5b3f33"; }
            c.fillText(ln, 80, ly); ly += 38;
          });
          ly += 10;
        });
        c.fillStyle = "#b49a8b"; c.font = "800 24px Nunito, 'Trebuchet MS', sans-serif"; c.textAlign = "right";
        c.fillText("Nueva maravilla del mundo · elegida en 2007", W - 40, H - 30);
      }, 0.55);
      const ox = Math.sin(yaw) * side, oz = Math.cos(yaw) * side;
      orientPlane(p, x + ox * 0.17, y + 2.75, z + oz * 0.17, ox, oz);
    });
  }

  const wonderMeshes = [];
  MAP.wonders.forEach((w) => {
    const info = Lobby.WONDERS_INFO[w.id];
    const batch = Lobby.Batch(scene, shadowGen, w.id);
    let meta;
    if (w.id === "muralla") {
      const K = Lobby.WonderKit(scene, batch, null);
      meta = Lobby.WonderBuilders.muralla(K, { points: wallPts, heightAt });
      colliders.push(...K.colliders);
    } else {
      const [cx, cz] = w.center;
      let dx = w.face[0] - cx, dz = w.face[1] - cz; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      const node = new BABYLON.TransformNode("wonder_" + w.id, scene);
      node.position.set(cx, heightAt(cx, cz), cz);
      node.rotation.y = Math.atan2(-dx, -dz);
      node.computeWorldMatrix(true);
      const K = Lobby.WonderKit(scene, batch, node);
      meta = Lobby.WonderBuilders[w.id](K);
      colliders.push(...K.colliders);
      // agua local (estanque del Taj Mahal)
      (meta.water || []).forEach((r) => {
        const th = node.rotation.y, c = Math.cos(th), s = Math.sin(th);
        waterTests.push((x, z) => {
          const wx = x - cx, wz = z - cz;
          const lx = wx * c - wz * s, lz = wx * s + wz * c;
          return lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1;
        });
      });
    }
    const out = batch.flush();
    colliders.push(...out.colliders);
    walkables.push(...out.walkables);
    wonderMeshes.push(...out.meshes);

    // cartel junto al final del camino, a un lado
    const [ex, ez] = w.pathEnd, [qx, qz] = w.prev;
    let tx = ex - qx, tz = ez - qz; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
    const sx = ex + tx * 1.5 + tz * 6.2, sz = ez + tz * 1.5 - tx * 6.2;
    makeSign(info, sx, sz, -tx, -tz);

    // punto de vista para el tour
    const vx = ex - tx * 15, vz = ez - tz * 15;
    const target = w.id === "muralla" ? V(-205, G + 8, 10) : V(w.center[0], heightAt(w.center[0], w.center[1]) + meta.height * 0.45, w.center[1]);
    tour.push({ id: w.id, name: info.name, emoji: info.emoji, pos: V(vx, heightAt(vx, vz) + 1.7, vz), target });
  });

  /* =========================================================
     ÁRBOLES, ARBUSTOS, FLORES Y ROCAS (thin instances)
     ========================================================= */
  const wonderClear = [
    { x: 0, z: -145, r: 48 }, { x: -120, z: -82, r: 56 }, { x: -110, z: 95, r: 44 },
    { x: 140, z: -110, r: 74 }, { x: 150, z: 95, r: 62 }, { x: -8, z: 160, r: 78 }
  ];
  function free(x, z, pad) {
    const r = Math.hypot(x, z);
    if (r > 345) return false;
    if (x > -26 && x < 26 && z > -16 && z < 12) return false;
    if (Math.hypot(x - PX, z - PZ) < 17) return false;
    if (x > BR.x0 - 6 && x < BR.x1 + 6 && Math.abs(z - BR.z) < 9) return false;
    for (const pts of pathPts) if (distToPolyline(x, z, pts) < 5 + pad) return false;
    for (const c of wonderClear) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return false;
    if (distToPolyline(x, z, wallPts) < 12 + pad) return false;
    if (streamDist(x, z) < 12 + pad) return false;
    for (const p of MAP.ponds) if (Math.hypot(x - p.x, z - p.z) < p.r + 5 + pad) return false;
    return true;
  }

  function base(name, parts) {
    const ms = parts.map(([kind, a, b, c, x, y, z, sy]) => {
      const m = kind === "s"
        ? BABYLON.MeshBuilder.CreateSphere(name, { diameter: a, segments: 10 }, scene)
        : BABYLON.MeshBuilder.CreateCylinder(name, { diameterTop: a, diameterBottom: b, height: c, tessellation: 10 }, scene);
      m.position.set(x, y, z); if (sy) m.scaling.y = sy;
      return m;
    });
    return ms.length > 1 ? BABYLON.Mesh.MergeMeshes(ms, true) : ms[0];
  }
  const kinds = {
    trunk: { mesh: base("trunk", [["c", 0.35, 0.55, 2.6, 0, 1.3, 0]]), mat: mat("#b98563") },
    crownA: { mesh: base("crownA", [["s", 3, 0, 0, 0, 3.4, 0, 0.95], ["s", 2.2, 0, 0, 0.9, 4.3, 0.2], ["s", 2.0, 0, 0, -0.9, 4.0, -0.3]]), mat: mat("#8fd19e") },
    crownB: { mesh: base("crownB", [["s", 3, 0, 0, 0, 3.4, 0, 0.95], ["s", 2.2, 0, 0, -0.8, 4.4, 0.4], ["s", 1.8, 0, 0, 0.9, 3.9, -0.4]]), mat: mat("#b5e3a1") },
    crownP: { mesh: base("crownP", [["s", 2.8, 0, 0, 0, 3.6, 0, 1.0], ["s", 1.6, 0, 0, 0.6, 4.6, 0]]), mat: mat("#f6b8cf") },
    pine: { mesh: base("pine", [["c", 0, 3.2, 3, 0, 2.6, 0], ["c", 0, 2.5, 2.6, 0, 4.0, 0], ["c", 0, 1.7, 2.2, 0, 5.3, 0]]), mat: mat("#7cc08b") },
    bush: { mesh: base("bush", [["s", 1.6, 0, 0, 0, 0.45, 0, 0.7], ["s", 1.1, 0, 0, 0.75, 0.35, 0.3, 0.7]]), mat: mat("#9fd6a0") },
    flowerP: { mesh: base("flowerP", [["s", 0.38, 0, 0, 0, 0.3, 0]]), mat: mat("#f7a8c4") },
    flowerY: { mesh: base("flowerY", [["s", 0.38, 0, 0, 0, 0.3, 0]]), mat: mat("#ffe08a") },
    flowerL: { mesh: base("flowerL", [["s", 0.38, 0, 0, 0, 0.3, 0]]), mat: mat("#c7b8ff") },
    rock: { mesh: roundedBox("rock", 1.6, 1.0, 1.3, 0.4, scene), mat: mat("#d4cddd") }
  };
  const mats = {};
  Object.keys(kinds).forEach((k) => { mats[k] = []; kinds[k].mesh.material = kinds[k].mat; kinds[k].mesh.isPickable = false; });
  const put = (k, x, y, z, s, ry) => mats[k].push(BABYLON.Matrix.Compose(V(s, s, s), BABYLON.Quaternion.RotationYawPitchRoll(ry || 0, 0, 0), V(x, y, z)));

  for (let i = 0, placed = 0; i < 1400 && placed < 190; i++) {
    const x = (rnd() * 2 - 1) * 340, z = (rnd() * 2 - 1) * 340;
    if (!free(x, z, 2)) continue;
    const y = heightAt(x, z), s = 1.0 + rnd() * 0.8;
    const t = rnd();
    if (t < 0.25) put("pine", x, y, z, s, rnd() * 6);
    else {
      put("trunk", x, y, z, s, 0);
      put(t < 0.6 ? "crownA" : t < 0.9 ? "crownB" : "crownP", x, y, z, s, rnd() * 6);
    }
    obstacles.push({ x, z, r: 0.45 * s });
    placed++;
  }
  // árboles cerca de la cabaña para enmarcar la vista
  [[-30, -14], [-34, 10], [30, 18], [-22, 22], [26, -40], [-12, -48]].forEach(([x, z], i) => {
    if (!free(x, z, 0)) return;
    const y = heightAt(x, z);
    put("trunk", x, y, z, 1.3, 0); put(i % 2 ? "crownA" : "crownP", x, y, z, 1.3, i);
    obstacles.push({ x, z, r: 0.6 });
  });
  for (let i = 0, placed = 0; i < 1600 && placed < 170; i++) {
    const x = (rnd() * 2 - 1) * 320, z = (rnd() * 2 - 1) * 320;
    if (!free(x, z, -1.5)) continue;
    put("bush", x, heightAt(x, z), z, 0.8 + rnd() * 0.9, rnd() * 6); placed++;
  }
  for (let i = 0, placed = 0; i < 1600 && placed < 60; i++) {
    const cx = (rnd() * 2 - 1) * 300, cz = (rnd() * 2 - 1) * 300;
    if (!free(cx, cz, -2)) continue;
    const k = ["flowerP", "flowerY", "flowerL"][placed % 3];
    for (let j = 0; j < 9; j++) {
      const x = cx + (rnd() - 0.5) * 4, z = cz + (rnd() - 0.5) * 4;
      put(k, x, heightAt(x, z), z, 0.8 + rnd() * 0.6, 0);
    }
    placed++;
  }
  for (let i = 0, placed = 0; i < 1000 && placed < 50; i++) {
    const x = (rnd() * 2 - 1) * 320, z = (rnd() * 2 - 1) * 320;
    if (!free(x, z, 0)) continue;
    const s = 0.8 + rnd() * 1.6;
    put("rock", x, heightAt(x, z) + 0.3 * s, z, s, rnd() * 6);
    obstacles.push({ x, z, r: 0.75 * s });
    placed++;
  }
  Object.keys(kinds).forEach((k) => {
    const m = kinds[k].mesh;
    if (!mats[k].length) { m.setEnabled(false); return; }
    const buf = new Float32Array(mats[k].length * 16);
    mats[k].forEach((mm, i) => mm.copyToArray(buf, i * 16));
    m.thinInstanceSetBuffer("matrix", buf, 16, true);
    m.receiveShadows = true;
    if (shadowGen && !k.startsWith("flower")) shadowGen.addShadowCaster(m);
  });

  /* =========================================================
     NUBES SUAVES
     ========================================================= */
  const cloudMat = mat("#ffffff", { glow: true });
  cloudMat.alpha = 0.95;
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const parts = [];
    const n = 4 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const s = BABYLON.MeshBuilder.CreateSphere("cl", { diameter: 8 + rnd() * 8, segments: 10 }, scene);
      s.position.set(j * 5 - n * 2.5, rnd() * 3, (rnd() - 0.5) * 6);
      s.scaling.y = 0.6;
      parts.push(s);
    }
    const c = BABYLON.Mesh.MergeMeshes(parts, true);
    c.material = cloudMat; c.isPickable = false;
    const a = rnd() * Math.PI * 2, r = 60 + rnd() * 240;
    c.position.set(Math.cos(a) * r, 70 + rnd() * 45, Math.sin(a) * r);
    c.scaling.setAll(0.8 + rnd() * 0.8);
    clouds.push({ m: c, v: 0.6 + rnd() * 0.8 });
  }
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    clouds.forEach((c) => {
      c.m.position.x += c.v * dt;
      if (c.m.position.x > 330) c.m.position.x = -330;
    });
  });

  /* ---------- colisiones y caminables de la decoración ---------- */
  const dOut = deco.flush();
  colliders.push(...dOut.colliders);
  walkables.push(...dOut.walkables);

  return {
    heightAt, waterAt, walkables, colliders, obstacles, tour,
    radius: MAP.radius, ground
  };
};
