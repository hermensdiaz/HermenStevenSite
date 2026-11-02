/* =========================================================
   MAIN: motor, escena, luces y arranque del lobby
   ========================================================= */
(function () {
  const cfg = window.LOBBY_CONFIG;
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);

  /* ---------- UI (HUD, tooltip, menú, transición) ---------- */
  const $ = (s) => document.querySelector(s);
  const tip = $("#tip"), hint = $("#hint"), near = $("#near"), fade = $("#fade");
  document.title = cfg.siteName + " · Lobby";
  $("#siteName").textContent = cfg.siteName;

  const ui = {
    showTip(sec) {
      tip.innerHTML = `<span class="tip-icon">${sec.icon || ""}</span><span><strong>${sec.title}</strong><small>Clic para entrar</small></span>`;
      tip.classList.add("show");
    },
    hideTip() { tip.classList.remove("show"); },
    hideHint() { hint.classList.add("hidden"); },
    setNear(sec) {
      if (sec) {
        near.innerHTML = `Pulsa <kbd>Enter</kbd> o haz clic para entrar a <strong>${sec.title}</strong>`;
        near.classList.add("show");
      } else near.classList.remove("show");
    },
    transition(sec, cb) {
      fade.querySelector(".fade-title").textContent = sec.title;
      fade.querySelector(".fade-icon").textContent = sec.icon || "";
      fade.classList.add("show");
      setTimeout(cb, 750);
    }
  };

  // el tooltip sigue al cursor
  window.addEventListener("pointermove", (e) => {
    tip.style.setProperty("--tx", e.clientX + "px");
    tip.style.setProperty("--ty", e.clientY + "px");
  });

  // menú de secciones (accesible y como atajo)
  const menu = $("#menuList");
  cfg.sections.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button class="go" data-i="${i}" title="Ir al cuadro">
        <span class="num">${i + 1}</span><span class="ic">${s.icon || ""}</span>${s.title}
      </button>
      <a href="${s.url}" ${s.newTab ? 'target="_blank" rel="noopener"' : ""} aria-label="Abrir ${s.title}">↗</a>`;
    menu.appendChild(li);
  });

  /* ---------- Escena ---------- */
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#9fc4e0ff");
  scene.ambientColor = new BABYLON.Color3(0.3, 0.25, 0.2);
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.72, 0.8, 0.86);

  // luz de cielo
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.2, 1, -0.3), scene);
  hemi.intensity = 0.55;
  hemi.diffuse = new BABYLON.Color3(1, 0.95, 0.88);
  hemi.groundColor = new BABYLON.Color3(0.35, 0.26, 0.18);

  // sol que entra por los ventanales (sombras como en tu render)
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.35, -0.55, 0.75), scene);
  sun.position = new BABYLON.Vector3(-8, 14, -18);
  sun.intensity = 1.45;
  sun.diffuse = new BABYLON.Color3(1, 0.9, 0.75);
  const shadows = new BABYLON.ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0008;
  shadows.normalBias = 0.02;

  // lámparas interiores cálidas
  [-8, 0, 8].forEach((x, i) => {
    const pl = new BABYLON.PointLight("lamp" + i, new BABYLON.Vector3(x, 3.2, 0.6), scene);
    pl.diffuse = new BABYLON.Color3(1, 0.78, 0.5);
    pl.intensity = 0.28;
    pl.range = 9;
  });

  const M = Lobby.createMaterials(scene);
  const S = Lobby.buildStructure(scene, M, shadows);
  const frames = Lobby.buildFrames(scene, M, S, cfg.sections);

  // focos de lámparas colgantes visibles
  [-8, 0, 8].forEach((x, i) => {
    const cord = BABYLON.MeshBuilder.CreateCylinder("cord" + i, { height: 0.6, diameter: 0.02 }, scene);
    cord.position.set(x, S.heightAt(0.6) - 0.3, 0.6);
    cord.material = M.frameWood;
    const shade = BABYLON.MeshBuilder.CreateCylinder("shade" + i,
      { height: 0.28, diameterTop: 0.12, diameterBottom: 0.5, tessellation: 20 }, scene);
    shade.position.set(x, S.heightAt(0.6) - 0.72, 0.6);
    shade.material = M.frameWood;
    const bulb = BABYLON.MeshBuilder.CreateSphere("bulb" + i, { diameter: 0.16 }, scene);
    bulb.position.set(x, S.heightAt(0.6) - 0.86, 0.6);
    const bm = new BABYLON.StandardMaterial("bulbMat" + i, scene);
    bm.emissiveColor = new BABYLON.Color3(1, 0.85, 0.55);
    bulb.material = bm;
    [cord, shade, bulb].forEach((m) => (m.isPickable = false));
  });

  // post-proceso suave
  const pipe = new BABYLON.DefaultRenderingPipeline("pipe", true, scene);
  pipe.fxaaEnabled = true;
  pipe.imageProcessingEnabled = true;
  pipe.imageProcessing.contrast = 1.12;
  pipe.imageProcessing.exposure = 1.05;
  pipe.imageProcessing.vignetteEnabled = true;
  pipe.imageProcessing.vignetteWeight = 1.4;
  pipe.imageProcessing.toneMappingEnabled = true;
  pipe.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

  /* ---------- Cámara: inicio junto a la recepción mirando el pasillo ---------- */
  const camera = new BABYLON.UniversalCamera("cam",
    new BABYLON.Vector3(S.bounds.X0 + 3.4, 1.7, -2.6), scene);
  camera.rotation.set(0.04, 0.35, 0);
  camera.fov = 1.05;

  const controls = Lobby.setupControls(scene, canvas, camera, frames, ui);

  menu.addEventListener("click", (e) => {
    const b = e.target.closest(".go");
    if (!b) return;
    ui.hideHint();
    controls.walkTo(frames[+b.dataset.i]);
    canvas.focus();
  });

  // el teclado de la cámara necesita el foco en el canvas
  canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", () => canvas.focus());

  scene.executeWhenReady(() => {
    document.getElementById("loader").classList.add("done");
    canvas.focus();
  });

  // al volver con "atrás" del navegador, quitar el fundido
  window.addEventListener("pageshow", () => { fade.classList.remove("show"); controls.reset(); });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  window.LobbyScene = { engine, scene, camera, frames }; // útil para depurar
})();
