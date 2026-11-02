/* =========================================================
   MAIN: motor, escena, luces y arranque del lobby
   ========================================================= */
(async function () {
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

  /* ---------- Fuente redondeada para los cuadros (Nunito) ---------- */
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("900 100px Nunito"),
        document.fonts.load("800 40px Nunito")
      ]),
      new Promise((r) => setTimeout(r, 2500)) // si no carga, seguimos con la de respaldo
    ]);
  } catch (e) { /* sin fuentes web: se usa la de respaldo */ }

  /* ---------- Escena ---------- */
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#fde7efff");
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0035;
  scene.fogColor = BABYLON.Color3.FromHexString("#e4f1fb");

  Lobby.createSky(scene);

  // luz de cielo: fuerte y cálida, el suelo rebota color durazno (sombras sin negro)
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.15, 1, -0.35), scene);
  hemi.intensity = 0.68;
  hemi.diffuse = BABYLON.Color3.FromHexString("#fff6ec");
  hemi.groundColor = BABYLON.Color3.FromHexString("#e9b99a");
  hemi.specular = BABYLON.Color3.Black();

  // sol suave que entra por los ventanales
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.35, -0.6, 0.72), scene);
  sun.position = new BABYLON.Vector3(-8, 16, -20);
  sun.intensity = 0.75;
  sun.diffuse = BABYLON.Color3.FromHexString("#fff1de");
  sun.specular = BABYLON.Color3.Black();
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 60;
  const shadows = new BABYLON.ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
  shadows.setDarkness(0.45);          // sombras claras, estilo soft
  shadows.bias = 0.001;
  shadows.normalBias = 0.03;

  const M = Lobby.createMaterials(scene);
  const S = Lobby.buildStructure(scene, M, shadows);
  const decor = Lobby.buildDecor(scene, M, S, shadows);
  const frames = Lobby.buildFrames(scene, M, S, cfg.sections);

  /* ---------- Post-proceso soft: oclusión ambiental + tonos suaves ---------- */
  const camera = new BABYLON.UniversalCamera("cam",
    new BABYLON.Vector3(S.bounds.X0 + 3.2, 1.7, -2.7), scene);
  camera.rotation.set(0.03, 0.25, 0);
  camera.fov = 1.05;

  if (BABYLON.SSAO2RenderingPipeline && BABYLON.SSAO2RenderingPipeline.IsSupported) {
    const ssao = new BABYLON.SSAO2RenderingPipeline("ssao", scene, { ssaoRatio: 0.5, blurRatio: 0.5 }, [camera]);
    ssao.radius = 1.2;
    ssao.totalStrength = 1.1;
    ssao.base = 0.15;
    ssao.samples = 16;
    ssao.maxZ = 60;
    ssao.expensiveBlur = true;
  }

  const pipe = new BABYLON.DefaultRenderingPipeline("pipe", true, scene, [camera]);
  pipe.fxaaEnabled = true;
  pipe.samples = 4;
  pipe.imageProcessingEnabled = true;
  pipe.imageProcessing.toneMappingEnabled = false; // colores pastel tal cual
  pipe.imageProcessing.exposure = 1.0;
  pipe.imageProcessing.contrast = 1.06;
  pipe.imageProcessing.vignetteEnabled = true;
  pipe.imageProcessing.vignetteWeight = 0.8;
  pipe.imageProcessing.vignetteColor = new BABYLON.Color4(0.55, 0.35, 0.35, 0);
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.95;
  pipe.bloomWeight = 0.12;
  pipe.bloomKernel = 48;


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
