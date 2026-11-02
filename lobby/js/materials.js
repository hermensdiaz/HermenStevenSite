/* =========================================================
   MATERIALES SOFT 3D
   Colores pastel mate, sin brillo duro. Para cambiar el estilo
   basta con editar la paleta PALETTE.
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.PALETTE = {
  post:   "#c98d63",  // postes y pilotes
  beam:   "#b47a52",  // vigas, barandales
  wall:   "#f0d2b0",  // muros
  floor:  "#e8c39b",  // piso
  roof:   "#e08a6c",  // techo (terracota suave)
  ceiling:"#f6dfc6",  // cara interior del techo
  desk:   "#f7a96b",  // recepción
  stair:  "#d49a6c",
  ground: "#9fd6a9",  // pasto menta
  rug:    "#f4b6a6",
  leaf:   "#8fd19e",
  leaf2:  "#b5e3a1",
  pot:    "#f2a7b8",
  trunk:  "#b98563",
  frame:  "#fff7ee",  // marco de los cuadros
  plate:  "#fff1de"
};

Lobby.createMaterials = function (scene) {
  const P = Lobby.PALETTE;

  // textura muy sutil de tablones (solo líneas, el color lo da el material)
  function plankTex(name, planks, vertical) {
    const size = 512;
    const tex = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, true);
    const ctx = tex.getContext();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const step = size / planks;
    for (let i = 0; i < planks; i++) {
      // variación de tono por tablón
      const v = 242 + Math.floor(Math.random() * 13);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      if (vertical) ctx.fillRect(i * step, 0, step, size);
      else ctx.fillRect(0, i * step, size, step);
      ctx.fillStyle = "rgba(120,90,70,0.28)";
      if (vertical) ctx.fillRect(i * step, 0, 3, size);
      else ctx.fillRect(0, i * step, size, 3);
    }
    tex.update();
    tex.wrapU = tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return tex;
  }

  function soft(name, hex, tex, uv) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    // un poco de color propio para que las sombras nunca sean negras
    m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(0.12);
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    m.specularPower = 8;
    m.maxSimultaneousLights = 6;
    if (tex) {
      m.diffuseTexture = tex;
      tex.uScale = (uv && uv[0]) || 1;
      tex.vScale = (uv && uv[1]) || 1;
    }
    return m;
  }

  const M = {
    post: soft("postMat", P.post),
    beam: soft("beamMat", P.beam),
    wall: soft("wallMat", P.wall, plankTex("wallTex", 8, false), [1, 1]),
    floor: soft("floorMat", P.floor, plankTex("floorTex", 10, false), [1, 4]),
    roof: soft("roofMat", P.roof),
    ceiling: soft("ceilMat", P.ceiling, plankTex("ceilTex", 12, true), [6, 1]),
    desk: soft("deskMat", P.desk),
    stair: soft("stairMat", P.stair),
    ground: soft("groundMat", P.ground),
    rug: soft("rugMat", P.rug),
    leaf: soft("leafMat", P.leaf),
    leaf2: soft("leaf2Mat", P.leaf2),
    pot: soft("potMat", P.pot),
    trunk: soft("trunkMat", P.trunk),
    frame: soft("frameMat", P.frame),
    plate: soft("plateMat", P.plate)
  };
  M.ground.emissiveColor = BABYLON.Color3.FromHexString(P.ground).scale(0.04);
  return M;
};

/* Cielo con degradado pastel (domo con colores por vértice) */
Lobby.createSky = function (scene) {
  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter: 2400, segments: 24 }, scene);
  const pos = sky.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const top = BABYLON.Color3.FromHexString("#7cc3f5");
  const mid = BABYLON.Color3.FromHexString("#cfe8fb");
  const hor = BABYLON.Color3.FromHexString("#fde4ec");
  const colors = [];
  for (let i = 0; i < pos.length; i += 3) {
    const t = pos[i + 1] / 1200; // -1 abajo … 1 arriba
    let c;
    if (t > 0.35) c = BABYLON.Color3.Lerp(mid, top, Math.min(1, (t - 0.35) / 0.65));
    else if (t > 0) c = BABYLON.Color3.Lerp(hor, mid, t / 0.35);
    else c = hor;
    colors.push(c.r, c.g, c.b, 1);
  }
  sky.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
  const mat = new BABYLON.StandardMaterial("skyMat", scene);
  mat.emissiveColor = BABYLON.Color3.White();
  mat.diffuseColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.fogEnabled = false;
  sky.material = mat;
  sky.isPickable = false;
  sky.infiniteDistance = true;
  return sky;
};

/* Material soft reutilizable por color (para el mapa y las maravillas) */
Lobby.softMat = (function () {
  const cache = {};
  return function (scene, hex, opts) {
    opts = opts || {};
    const key = hex + (opts.alpha ? "_a" + opts.alpha : "") + (opts.glow ? "_g" : "") + (opts.vcol ? "_v" : "");
    if (cache[key] && cache[key].getScene() === scene) return cache[key];
    const m = new BABYLON.StandardMaterial("soft_" + key, scene);
    const c = BABYLON.Color3.FromHexString(hex);
    m.diffuseColor = opts.vcol ? BABYLON.Color3.White() : c;
    m.emissiveColor = opts.glow ? c.scale(0.6) : (opts.vcol ? new BABYLON.Color3(0.06, 0.06, 0.06) : c.scale(0.12));
    m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    m.specularPower = 8;
    m.maxSimultaneousLights = 6;
    if (opts.alpha) m.alpha = opts.alpha;
    cache[key] = m;
    return m;
  };
})();
