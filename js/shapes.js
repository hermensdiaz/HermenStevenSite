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
