/* =========================================================
   DECORACIÓN SOFT 3D: alfombra, bancas, plantas, lámparas,
   árboles y arbustos alrededor de la cabaña
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.buildDecor = function (scene, M, S, shadowGen) {
  const { roundedBox } = Lobby.Shapes;
  const D = Lobby.DIM;
  const { X0, X1, ZF, ZB } = S.bounds;
  const colliders = [];
  const groups = {};

  const put = (mesh, mat, collide, cast) => {
    const key = mat.name + (collide ? "|c" : "") + (cast === false ? "|n" : "");
    (groups[key] = groups[key] || { mat, collide, cast, list: [] }).list.push(mesh);
    return mesh;
  };
  const rb = (n, w, h, d, r, x, y, z, mat, collide) => {
    const m = roundedBox(n, w, h, d, r, scene);
    m.position.set(x, y, z);
    return put(m, mat, collide);
  };
  const ball = (n, dia, x, y, z, mat, sy) => {
    const m = BABYLON.MeshBuilder.CreateSphere(n, { diameter: dia, segments: 12 }, scene);
    m.position.set(x, y, z);
    if (sy) m.scaling.y = sy;
    return put(m, mat);
  };

  /* ---------- Alfombra frente a los cuadros ---------- */
  rb("rug", D.length - 3, 0.03, 1.7, 0.012, 0, 0.016, ZB - 1.55, M.rug);

  /* ---------- Bancas para ver los cuadros ---------- */
  [-6, 2, 10].forEach((x, i) => {
    rb("benchSeat" + i, 1.8, 0.12, 0.55, 0.06, x - 2, 0.46, -1.4, M.desk, true);
    [-0.7, 0.7].forEach((dx, k) =>
      rb(`benchLeg${i}_${k}`, 0.14, 0.42, 0.45, 0.05, x - 2 + dx, 0.21, -1.4, M.beam));
  });

  /* ---------- Macetas con plantas ---------- */
  const plant = (n, x, z, scale) => {
    const s = scale || 1;
    rb(n + "_pot", 0.55 * s, 0.5 * s, 0.55 * s, 0.16 * s, x, 0.25 * s, z, M.pot, true);
    ball(n + "_a", 0.75 * s, x, 0.78 * s, z, M.leaf, 1.05);
    ball(n + "_b", 0.5 * s, x + 0.2 * s, 1.12 * s, z - 0.08 * s, M.leaf2);
    ball(n + "_c", 0.44 * s, x - 0.22 * s, 1.05 * s, z + 0.1 * s, M.leaf2);
  };
  plant("plant0", X0 + 0.55, 1.0, 1.0);
  plant("plant1", X1 - 0.55, ZB - 0.55, 1.1);
  plant("plant2", X0 + 0.5, ZF + 0.5, 0.9);
  plant("plant3", X1 - 0.6, 0.9, 0.9);

  
  // (los árboles y arbustos de afuera ahora los coloca world.js)

  M.pot.backFaceCulling = false; // la pantalla de la lámpara es una media esfera

  /* ---------- Lámparas colgantes ---------- */
  [-8, 0, 8].forEach((x, i) => {
    const top = S.heightAt(0.6);
    const cord = BABYLON.MeshBuilder.CreateCylinder("cord" + i, { height: 0.7, diameter: 0.025 }, scene);
    cord.position.set(x, top - 0.35, 0.6);
    put(cord, M.beam, false, false);
    const shade = BABYLON.MeshBuilder.CreateSphere("shade" + i,
      { diameter: 0.6, segments: 16, slice: 0.5 }, scene);
    shade.position.set(x, top - 0.7, 0.6);
    put(shade, M.pot, false, false);
    const bulb = BABYLON.MeshBuilder.CreateSphere("bulb" + i, { diameter: 0.2 }, scene);
    bulb.position.set(x, top - 0.74, 0.6);
    const bm = new BABYLON.StandardMaterial("bulbMat" + i, scene);
    bm.emissiveColor = new BABYLON.Color3(1, 0.93, 0.78);
    bm.disableLighting = true;
    bulb.material = bm;
    bulb.isPickable = false;

    const pl = new BABYLON.PointLight("lamp" + i, new BABYLON.Vector3(x, top - 0.9, 0.6), scene);
    pl.diffuse = new BABYLON.Color3(1, 0.85, 0.65);
    pl.intensity = 0.25;
    pl.range = 8;
  });

  /* ---------- Unir por material ---------- */
  Object.keys(groups).forEach((k) => {
    const g = groups[k];
    const merged = BABYLON.Mesh.MergeMeshes(g.list, true, true, undefined, false, false);
    merged.material = g.mat;
    merged.receiveShadows = true;
    merged.isPickable = !!g.collide;
    if (g.collide) { merged.checkCollisions = true; colliders.push(merged); }
    if (shadowGen && g.cast !== false) shadowGen.addShadowCaster(merged);
  });

  return { colliders };
};
