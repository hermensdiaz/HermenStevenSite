/* =========================================================
   ESTRUCTURA: réplica de la cabaña sobre pilotes de Blender
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
  post: 0.3,           // grosor de postes
  wallT: 0.16          // grosor de muros
};

Lobby.buildStructure = function (scene, M, shadowGen) {
  const D = Lobby.DIM;
  const X0 = -D.length / 2, X1 = D.length / 2;
  const ZF = -D.depth / 2, ZB = D.depth / 2;
  const colliders = [];
  const all = [];

  const heightAt = (z) => D.frontH + ((z - ZF) / D.depth) * (D.backH - D.frontH);

  function register(mesh, material, collide) {
    mesh.material = material;
    mesh.receiveShadows = true;
    if (shadowGen) shadowGen.addShadowCaster(mesh);
    if (collide) { mesh.checkCollisions = true; colliders.push(mesh); }
    all.push(mesh);
    return mesh;
  }

  // Caja alineada a ejes definida por esquinas
  function box(name, x0, x1, y0, y1, z0, z1, material, collide) {
    const m = BABYLON.MeshBuilder.CreateBox(name, {
      width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), depth: Math.abs(z1 - z0)
    }, scene);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return register(m, material, collide);
  }

  // Caja cuyas caras superior/inferior siguen funciones de Z (para la pendiente)
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
    return register(m, material, collide);
  }

  const p = D.post / 2;
  const bayX = [];
  for (let i = 0; i <= D.bays; i++) bayX.push(X0 + i * D.bay);

  /* ---------- Suelo exterior ---------- */
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 160, height: 160 }, scene);
  ground.position.y = -D.stilt;
  ground.material = M.ground;
  ground.receiveShadows = true;

  /* ---------- Piso ---------- */
  box("floor", X0 - 0.15, X1 + 0.15, -0.25, 0, ZF - 0.15, ZB + 0.15, M.floor, true);
  // vigas perimetrales bajo el piso
  box("rimFront", X0 - 0.15, X1 + 0.15, -0.65, -0.25, ZF - 0.15, ZF + 0.1, M.beam);
  box("rimBack", X0 - 0.15, X1 + 0.15, -0.65, -0.25, ZB - 0.1, ZB + 0.15, M.beam);
  box("rimMid", X0, X1, -0.6, -0.25, -0.12, 0.12, M.beam);

  /* ---------- Pilotes ---------- */
  bayX.forEach((x, i) => {
    [ZF, 0, ZB].forEach((z, j) => {
      box(`stilt_${i}_${j}`, x - p, x + p, -D.stilt, -0.25, z - p, z + p, M.post);
    });
  });

  /* ---------- Postes perimetrales y centrales ---------- */
  bayX.forEach((x, i) => {
    box(`postF_${i}`, x - p, x + p, 0, D.frontH, ZF - p, ZF + p, M.post, true);
    box(`postB_${i}`, x - p, x + p, 0, D.backH, ZB - p, ZB + p, M.post, true);
    // fila central (como en tu interior de Blender)
    box(`postM_${i}`, x - p * 0.85, x + p * 0.85, 0, heightAt(0) - 0.3, -p * 0.85, p * 0.85, M.post, true);
  });

  /* ---------- Muro frontal: antepecho + cabezal (ventanales abiertos) ---------- */
  for (let i = 0; i < D.bays; i++) {
    const a = bayX[i] + p, b = bayX[i + 1] - p;
    box(`sillF_${i}`, a, b, 0, D.sill, ZF - D.wallT / 2, ZF + D.wallT / 2, M.wall, true);
    box(`sillCap_${i}`, a, b, D.sill, D.sill + 0.08, ZF - 0.14, ZF + 0.14, M.beam);
    box(`headF_${i}`, a, b, D.header, D.frontH, ZF - D.wallT / 2, ZF + D.wallT / 2, M.wall);
  }

  /* ---------- Muro trasero completo (donde van los cuadros) ---------- */
  for (let i = 0; i < D.bays; i++) {
    const a = bayX[i] + p, b = bayX[i + 1] - p;
    box(`wallB_${i}`, a, b, 0, D.backH, ZB - D.wallT / 2, ZB + D.wallT / 2, M.wall, true);
  }

  /* ---------- Muro izquierdo: antepecho + cabezal inclinado ---------- */
  const lw = (n, z0, z1, yb, yt, col) =>
    slopedBox(n, X0 - D.wallT / 2, X0 + D.wallT / 2, z0, z1, yb, yt, M.wall, col);
  [[ZF + p, -p], [p, ZB - p]].forEach(([z0, z1], k) => {
    lw(`sillL_${k}`, z0, z1, () => 0, () => D.sill, true);
    lw(`headL_${k}`, z0, z1, (z) => heightAt(z) - 0.6, (z) => heightAt(z), false);
  });

  /* ---------- Muro derecho con puerta hacia el descanso ---------- */
  const doorZ0 = ZF + 0.5, doorZ1 = ZF + 1.9, doorH = 2.6;
  const rw = (n, z0, z1, yb, yt, col) =>
    slopedBox(n, X1 - D.wallT / 2, X1 + D.wallT / 2, z0, z1, yb, yt, M.wall, col);
  rw("wallR_a", ZF + p, doorZ0, () => 0, heightAt, true);
  rw("wallR_lintel", doorZ0, doorZ1, () => doorH, heightAt, true);
  rw("wallR_b", doorZ1, ZB - p, () => 0, heightAt, true);
  // marco de la puerta
  box("doorJamb0", X1 - 0.12, X1 + 0.12, 0, doorH, doorZ0 - 0.06, doorZ0 + 0.06, M.beam);
  box("doorJamb1", X1 - 0.12, X1 + 0.12, 0, doorH, doorZ1 - 0.06, doorZ1 + 0.06, M.beam);
  box("doorHead", X1 - 0.12, X1 + 0.12, doorH, doorH + 0.12, doorZ0 - 0.06, doorZ1 + 0.06, M.beam);

  /* ---------- Vigas y techo ---------- */
  box("beamF", X0, X1, D.frontH - 0.35, D.frontH, ZF - 0.12, ZF + 0.12, M.beam);
  box("beamB", X0, X1, D.backH - 0.35, D.backH, ZB - 0.12, ZB + 0.12, M.beam);
  box("beamM", X0, X1, heightAt(0) - 0.35, heightAt(0) - 0.05, -0.12, 0.12, M.beam);
  bayX.forEach((x, i) => {
    slopedBox(`rafter_${i}`, x - 0.11, x + 0.11, ZF - 0.3, ZB + 0.3,
      (z) => heightAt(z) - 0.32, (z) => heightAt(z), M.beam);
  });
  slopedBox("roof", X0 - 0.5, X1 + 0.5, ZF - 0.7, ZB + 0.6,
    (z) => heightAt(z), (z) => heightAt(z) + 0.14, M.roof);

  /* ---------- Escritorio de recepción (la caja naranja) ---------- */
  box("desk", X0 + 1.2, X0 + 3.0, 0, 0.95, ZF + 1.0, ZF + 2.0, M.desk, true);
  box("deskTop", X0 + 1.1, X0 + 3.1, 0.95, 1.02, ZF + 0.9, ZF + 2.1, M.beam);

  /* ---------- Descanso exterior + barandal ---------- */
  const LX0 = X1 + 0.15, LX1 = X1 + 2.6, LZ0 = ZF - 0.1, LZ1 = ZF + 3.2;
  box("landing", LX0, LX1, -0.25, 0, LZ0, LZ1, M.floor, true);
  [[LX1 - p, LZ1 - p], [LX1 - p, LZ0 + p], [LX0 + 0.6, LZ1 - p]].forEach(([x, z], k) => {
    box(`landStilt_${k}`, x - p * 0.8, x + p * 0.8, -D.stilt, 1.05, z - p * 0.8, z + p * 0.8, M.post);
  });
  box("railBack", LX0, LX1, 0.95, 1.08, LZ1 - 0.08, LZ1 + 0.02, M.beam, true);
  box("railSide", LX1 - 0.1, LX1, 0.95, 1.08, LZ0 + 1.8, LZ1, M.beam, true);
  box("railSideLow", LX1 - 0.1, LX1, 0.45, 0.55, LZ0 + 1.8, LZ1, M.beam, true);
  box("railBackLow", LX0, LX1, 0.45, 0.55, LZ1 - 0.08, LZ1 + 0.02, M.beam, true);

  /* ---------- Escalera (baja hacia el frente) ---------- */
  const SX0 = LX0 + 0.25, SX1 = LX1 - 0.15;
  const steps = 13, rise = D.stilt / steps, run = 0.32;
  for (let s = 1; s <= steps; s++) {
    const y = -s * rise;
    const z = LZ0 - s * run;
    box(`step_${s}`, SX0, SX1, y - 0.05, y, z, z + run * 0.9, M.stair);
  }
  const stairLen = steps * run;
  [SX0 - 0.06, SX1 + 0.06].forEach((x, k) => {
    // largueros y pasamanos como cajas inclinadas
    slopedBox(`stringer_${k}`, x - 0.05, x + 0.05, LZ0 - stairLen - 0.2, LZ0,
      (z) => ((z - LZ0) / stairLen) * D.stilt - 0.35,
      (z) => ((z - LZ0) / stairLen) * D.stilt + 0.05, M.stair);
    slopedBox(`handrail_${k}`, x - 0.04, x + 0.04, LZ0 - stairLen, LZ0,
      (z) => ((z - LZ0) / stairLen) * D.stilt + 0.95,
      (z) => ((z - LZ0) / stairLen) * D.stilt + 1.03, M.stair);
  });
  // barrera invisible para no "caer" por la escalera
  const stairBlock = BABYLON.MeshBuilder.CreateBox("stairBlock", { width: 3, height: 3, depth: 0.2 }, scene);
  stairBlock.position.set((LX0 + LX1) / 2, 1.5, LZ0 - 0.2);
  stairBlock.isVisible = false;
  stairBlock.checkCollisions = true;
  stairBlock.isPickable = false;
  colliders.push(stairBlock);

  // muros invisibles altos para que no se salga por los ventanales
  const inv = (n, w, d, x, z) => {
    const b = BABYLON.MeshBuilder.CreateBox(n, { width: w, height: 6, depth: d }, scene);
    b.position.set(x, 3, z);
    b.isVisible = false; b.isPickable = false; b.checkCollisions = true;
    colliders.push(b);
  };
  inv("invFront", D.length, 0.2, 0, ZF - 0.1);
  inv("invLeft", 0.2, D.depth, X0 - 0.1, 0);

  // Lo único que no debe tapar el clic de los cuadros son los colisionadores invisibles
  all.forEach((m) => (m.isPickable = true));

  return {
    heightAt,
    bounds: { X0, X1, ZF, ZB },
    backWallInnerZ: ZB - D.wallT / 2,
    bayX,
    colliders,
    meshes: all
  };
};
