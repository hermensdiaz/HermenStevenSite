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

    const { roundedBox } = Lobby.Shapes;
    const accent = BABYLON.Color3.FromHexString(sec.color || "#9b8cff");

    // marco redondeado color crema + filete de color de la sección
    const border = 0.14;
    const back = roundedBox("frameBack_" + sec.id, W + border * 2, H + border * 2, 0.12, 0.08, scene);
    back.material = M.frame;
    back.position.z = -0.06;
    back.parent = root;

    const inner = roundedBox("frameInner_" + sec.id, W + 0.07, H + 0.07, 0.1, 0.04, scene);
    const innerMat = new BABYLON.StandardMaterial("frameInnerMat_" + sec.id, scene);
    innerMat.diffuseColor = accent;
    innerMat.emissiveColor = accent.scale(0.3);
    innerMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    inner.material = innerMat;
    inner.position.z = -0.09;
    inner.parent = root;

    // lienzo con la sección dibujada
    const canvas = BABYLON.MeshBuilder.CreatePlane("frameArt_" + sec.id, { width: W, height: H }, scene);
    canvas.position.z = -0.145;
    canvas.parent = root;
    const tex = new BABYLON.DynamicTexture("artTex_" + sec.id, { width: 1024, height: 736 }, scene, true);
    drawArt(tex, sec);
    const mat = new BABYLON.StandardMaterial("artMat_" + sec.id, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3(0.38, 0.38, 0.38);
    mat.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    mat.maxSimultaneousLights = 6;
    canvas.material = mat;

    // placa redondeada con el nombre, debajo del cuadro
    const plateBody = roundedBox("plateBody_" + sec.id, 1.36, 0.3, 0.06, 0.1, scene);
    plateBody.material = M.plate;
    plateBody.position.set(0, -H / 2 - 0.36, -0.06);
    plateBody.parent = root;
    const plate = BABYLON.MeshBuilder.CreatePlane("plate_" + sec.id, { width: 1.24, height: 0.24 }, scene);
    plate.position.set(0, -H / 2 - 0.36, -0.095);
    plate.parent = root;
    const pTex = new BABYLON.DynamicTexture("plateTex_" + sec.id, { width: 620, height: 120 }, scene, true);
    pTex.hasAlpha = true;
    const pc = pTex.getContext();
    pc.clearRect(0, 0, 620, 120);
    pc.fillStyle = "#4a2f25";
    pc.textAlign = "center"; pc.textBaseline = "middle";
    let ps = 60;
    do { pc.font = `800 ${ps}px Nunito, 'Trebuchet MS', sans-serif`; ps -= 2; }
    while (pc.measureText(sec.title).width > 580 && ps > 24);
    pc.fillText(sec.title, 310, 64);
    pTex.update();
    const pMat = new BABYLON.StandardMaterial("plateMat_" + sec.id, scene);
    pMat.diffuseTexture = pTex;
    pMat.useAlphaFromDiffuseTexture = true;
    pMat.emissiveColor = new BABYLON.Color3(0.08, 0.06, 0.05);
    pMat.specularColor = BABYLON.Color3.Black();
    plate.material = pMat;

    // lamparita redondeada sobre el cuadro
    const lamp = roundedBox("lamp_" + sec.id, 0.6, 0.1, 0.14, 0.05, scene);
    lamp.position.set(0, H / 2 + 0.34, -0.26);
    lamp.parent = root;
    const lampMat = new BABYLON.StandardMaterial("lampMat_" + sec.id, scene);
    lampMat.emissiveColor = new BABYLON.Color3(1, 0.95, 0.85);
    lampMat.disableLighting = true;
    lamp.material = lampMat;
    const arm = roundedBox("lampArm_" + sec.id, 0.05, 0.05, 0.24, 0.02, scene);
    arm.position.set(0, H / 2 + 0.34, -0.13);
    arm.parent = root;
    arm.material = M.beam;
    [lamp, arm].forEach((m) => (m.isPickable = false));

    // todos los meshes del cuadro son clicables
    const parts = [back, inner, canvas, plate, plateBody];
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
      viewPoint: new BABYLON.Vector3(x, 1.7, z - 2.4),
      target: new BABYLON.Vector3(x, centerY, z)
    });
  });

  return frames;

  /* ---- dibuja el "arte" de cada sección (estilo soft) ---- */
  function drawArt(tex, sec) {
    const ctx = tex.getContext();
    const w = 1024, h = 736;
    const base = sec.color || "#9b8cff";

    // degradado pastel
    const grd = ctx.createLinearGradient(0, 0, w * 0.6, h);
    grd.addColorStop(0, shade(base, 0.55));
    grd.addColorStop(1, shade(base, 0.12));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // burbujas suaves de fondo
    [[0.12, 0.18, 170], [0.9, 0.2, 130], [0.82, 0.88, 210], [0.08, 0.9, 120]].forEach(([bx, by, br]) => {
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.arc(bx * w, by * h, br, 0, Math.PI * 2); ctx.fill();
    });

    // círculo blanco detrás del icono
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.shadowColor = "rgba(80,50,40,0.18)";
    ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.arc(w / 2, h * 0.36, 150, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.font = "170px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
    ctx.fillText(sec.icon || "★", w / 2, h * 0.37);

    // título: se achica si es muy largo
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(70,40,30,0.28)";
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    let size = 108;
    do {
      ctx.font = `900 ${size}px Nunito, 'Trebuchet MS', sans-serif`;
      size -= 2;
    } while (ctx.measureText(sec.title).width > w * 0.86 && size > 40);
    ctx.fillText(sec.title, w / 2, h * 0.73);

    // subtítulo en una pastilla
    if (sec.subtitle) {
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.font = "800 40px Nunito, 'Trebuchet MS', sans-serif";
      const tw = ctx.measureText(sec.subtitle).width + 64;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      pill(ctx, w / 2 - tw / 2, h * 0.86 - 32, tw, 64, 32);
      ctx.fillStyle = shade(base, -0.35);
      ctx.fillText(sec.subtitle, w / 2, h * 0.86 + 2);
    }
    tex.update();
  }

  function pill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.replace("#", ""), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
};
