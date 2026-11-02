/* =========================================================
   CONTROLES: caminar (WASD / flechas / joystick táctil),
   correr (Shift), mirar arrastrando, seguir el terreno al salir
   de la cabaña, hover y clic sobre los cuadros, teletransporte
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.setupControls = function (scene, canvas, camera, frames, ui, world, structure) {
  const EYE = 1.7;
  const LOOK_SENS = 0.0042;
  let busy = false; // durante la animación de entrada

  /* ---------- Cámara: teclado nativo, mirada propia ---------- */
  camera.inputs.removeByType("FreeCameraMouseInput");
  camera.inputs.removeByType("FreeCameraTouchInput");
  camera.keysUp = [87, 38];    // W, ↑
  camera.keysDown = [83, 40];  // S, ↓
  camera.keysLeft = [65, 37];  // A, ←
  camera.keysRight = [68, 39]; // D, →
  camera.speed = 0.16;
  camera.inertia = 0.82;
  camera.angularSensibility = 4000;
  camera.minZ = 0.05;
  camera.checkCollisions = true;
  camera.applyGravity = false;
  // cuerpo del jugador: de los pies (ojos − 1.2) a los ojos
  camera.ellipsoid = new BABYLON.Vector3(0.35, 0.6, 0.35);
  camera.ellipsoidOffset = new BABYLON.Vector3(0, -0.6, 0);
  camera.attachControl(canvas, true);

  /* ---------- Correr con Shift ---------- */
  const BASE_SPEED = camera.speed;
  let running = false;
  const setRun = (on) => { running = on; camera.speed = BASE_SPEED * (on ? 2.8 : 1); };
  window.addEventListener("keydown", (e) => { if (e.key === "Shift") setRun(true); });
  window.addEventListener("keyup", (e) => { if (e.key === "Shift") setRun(false); });
  window.addEventListener("blur", () => setRun(false));

  /* ---------- Seguir el suelo: cabaña, escalera, puente, cerro o terreno ---------- */
  const walkSet = new Set([...(structure.walkables || []), ...(world.walkables || [])]);
  const ray = new BABYLON.Ray(BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, -1, 0), 80);
  const prev = camera.position.clone();
  let vy = 0;

  function floorAt(x, y, z) {
    ray.origin.set(x, y + 0.35, z);
    const hit = scene.pickWithRay(ray, (m) => walkSet.has(m));
    const structY = hit && hit.hit ? hit.pickedPoint.y : -Infinity;
    const terrY = world.heightAt(x, z);
    if (structY >= terrY - 0.05) return { y: structY, water: false };
    return { y: terrY, water: world.waterAt(x, z) };
  }

  scene.onBeforeRenderObservable.add(() => {
    camera.cameraDirection.y = 0;
    const p = camera.position;
    if (busy) { prev.copyFrom(p); return; }
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);

    // límite del mapa
    const r = Math.hypot(p.x, p.z);
    if (r > world.radius) { p.x *= world.radius / r; p.z *= world.radius / r; }

    // árboles, rocas, faroles: empujar hacia afuera
    const feet = p.y - EYE;
    if (feet < world.heightAt(p.x, p.z) + 1.5) {
      for (const o of world.obstacles) {
        const dx = p.x - o.x, dz = p.z - o.z, min = o.r + 0.35;
        if (Math.abs(dx) < min && Math.abs(dz) < min) {
          const d = Math.hypot(dx, dz) || 0.001;
          if (d < min) { p.x = o.x + (dx / d) * min; p.z = o.z + (dz / d) * min; }
        }
      }
    }

    let f = floorAt(p.x, p.y, p.z);
    if (f.water) {
      // no se puede entrar al agua: regresar al último punto seco
      p.x = prev.x; p.z = prev.z;
      camera.cameraDirection.x = camera.cameraDirection.z = 0;
      f = floorAt(p.x, p.y, p.z);
    }
    const target = f.y + EYE;
    if (target >= p.y) {
      p.y = Math.min(target, p.y + Math.max(0.12, (target - p.y) * 0.45));
      vy = 0;
    } else {
      vy = Math.min(vy + 28 * dt, 30);
      p.y = Math.max(target, p.y - vy * dt);
      if (p.y === target) vy = 0;
    }
    prev.copyFrom(p);
    ui.setOutside && ui.setOutside(p.y < 1.0);
  });

  /* ---------- Mirar arrastrando (mouse y touch) ---------- */
  let dragging = false, moved = 0, lastX = 0, lastY = 0, downId = null;

  canvas.addEventListener("pointerdown", (e) => {
    if (busy) return;
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY; downId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    ui.hideHint();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (dragging && e.pointerId === downId) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      camera.rotation.y += dx * LOOK_SENS;
      camera.rotation.x = clamp(camera.rotation.x + dy * LOOK_SENS, -1.2, 1.2);
      canvas.classList.toggle("grabbing", moved > 6);
    }
    if (e.pointerType === "mouse") hoverAt(e.offsetX, e.offsetY);
  });

  const end = (e) => {
    if (!dragging || e.pointerId !== downId) return;
    dragging = false; downId = null;
    canvas.classList.remove("grabbing");
    if (moved < 8 && e.type === "pointerup") clickAt(e.offsetX, e.offsetY);
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  // rueda: avanzar / retroceder
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (busy) return;
    const f = camera.getDirection(BABYLON.Axis.Z);
    f.y = 0; f.normalize();
    camera.cameraDirection.addInPlace(f.scale(-Math.sign(e.deltaY) * 0.18));
  }, { passive: false });

  /* ---------- Joystick táctil ---------- */
  const joy = document.getElementById("joystick");
  const knob = joy && joy.querySelector(".knob");
  const move = { x: 0, y: 0 };
  if (joy) {
    let jid = null, cx = 0, cy = 0;
    const R = 46;
    joy.addEventListener("pointerdown", (e) => {
      jid = e.pointerId; joy.setPointerCapture(jid);
      const r = joy.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      updateJoy(e);
      ui.hideHint();
    });
    joy.addEventListener("pointermove", (e) => { if (e.pointerId === jid) updateJoy(e); });
    const jEnd = (e) => {
      if (e.pointerId !== jid) return;
      jid = null; move.x = move.y = 0;
      knob.style.transform = "translate(-50%, -50%)";
    };
    joy.addEventListener("pointerup", jEnd);
    joy.addEventListener("pointercancel", jEnd);
    function updateJoy(e) {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      move.x = dx / R; move.y = -dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  }
  scene.onBeforeRenderObservable.add(() => {
    if (busy || (!move.x && !move.y)) return;
    const boost = Math.hypot(move.x, move.y) > 0.95 ? 2.4 : 1;
    const k = 0.06 * boost * scene.getAnimationRatio();
    const fwd = camera.getDirection(BABYLON.Axis.Z); fwd.y = 0; fwd.normalize();
    const right = camera.getDirection(BABYLON.Axis.X); right.y = 0; right.normalize();
    camera.cameraDirection.addInPlace(fwd.scale(move.y * k).add(right.scale(move.x * k)));
  });

  /* ---------- Hover y clic sobre cuadros ---------- */
  const hl = new BABYLON.HighlightLayer("hl", scene, { blurHorizontalSize: 1.2, blurVerticalSize: 1.2 });
  hl.innerGlow = false;
  let hovered = null;

  const pickFrame = (x, y) => {
    const pick = scene.pick(x, y, (m) => m.isPickable && m.isVisible);
    if (pick && pick.hit && pick.pickedMesh.metadata && pick.pickedMesh.metadata.section) {
      // no seleccionar cuadros lejanos
      if (pick.distance > 9) return null;
      return frames.find((f) => f.section === pick.pickedMesh.metadata.section);
    }
    return null;
  };

  function setHover(frame) {
    if (frame === hovered) return;
    if (hovered) {
      hl.removeMesh(hovered.canvas);
      BABYLON.Animation.CreateAndStartAnimation("unhover", hovered.root, "scaling",
        60, 8, hovered.root.scaling.clone(), new BABYLON.Vector3(1, 1, 1), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    }
    hovered = frame;
    if (frame) {
      hl.addMesh(frame.canvas, BABYLON.Color3.FromHexString(frame.section.color || "#ffd27a"));
      BABYLON.Animation.CreateAndStartAnimation("hover", frame.root, "scaling",
        60, 8, frame.root.scaling.clone(), new BABYLON.Vector3(1.05, 1.05, 1), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      canvas.classList.add("pointer");
      ui.showTip(frame.section);
    } else {
      canvas.classList.remove("pointer");
      ui.hideTip();
    }
  }

  function hoverAt(x, y) {
    if (busy || dragging) return;
    setHover(pickFrame(x, y));
  }

  function clickAt(x, y) {
    const f = pickFrame(x, y);
    if (f) enterSection(f);
  }

  /* ---------- Acercarse al cuadro y navegar ---------- */
  function walkTo(frame, done) {
    // si estás lejos (por ejemplo afuera), te lleva directo frente al cuadro
    if (BABYLON.Vector3.Distance(camera.position, frame.viewPoint) > 14) {
      teleport(frame.viewPoint, frame.target, done);
      return;
    }
    busy = true;
    setHover(null);
    // cancelar cualquier inercia de movimiento para que no empuje la animación
    camera.cameraDirection.setAll(0);
    camera.cameraRotation.setAll(0);
    const fps = 60, frames_ = 50;
    const dir = frame.target.subtract(frame.viewPoint);
    const yaw = Math.atan2(dir.x, dir.z);
    let startYaw = camera.rotation.y;
    // camino angular más corto
    while (yaw - startYaw > Math.PI) startYaw += Math.PI * 2;
    while (yaw - startYaw < -Math.PI) startYaw -= Math.PI * 2;
    camera.rotation.y = startYaw;

    const ease = new BABYLON.CubicEase();
    ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    BABYLON.Animation.CreateAndStartAnimation("walkPos", camera, "position", fps, frames_,
      camera.position.clone(), frame.viewPoint.clone(), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease);
    BABYLON.Animation.CreateAndStartAnimation("walkYaw", camera, "rotation.y", fps, frames_,
      startYaw, yaw, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease);
    BABYLON.Animation.CreateAndStartAnimation("walkPitch", camera, "rotation.x", fps, frames_,
      camera.rotation.x, 0.02, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => { camera.cameraDirection.setAll(0); busy = false; done && done(); });
  }

  function enterSection(frame) {
    if (busy) return;
    const sec = frame.section;
    walkTo(frame, () => {
      if (sec.newTab) {
        window.open(sec.url, "_blank", "noopener");
        return;
      }
      busy = true;
      ui.transition(sec, () => { window.location.href = sec.url; });
    });
  }

  // teclas 1..9: caminar hasta el cuadro sin entrar; Enter: entrar al más cercano
  window.addEventListener("keydown", (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= frames.length) walkTo(frames[n - 1]);
    if (e.key === "Enter") {
      const near = nearestFrame();
      if (near) enterSection(near);
    }
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) ui.hideHint();
  });

  function nearestFrame() {
    let best = null, bd = 3.2;
    frames.forEach((f) => {
      const d = BABYLON.Vector3.Distance(camera.position, f.viewPoint);
      if (d < bd) { bd = d; best = f; }
    });
    return best;
  }

  // mostrar aviso "Enter para entrar" cuando estás frente a un cuadro
  scene.onAfterRenderObservable.add(() => {
    if (busy) return;
    const f = nearestFrame();
    ui.setNear(f ? f.section : null);
  });

  /* ---------- Teletransporte (tour por el mapa) ---------- */
  function teleport(pos, target, done) {
    if (busy) return;
    busy = true;
    setHover(null);
    camera.cameraDirection.setAll(0);
    camera.cameraRotation.setAll(0);
    ui.blink(() => {
      camera.position.copyFrom(pos);
      const d = target.subtract(pos);
      camera.rotation.y = Math.atan2(d.x, d.z);
      camera.rotation.x = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.9, 0.9);
      prev.copyFrom(pos);
      vy = 0;
      busy = false;
      done && done();
    });
  }

  return { enterSection, walkTo, teleport, reset() { busy = false; } };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
};
