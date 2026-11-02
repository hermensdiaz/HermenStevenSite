/* =========================================================
   FORMAS SOFT 3D
   Cajas con esquinas redondeadas y vigas entre dos puntos.
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.Shapes = (function () {
  /**
   * Caja redondeada: se parte de una esfera y cada vértice se empuja
   * hacia la esquina correspondiente. Las normales de la esfera dan
   * el brillo suave de los bordes.
   */
  function roundedBox(name, w, h, d, r, scene) {
    r = Math.max(0.005, Math.min(r, w / 2, h / 2, d / 2) * 0.98);
    const m = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 2, segments: 6, updatable: true }, scene);
    const pos = m.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const nor = m.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    const s = (v) => (v > 1e-4 ? 1 : v < -1e-4 ? -1 : 0);
    for (let i = 0; i < pos.length; i += 3) {
      const nx = nor[i], ny = nor[i + 1], nz = nor[i + 2];
      pos[i] = s(nx) * hx + nx * r;
      pos[i + 1] = s(ny) * hy + ny * r;
      pos[i + 2] = s(nz) * hz + nz * r;
    }
    m.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    m.refreshBoundingInfo();
    return m;
  }

  /** Viga redondeada que va de p0 a p1 (sección w × h). */
  function beam(name, p0, p1, w, h, r, scene) {
    const len = BABYLON.Vector3.Distance(p0, p1);
    const m = roundedBox(name, w, h, len, r, scene);
    m.position = p0.add(p1).scale(0.5);
    m.lookAt(p1);
    return m;
  }

  return { roundedBox, beam };
})();

/* =========================================================
   LOTE DE MESHES: junta piezas por material para dibujar rápido.
   add(mesh, material, { collide, walk, cast })
   - collide: bloquea al jugador
   - walk:    se puede caminar encima (el jugador sigue su altura)
   - cast:    proyecta sombra (true por defecto)
   ========================================================= */
Lobby.Batch = function (scene, shadowGen, name) {
  const groups = {};
  const out = { meshes: [], colliders: [], walkables: [] };

  function add(mesh, material, opts) {
    opts = opts || {};
    const key = material.name + (opts.collide ? "|c" : "") + (opts.walk ? "|w" : "") + (opts.cast === false ? "|n" : "");
    (groups[key] = groups[key] || { material, opts, list: [] }).list.push(mesh);
    return mesh;
  }

  function flush() {
    Object.keys(groups).forEach((key) => {
      const g = groups[key];
      const merged = g.list.length === 1 && !g.list[0].parent
        ? g.list[0]
        : BABYLON.Mesh.MergeMeshes(g.list, true, true, undefined, false, false);
      merged.name = (name || "batch") + "_" + key;
      merged.material = g.material;
      merged.receiveShadows = true;
      merged.isPickable = !!(g.opts.collide || g.opts.walk || g.opts.pick);
      merged.metadata = Object.assign({}, merged.metadata, { walk: !!g.opts.walk });
      merged.freezeWorldMatrix();
      if (g.opts.collide) { merged.checkCollisions = true; out.colliders.push(merged); }
      if (g.opts.walk) out.walkables.push(merged);
      if (shadowGen && g.opts.cast !== false) shadowGen.addShadowCaster(merged);
      out.meshes.push(merged);
    });
    return out;
  }

  return { add, flush, out };
};
