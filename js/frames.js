/* =========================================================
   CUADROS: cada sección del sitio es un cuadro en el muro trasero
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.buildFrames = function (scene, M, S, sections) {
  const D = Lobby.DIM;
  const frames = [];
  const perBay = Math.max(1, Math.ceil(sections.length / D.bays));
  const usableBay = D.bay - D.post - 0.5;
  const W = Math.min(2.4, usableBay / perBay - 0.3);
  const H = W * 0.72;
  const centerY = 1.85;
  const z = S.backWallInnerZ;

  sections.forEach((sec, idx) => {
    const bay = Math.floor(idx / perBay);
    const slot = idx % perBay;
    const bayStart = S.bayX[bay] + D.post / 2 + 0.25;
    const x = bayStart + (slot + 0.5) * (usableBay / perBay);

    const root = new BABYLON.TransformNode("frame_" + sec.id, scene);
    root.position.set(x, centerY, z);

    // marco dorado + fondo
    const border = 0.09;
    const back = BABYLON.MeshBuilder.CreateBox("frameBack_" + sec.id,
      { width: W + border * 2, height: H + border * 2, depth: 0.06 }, scene);
    back.material = M.gold;
    back.position.z = -0.03;
    back.parent = root;

    const inner = BABYLON.MeshBuilder.CreateBox("frameInner_" + sec.id,
      { width: W + 0.02, height: H + 0.02, depth: 0.065 }, scene);
    inner.material = M.frameWood;
    inner.position.z = -0.04;
    inner.parent = root;

    // lienzo con la sección dibujada
    const canvas = BABYLON.MeshBuilder.CreatePlane("frameArt_" + sec.id, { width: W, height: H }, scene);
    canvas.position.z = -0.08;
    canvas.parent = root;
    const tex = new BABYLON.DynamicTexture("artTex_" + sec.id, { width: 768, height: 552 }, scene, true);
    drawArt(tex, sec);
    const mat = new BABYLON.StandardMaterial("artMat_" + sec.id, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3(0.55, 0.55, 0.55);
    mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    canvas.material = mat;

    // placa con el nombre debajo del cuadro
    const plate = BABYLON.MeshBuilder.CreatePlane("plate_" + sec.id, { width: 0.9, height: 0.18 }, scene);
    plate.position.set(0, -H / 2 - 0.28, -0.03);
    plate.parent = root;
    const pTex = new BABYLON.DynamicTexture("plateTex_" + sec.id, { width: 512, height: 102 }, scene, true);
    const pc = pTex.getContext();
    const g = pc.createLinearGradient(0, 0, 0, 102);
    g.addColorStop(0, "#e9c56b"); g.addColorStop(1, "#a7792c");
    pc.fillStyle = g; pc.fillRect(0, 0, 512, 102);
    pc.fillStyle = "#3a2408";
    pc.font = "600 46px Georgia, serif";
    pc.textAlign = "center"; pc.textBaseline = "middle";
    pc.fillText(sec.title, 256, 54);
    pTex.update();
    const pMat = new BABYLON.StandardMaterial("plateMat_" + sec.id, scene);
    pMat.diffuseTexture = pTex;
    pMat.emissiveColor = new BABYLON.Color3(0.25, 0.22, 0.15);
    plate.material = pMat;

    // lámpara de galería sobre el cuadro
    const lamp = BABYLON.MeshBuilder.CreateBox("lamp_" + sec.id, { width: 0.5, height: 0.06, depth: 0.08 }, scene);
    lamp.position.set(0, H / 2 + 0.28, -0.18);
    lamp.parent = root;
    const lampMat = new BABYLON.StandardMaterial("lampMat_" + sec.id, scene);
    lampMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    lampMat.emissiveColor = new BABYLON.Color3(1, 0.85, 0.55);
    lamp.material = lampMat;
    const arm = BABYLON.MeshBuilder.CreateBox("lampArm_" + sec.id, { width: 0.04, height: 0.04, depth: 0.16 }, scene);
    arm.position.set(0, H / 2 + 0.28, -0.08);
    arm.parent = root;
    arm.material = M.frameWood;

    const spot = new BABYLON.SpotLight("spot_" + sec.id,
      new BABYLON.Vector3(x, centerY + H / 2 + 0.6, z - 0.9),
      new BABYLON.Vector3(0, -0.75, 0.6).normalize(),
      Math.PI / 2.6, 6, scene);
    spot.diffuse = new BABYLON.Color3(1, 0.86, 0.62);
    spot.intensity = 0.55;
    spot.range = 5;

    // todos los meshes del cuadro son clicables
    const parts = [back, inner, canvas, plate];
    parts.forEach((m) => {
      m.metadata = { section: sec };
      m.isPickable = true;
    });

    frames.push({
      section: sec,
      root,
      parts,
      canvas,
      // punto frente al cuadro para el acercamiento
      viewPoint: new BABYLON.Vector3(x, 1.7, z - 2.2),
      target: new BABYLON.Vector3(x, centerY, z)
    });
  });

  return frames;

  /* ---- dibuja el "arte" de cada sección ---- */
  function drawArt(tex, sec) {
    const ctx = tex.getContext();
    const w = 768, h = 552;
    const base = sec.color || "#6c3fc9";

    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, shade(base, 0.25));
    grd.addColorStop(1, shade(base, -0.45));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // patrón decorativo
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = -h; i < w; i += 36) {
      ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // viñeta
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "150px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
    ctx.fillText(sec.icon || "★", w / 2, h * 0.36);

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 12;
    ctx.font = "700 74px 'Trebuchet MS', 'Segoe UI', sans-serif";
    ctx.fillText(sec.title, w / 2, h * 0.68);
    ctx.font = "400 36px 'Trebuchet MS', 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(sec.subtitle || "", w / 2, h * 0.82);
    ctx.shadowBlur = 0;

    tex.update();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.replace("#", ""), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
};
