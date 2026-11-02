/* =========================================================
   ESTRUCTURA SOFT 3D: réplica de la cabaña sobre pilotes
   - 6 bahías, techo a una sola agua (bajo al frente, alto atrás)
   - Medio muro frontal con ventanales, muro trasero completo
   - Fila central de postes, vigas, pilotes, descanso y escalera
   Unidades: metros. X = largo, Z = fondo (−Z frente), Y = altura
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.DIM = {
  bays: 6,
  bay: 4,              // ancho de cada bahía
  get length() { return this.bays * this.bay; }, // 24
  depth: 7,            // fondo interior
  frontH: 3.2,         // altura del techo al frente
  backH: 4.4,          // altura del techo atrás
  sill: 1.0,           // altura del medio muro (antepecho)
  header: 2.6,         // inicio del cabezal sobre ventanas
  stilt: 3.2,          // altura de los pilotes bajo el piso
  post: 0.32,          // grosor de postes
  wallT: 0.16,         // grosor de muros
  round: 0.07          // radio de redondeo de piezas
};

Lobby.buildStructure = function (scene, M, shadowGen) {
  const D = Lobby.DIM;
  const { roundedBox, beam } = Lobby.Shapes;
  const V = (x, y, z) => new BABYLON.Vector3(x, y, z);
  const X0 = -D.length / 2, X1 = D.length / 2;
  const ZF = -D.depth / 2, ZB = D.depth / 2;
  const R = D.round;
  const colliders = [];
  const buckets = {}; // meshes agrupados por material para unirlos al final

  const heightAt = (z) => D.frontH + ((z - ZF) / D.depth) * (D.backH - D.frontH);

  function add(mesh, material, collide) {
    const key = material.name + (collide ? "|c" : "");
    (buckets[key] = buckets[key] || { material, collide, meshes: [] }).meshes.push(mesh);
    return mesh;
  }

  // caja plana (para muros y piso, mantiene bien la textura de tablones)
  function box(name, x0, x1, y0, y1, z0, z1, material, collide) {
    const m = BABYLON.MeshBuilder.CreateBox(name, {
      width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), depth: Math.abs(z1 - z0)
    }, scene);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, material, collide);
  }

  // caja redondeada definida por esquinas
  function rbox(name, x0, x1, y0, y1, z0, z1, material, collide, r) {
    const m = roundedBox(name, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), r == null ? R : r, scene);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, material, collide);
  }

  // viga redondeada entre dos puntos
  function rbeam(name, p0, p1, w, h, material, collide, r) {
    return add(beam(name, p0, p1, w, h, r == null ? Math.min(w, h) * 0.35 : r, scene), material, collide);
  }

  // caja cuyas caras superior/inferior siguen funciones de Z (pendiente del techo)
  function slopedBox(name, x0, x1, z0, z1, yBottom, yTop, material, collide) {
    const m = BABYLON.MeshBuilder.CreateBox(name, { size: 1, updatable: true }, scene);
    const pos = m.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i] < 0 ? x0 : x1;
      const z = pos[i + 2] < 0 ? z0 : z1;
      const y = pos[i + 1] < 0 ? yBottom(z) : yTop(z);
      pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
    }
    m.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    const normals = [];
    BABYLON.VertexData.ComputeNormals(pos, m.getIndices(), normals);
    m.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    m.refreshBoundingInfo();
    return add(m, material, collide);
  }

  function invisibleWall(name, w, h, d, x, y, z) {
    const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    b.isVisible = false; b.isPickable = false; b.checkCollisions = true;
    colliders.push(b);
  }

  const p = D.post / 2;
  const bayX = [];
  for (let i = 0; i <= D.bays; i++) bayX.push(X0 + i * D.bay);

  /* ---------- Suelo exterior ---------- */
  const ground = BABYLON.MeshBuilder.CreateDisc("ground", { radius: 90, tessellation: 64 }, scene);
  ground.rotation.x = Math.PI / 2;
  ground.position.y = -D.stilt;
  ground.material = M.ground;
  ground.receiveShadows = true;
  ground.isPickable = false;

  /* ---------- Piso ---------- */
  box("floor", X0 - 0.2, X1 + 0.2, -0.28, 0, ZF - 0.2, ZB + 0.2, M.floor, true);
  rbox("rimFront", X0 - 0.25, X1 + 0.25, -0.7, -0.22, ZF - 0.25, ZF + 0.1, M.beam);
  rbox("rimBack", X0 - 0.25, X1 + 0.25, -0.7, -0.22, ZB - 0.1, ZB + 0.25, M.beam);
  rbox("rimMid", X0, X1, -0.62, -0.22, -0.14, 0.14, M.beam);
  rbox("rimLeft", X0 - 0.25, X0 + 0.1, -0.7, -0.22, ZF - 0.25, ZB + 0.25, M.beam);
  rbox("rimRight", X1 - 0.1, X1 + 0.25, -0.7, -0.22, ZF - 0.25, ZB + 0.25, M.beam);

  /* ---------- Pilotes ---------- */
  bayX.forEach((x, i) => {
    [ZF, 0, ZB].forEach((z, j) => {
      rbox(`stilt_${i}_${j}`, x - p, x + p, -D.stilt, -0.3, z - p, z + p, M.post);
    });
  });

  /* ---------- Postes perimetrales y centrales ---------- */
  bayX.forEach((x, i) => {
    rbox(`postF_${i}`, x - p, x + p, 0, D.frontH, ZF - p, ZF + p, M.post, true);
    rbox(`postB_${i}`, x - p, x + p, 0, D.backH, ZB - p, ZB + p, M.post, true);
    rbox(`postM_${i}`, x - p * 0.85, x + p * 0.85, 0, heightAt(0) - 0.3, -p * 0.85, p * 0.85, M.post, true);
  });

  /* ---------- Muro frontal: antepecho + cabezal (ventanales abiertos) ---------- */
  for (let i = 0; i < D.bays; i++) {
    const a = bayX[i] + p, b = bayX[i + 1] - p;
    box(`sillF_${i}`, a, b, 0, D.sill, ZF - D.wallT / 2, ZF + D.wallT / 2, M.wall, true);
    rbox(`sillCap_${i}`, a - 0.02, b + 0.02, D.sill - 0.02, D.sill + 0.09, ZF - 0.16, ZF + 0.16, M.beam, false, 0.045);
    box(`headF_${i}`, a, b, D.header, D.frontH, ZF - D.wallT / 2, ZF + D.wallT / 2, M.wall);
    rbox(`headCap_${i}`, a - 0.02, b + 0.02, D.header - 0.08, D.header + 0.02, ZF - 0.14, ZF + 0.14, M.beam, false, 0.04);
  }

  /* ---------- Muro trasero completo (donde van los cuadros) ---------- */
  for (let i = 0; i < D.bays; i++) {
    const a = bayX[i] + p, b = bayX[i + 1] - p;
    box(`wallB_${i}`, a, b, 0, D.backH, ZB - D.wallT / 2, ZB + D.wallT / 2, M.wall, true);
    // zoclo
    rbox(`baseB_${i}`, a, b, 0, 0.14, ZB - D.wallT / 2 - 0.05, ZB - D.wallT / 2 + 0.02, M.beam, false, 0.025);
  }

  /* ---------- Muro izquierdo: antepecho + cabezal inclinado ---------- */
  const lw = (n, z0, z1, yb, yt, col) =>
    slopedBox(n, X0 - D.wallT / 2, X0 + D.wallT / 2, z0, z1, yb, yt, M.wall, col);
  [[ZF + p, -p], [p, ZB - p]].forEach(([z0, z1], k) => {
    lw(`sillL_${k}`, z0, z1, () => 0, () => D.sill, true);
    lw(`headL_${k}`, z0, z1, (z) => heightAt(z) - 0.6, (z) => heightAt(z), false);
    rbox(`sillCapL_${k}`, X0 - 0.16, X0 + 0.16, D.sill - 0.02, D.sill + 0.09, z0, z1, M.beam, false, 0.045);
  });

  /* ---------- Muro derecho con puerta hacia el descanso ---------- */
  const doorZ0 = ZF + 0.5, doorZ1 = ZF + 1.9, doorH = 2.6;
  const rw = (n, z0, z1, yb, yt, col) =>
    slopedBox(n, X1 - D.wallT / 2, X1 + D.wallT / 2, z0, z1, yb, yt, M.wall, col);
  rw("wallR_a", ZF + p, doorZ0, () => 0, heightAt, true);
  rw("wallR_lintel", doorZ0, doorZ1, () => doorH, heightAt, true);
  rw("wallR_b", doorZ1, ZB - p, () => 0, heightAt, true);
  rbox("doorJamb0", X1 - 0.14, X1 + 0.14, 0, doorH, doorZ0 - 0.07, doorZ0 + 0.07, M.beam);
  rbox("doorJamb1", X1 - 0.14, X1 + 0.14, 0, doorH, doorZ1 - 0.07, doorZ1 + 0.07, M.beam);
  rbox("doorHead", X1 - 0.14, X1 + 0.14, doorH - 0.02, doorH + 0.14, doorZ0 - 0.1, doorZ1 + 0.1, M.beam);

  /* ---------- Vigas, techo y cielo raso ---------- */
  rbox("beamF", X0 - 0.1, X1 + 0.1, D.frontH - 0.36, D.frontH, ZF - 0.14, ZF + 0.14, M.beam);
  rbox("beamB", X0 - 0.1, X1 + 0.1, D.backH - 0.36, D.backH, ZB - 0.14, ZB + 0.14, M.beam);
  rbox("beamM", X0, X1, heightAt(0) - 0.36, heightAt(0) - 0.04, -0.13, 0.13, M.beam);
  bayX.forEach((x, i) => {
    const z0 = ZF - 0.35, z1 = ZB + 0.35;
    rbeam(`rafter_${i}`, V(x, heightAt(z0) - 0.17, z0), V(x, heightAt(z1) - 0.17, z1), 0.22, 0.3, M.beam);
  });
  // techo: losa exterior gruesa + cara interior clara
  slopedBox("roof", X0 - 0.6, X1 + 0.6, ZF - 0.8, ZB + 0.7,
    (z) => heightAt(z) + 0.02, (z) => heightAt(z) + 0.24, M.roof);
  slopedBox("ceiling", X0 - 0.1, X1 + 0.1, ZF - 0.2, ZB + 0.2,
    (z) => heightAt(z) - 0.01, (z) => heightAt(z) + 0.02, M.ceiling);
  // borde redondeado del alero (frente y atrás)
  rbeam("eaveF", V(X0 - 0.6, heightAt(ZF - 0.8) + 0.13, ZF - 0.8), V(X1 + 0.6, heightAt(ZF - 0.8) + 0.13, ZF - 0.8), 0.26, 0.26, M.roof);
  rbeam("eaveB", V(X0 - 0.6, heightAt(ZB + 0.7) + 0.13, ZB + 0.7), V(X1 + 0.6, heightAt(ZB + 0.7) + 0.13, ZB + 0.7), 0.26, 0.26, M.roof);

  /* ---------- Escritorio de recepción ---------- */
  rbox("desk", X0 + 1.2, X0 + 3.0, 0, 0.95, ZF + 1.0, ZF + 2.0, M.desk, true, 0.12);
  rbox("deskTop", X0 + 1.1, X0 + 3.1, 0.92, 1.04, ZF + 0.9, ZF + 2.1, M.beam, false, 0.06);

  /* =========================================================
     DESCANSO EXTERIOR + ESCALERA (barandal completo)
     ========================================================= */
  const LX0 = X1 + 0.15, LX1 = X1 + 2.6, LZ0 = ZF - 0.1, LZ1 = ZF + 3.2;
  const RAIL_H = 1.05, MID_H = 0.55;
  box("landing", LX0, LX1, -0.28, 0, LZ0, LZ1, M.floor, true);
  rbox("landingRim", LX0, LX1 + 0.05, -0.62, -0.22, LZ0 - 0.05, LZ1 + 0.05, M.beam);

  // pilotes del descanso que suben como postes del barandal
  const lp = p * 0.85;
  const landingPosts = [
    [LX1 - lp, LZ1 - lp],   // esquina exterior trasera
    [LX0 + lp, LZ1 - lp],   // junto a la cabaña
    [LX1 - lp, LZ0 + 1.6]   // medio del lado exterior
  ];
  landingPosts.forEach(([x, z], k) => {
    rbox(`landPost_${k}`, x - lp, x + lp, -D.stilt, RAIL_H + 0.1, z - lp, z + lp, M.post);
  });

  // escalera: baja hacia el frente (−Z) desde el borde del descanso
  const SX0 = LX0 + 0.3, SX1 = LX1 - 0.2;
  const steps = 13, rise = D.stilt / steps, run = 0.32;
  const stairLen = steps * run;
  const zEnd = LZ0 - stairLen;
  for (let s = 1; s < steps; s++) {
    const y = -s * rise;
    const z = LZ0 - s * run;
    rbox(`step_${s}`, SX0, SX1, y - 0.07, y, z, z + run + 0.02, M.stair, false, 0.03);
  }
  const railY = (z) => ((z - LZ0) / stairLen) * D.stilt + RAIL_H;

  [SX0 - 0.07, SX1 + 0.07].forEach((x, k) => {
    // larguero bajo los peldaños
    rbeam(`stringer_${k}`, V(x, -0.12, LZ0 + 0.05), V(x, -D.stilt + 0.05, zEnd - 0.05), 0.09, 0.32, M.beam);
    // poste de arranque (arriba) y de remate (abajo)
    rbox(`newelTop_${k}`, x - 0.08, x + 0.08, -0.3, RAIL_H + 0.12, LZ0 - 0.08, LZ0 + 0.08, M.post);
    rbox(`newelBot_${k}`, x - 0.08, x + 0.08, -D.stilt, -D.stilt + RAIL_H + 0.12, zEnd - 0.08, zEnd + 0.08, M.post);
    // pasamanos y travesaño medio de punta a punta
    rbeam(`handrail_${k}`, V(x, RAIL_H + 0.04, LZ0), V(x, -D.stilt + RAIL_H + 0.04, zEnd), 0.1, 0.08, M.beam);
    rbeam(`midrail_${k}`, V(x, MID_H, LZ0), V(x, -D.stilt + MID_H, zEnd), 0.06, 0.06, M.beam);
    // balaustres en cada peldaño
    for (let s = 1; s < steps; s++) {
      const zc = LZ0 - (s - 0.5) * run;
      const yb = -s * rise;
      rbox(`baluster_${k}_${s}`, x - 0.03, x + 0.03, yb - 0.05, railY(zc), zc - 0.03, zc + 0.03, M.beam, false, 0.02);
    }
  });

  // barandal del descanso: lado trasero y lado exterior completos
  const landingRail = (name, a, b) => {
    rbeam(name + "_top", a.add(V(0, RAIL_H, 0)), b.add(V(0, RAIL_H, 0)), 0.1, 0.08, M.beam, true);
    rbeam(name + "_mid", a.add(V(0, MID_H, 0)), b.add(V(0, MID_H, 0)), 0.06, 0.06, M.beam, true);
    const len = BABYLON.Vector3.Distance(a, b), n = Math.max(2, Math.round(len / 0.35));
    for (let i = 1; i < n; i++) {
      const q = BABYLON.Vector3.Lerp(a, b, i / n);
      rbox(`${name}_bal${i}`, q.x - 0.03, q.x + 0.03, 0, RAIL_H, q.z - 0.03, q.z + 0.03, M.beam, false, 0.02);
    }
  };
  landingRail("railBack", V(LX0 + 0.05, 0, LZ1 - lp), V(LX1 - lp, 0, LZ1 - lp));
  landingRail("railOuter", V(LX1 - lp, 0, LZ0 + 0.05), V(LX1 - lp, 0, LZ1 - lp));

  /* ---------- Colisiones invisibles ---------- */
  invisibleWall("stairBlock", SX1 - SX0 + 0.4, 3, 0.2, (SX0 + SX1) / 2, 1.5, LZ0 - 0.1);
  invisibleWall("invFront", D.length, 6, 0.2, 0, 3, ZF - 0.1);
  invisibleWall("invLeft", 0.2, 6, D.depth, X0 - 0.1, 3, 0);
  invisibleWall("invLandOuter", 0.2, 6, LZ1 - LZ0, LX1, 3, (LZ0 + LZ1) / 2);
  invisibleWall("invLandBack", LX1 - LX0, 6, 0.2, (LX0 + LX1) / 2, 3, LZ1);

  /* ---------- Unir por material (menos draw calls) ---------- */
  const meshes = [];
  Object.keys(buckets).forEach((key) => {
    const b = buckets[key];
    const merged = BABYLON.Mesh.MergeMeshes(b.meshes, true, true, undefined, false, false);
    merged.name = "struct_" + key;
    merged.material = b.material;
    merged.receiveShadows = true;
    merged.isPickable = true;
    if (b.collide) { merged.checkCollisions = true; colliders.push(merged); }
    if (shadowGen) shadowGen.addShadowCaster(merged);
    meshes.push(merged);
  });

  return {
    heightAt,
    bounds: { X0, X1, ZF, ZB },
    backWallInnerZ: ZB - D.wallT / 2,
    bayX,
    colliders,
    meshes,
    ground
  };
};
