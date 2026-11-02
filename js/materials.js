/* =========================================================
   MATERIALES: madera procedural (sin texturas externas)
   ========================================================= */
window.Lobby = window.Lobby || {};

Lobby.createMaterials = function (scene) {
  // Genera una textura de vetas de madera en un canvas
  function woodTexture(name, base, opts) {
    opts = opts || {};
    const size = 512;
    const tex = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, true);
    const ctx = tex.getContext();
    const planks = opts.planks || 0;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // vetas
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * size;
      const alpha = 0.04 + Math.random() * 0.08;
      ctx.strokeStyle = Math.random() > 0.5
        ? `rgba(40,20,5,${alpha})`
        : `rgba(255,220,170,${alpha * 0.6})`;
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 32) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * (2 + Math.random() * 3));
      }
      ctx.stroke();
    }

    // nudos
    for (let k = 0; k < (opts.knots || 3); k++) {
      const x = Math.random() * size, y = Math.random() * size;
      const g = ctx.createRadialGradient(x, y, 1, x, y, 10 + Math.random() * 8);
      g.addColorStop(0, "rgba(30,14,3,0.55)");
      g.addColorStop(1, "rgba(30,14,3,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // juntas de tablones
    if (planks) {
      const h = size / planks;
      for (let p = 0; p <= planks; p++) {
        ctx.fillStyle = "rgba(20,10,2,0.55)";
        ctx.fillRect(0, p * h - 1, size, 3);
        // cortes alternados
        const off = (p % 2) * size * 0.5 + size * 0.25;
        ctx.fillRect(off, p * h, 3, h);
      }
    }

    tex.update();
    tex.wrapU = tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return tex;
  }

  function mat(name, color, texOpts, uv) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseTexture = woodTexture(name + "_tex", color, texOpts);
    m.diffuseTexture.uScale = (uv && uv[0]) || 1;
    m.diffuseTexture.vScale = (uv && uv[1]) || 1;
    m.specularColor = new BABYLON.Color3(0.06, 0.04, 0.02);
    return m;
  }

  const M = {
    beam: mat("beamMat", "#5e3712", { knots: 2 }),
    post: mat("postMat", "#6b3f15", { knots: 2 }),
    wall: mat("wallMat", "#7a4a1c", { planks: 6, knots: 5 }),
    floor: mat("floorMat", "#9a6a3c", { planks: 8, knots: 6 }, [6, 2]),
    roof: mat("roofMat", "#4d2c0e", { planks: 10 }, [6, 2]),
    desk: mat("deskMat", "#c27a2a", { knots: 1 }),
    stair: mat("stairMat", "#6e4118", {})
  };

  const ground = new BABYLON.StandardMaterial("groundMat", scene);
  ground.diffuseColor = new BABYLON.Color3(0.78, 0.8, 0.82);
  ground.specularColor = BABYLON.Color3.Black();
  M.ground = ground;

  const frameWood = new BABYLON.StandardMaterial("frameWood", scene);
  frameWood.diffuseColor = new BABYLON.Color3(0.22, 0.12, 0.04);
  frameWood.specularColor = new BABYLON.Color3(0.2, 0.15, 0.1);
  M.frameWood = frameWood;

  const gold = new BABYLON.StandardMaterial("frameGold", scene);
  gold.diffuseColor = new BABYLON.Color3(0.85, 0.62, 0.22);
  gold.specularColor = new BABYLON.Color3(0.9, 0.75, 0.4);
  gold.specularPower = 32;
  M.gold = gold;

  return M;
};
