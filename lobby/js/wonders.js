/* =========================================================
   LAS 7 MARAVILLAS EN SOFT 3D
   Cada constructor trabaja en coordenadas locales:
   el origen es el centro de la base y el FRENTE mira hacia −Z.
   world.js las coloca y las gira para que miren a su camino.
   ========================================================= */
window.Lobby = window.Lobby || {};

/* ---------- Kit de piezas para construir ---------- */
Lobby.WonderKit = function (scene, batch, node) {
  const { roundedBox, beam } = Lobby.Shapes;
  const V = (x, y, z) => new BABYLON.Vector3(x, y, z);
  const mat = (hex) => Lobby.softMat(scene, hex);
  const colliders = [];

  function place(m, x, y, z, hex, opts, rotY) {
    m.position.set(x, y, z);
    if (rotY) m.rotation.y = rotY;
    m.parent = node;
    batch.add(m, mat(hex), opts);
    return m;
  }

  const K = {
    V,
    /* caja redondeada (r > 0) o plana (r = 0) centrada en x,y,z */
    box(w, h, d, x, y, z, hex, r, opts, rotY) {
      const m = r > 0
        ? roundedBox("b", w, h, d, r, scene)
        : BABYLON.MeshBuilder.CreateBox("b", { width: w, height: h, depth: d }, scene);
      return place(m, x, y, z, hex, opts, rotY);
    },
    cyl(dTop, dBot, h, x, y, z, hex, tess, opts, rotY) {
      const m = BABYLON.MeshBuilder.CreateCylinder("c",
        { diameterTop: dTop, diameterBottom: dBot, height: h, tessellation: tess || 24 }, scene);
      return place(m, x, y, z, hex, opts, rotY);
    },
    sphere(dia, x, y, z, hex, sy, opts) {
      const m = BABYLON.MeshBuilder.CreateSphere("s", { diameter: dia, segments: 12 }, scene);
      if (sy) m.scaling.y = sy;
      return place(m, x, y, z, hex, opts);
    },
    /* sólido de revolución: perfil [[radio, altura], ...] */
    lathe(profile, x, y, z, hex, opts, scale, tess) {
      const shape = profile.map(([r, h]) => V(r, h, 0));
      const m = BABYLON.MeshBuilder.CreateLathe("l", {
        shape, tessellation: tess || 40, sideOrientation: BABYLON.Mesh.DOUBLESIDE
      }, scene);
      if (scale) m.scaling.set(scale[0], scale[1], scale[2]);
      return place(m, x, y, z, hex, opts);
    },
    /* prisma triangular: base w en X, punta h hacia arriba, fondo d en Z */
    prism(w, h, d, x, y, z, hex, opts, rotY) {
      const m = new BABYLON.Mesh("p", scene);
      const a = [-w / 2, 0], b = [w / 2, 0], c = [0, h];
      const z0 = -d / 2, z1 = d / 2;
      const P = [], I = [];
      const quad = (p0, p1, p2, p3) => {
        const s = P.length / 3;
        P.push(...p0, ...p1, ...p2, ...p3);
        I.push(s, s + 1, s + 2, s, s + 2, s + 3);
      };
      const tri = (p0, p1, p2) => { const s = P.length / 3; P.push(...p0, ...p1, ...p2); I.push(s, s + 1, s + 2); };
      tri([a[0], a[1], z0], [c[0], c[1], z0], [b[0], b[1], z0]);
      tri([a[0], a[1], z1], [b[0], b[1], z1], [c[0], c[1], z1]);
      quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]);
      quad([a[0], a[1], z0], [a[0], a[1], z1], [c[0], c[1], z1], [c[0], c[1], z0]);
      quad([b[0], b[1], z0], [c[0], c[1], z0], [c[0], c[1], z1], [b[0], b[1], z1]);
      const vd = new BABYLON.VertexData();
      vd.positions = P; vd.indices = I;
      vd.uvs = new Array((P.length / 3) * 2).fill(0);
      const N = []; BABYLON.VertexData.ComputeNormals(P, I, N); vd.normals = N;
      vd.applyToMesh(m);
      return place(m, x, y, z, hex, opts, rotY);
    },
    /* viga redondeada entre dos puntos locales */
    beam(p0, p1, w, h, hex, opts, r) {
      const m = beam("v", p0, p1, w, h, r == null ? Math.min(w, h) * 0.3 : r, scene);
      m.parent = node;
      batch.add(m, mat(hex), opts);
      return m;
    },
    /* colisionador invisible (caja o cilindro) */
    collider(kind, w, h, d, x, y, z, rotY) {
      const m = kind === "cyl"
        ? BABYLON.MeshBuilder.CreateCylinder("col", { diameter: 1, height: h, tessellation: 20 }, scene)
        : BABYLON.MeshBuilder.CreateBox("col", { width: w, height: h, depth: d }, scene);
      if (kind === "cyl") m.scaling.set(w, 1, d);
      m.position.set(x, y, z);
      if (rotY) m.rotation.y = rotY;
      m.parent = node;
      m.isVisible = false; m.isPickable = false; m.checkCollisions = true;
      colliders.push(m);
      return m;
    },
    colliders
  };
  return K;
};

/* =========================================================
   CONSTRUCTORES
   ========================================================= */
Lobby.WonderBuilders = {

  /* ---------------- CHICHÉN ITZÁ ---------------- */
  chichen(K) {
    const T = 9, th = 2.5;
    for (let i = 0; i < T; i++) {
      const half = 26 - i * 2;
      K.box(half * 2, th, half * 2, 0, i * th + th / 2, 0, i % 2 ? "#e9d3ab" : "#f0dfbd", 0.35);
      // cornisa clara en cada terraza
      K.box(half * 2 + 0.6, 0.35, half * 2 + 0.6, 0, (i + 1) * th - 0.18, 0, "#f6e8cc", 0.15);
    }
    const topY = T * th;
    // escalinatas en los 4 lados
    const N = 26, outer = 30, inner = 10, run = (outer - inner) / N, rise = topY / N;
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => {
      const c = Math.cos(a), s = Math.sin(a);
      const at = (x, z) => [x * c + z * s, -x * s + z * c]; // rota (x,z) local del lado
      for (let k = 0; k < N; k++) {
        const z0 = -outer + k * run;
        const depth = -inner - z0;
        const [px, pz] = at(0, (z0 + -inner) / 2);
        K.box(8.5, (k + 1) * rise, depth, px, ((k + 1) * rise) / 2, pz, k % 2 ? "#f5e6c7" : "#efdcb9", 0, null, a);
      }
      [-4.9, 4.9].forEach((bx) => {
        const [x0, z0] = at(bx, -outer - 0.6), [x1, z1] = at(bx, -inner);
        K.beam(K.V(x0, 0.7, z0), K.V(x1, topY + 0.7, z1), 1.3, 1.5, "#e2c99c");
      });
    });
    // cabezas de serpiente al pie de la escalinata principal
    [-4.9, 4.9].forEach((bx) => {
      K.box(2.2, 1.8, 3, bx, 0.9, -31.6, "#8fcf9e", 0.7);
      K.box(2.0, 0.5, 1.2, bx, 0.3, -33, "#8fcf9e", 0.2);
      K.sphere(0.5, bx - 0.6, 1.5, -32.9, "#3d5a48");
      K.sphere(0.5, bx + 0.6, 1.5, -32.9, "#3d5a48");
    });
    // templo superior
    K.box(15, 7, 15, 0, topY + 3.5, 0, "#f6e8cc", 0.4);
    K.box(16.4, 1.2, 16.4, 0, topY + 7.2, 0, "#e7cfa2", 0.3);
    K.box(10, 1.4, 10, 0, topY + 8.4, 0, "#f0dfbd", 0.3);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => {
      const c = Math.cos(a), s = Math.sin(a);
      [-3.2, 0, 3.2].forEach((dx, j) => {
        if (a !== 0 && j !== 1) return; // tres puertas al frente, una en los demás lados
        K.box(2.2, 4.2, 0.6, dx * c - 7.55 * s, topY + 2.1, -dx * s - 7.55 * c, "#7b6150", 0.15, null, a);
      });
    });
    K.collider("box", 62, 32, 62, 0, 16, 0);
    return { height: topY + 9, radius: 33 };
  },

  /* ---------------- COLISEO ---------------- */
  coliseo(K) {
    const a = 44, b = 36, N = 64;
    const tiers = [[0, 9], [9, 17.5], [17.5, 26]];
    const ATTIC = [26, 33];
    // lado en ruinas (atrás a la derecha)
    const ruin = (t) => {
      const u = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return u > Math.PI * 0.12 && u < Math.PI * 0.62;
    };
    const ruinH = (i) => 11 + ((i * 37) % 7);
    const pt = (t, ka, kb) => [ka * Math.cos(t), kb * Math.sin(t)];

    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2, t1 = ((i + 1) / N) * Math.PI * 2;
      const [x0, z0] = pt(t0, a, b), [x1, z1] = pt(t1, a, b);
      const tx = x1 - x0, tz = z1 - z0;
      const len = Math.hypot(tx, tz);
      const rot = Math.atan2(-tz, tx);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const broken = ruin(t0);
      const topH = broken ? ruinH(i) : ATTIC[1];

      // pilares (en el punto t0)
      tiers.forEach(([y0, y1], k) => {
        if (y1 > topH + 0.01 && y0 >= topH) return;
        const yt = Math.min(y1, topH);
        K.box(2.4, yt - y0, 3, x0, (y0 + yt) / 2, z0, k % 2 ? "#f0dcbb" : "#efd6b0", 0, null, rot);
        // banda horizontal sobre cada nivel
        if (yt === y1) K.box(len + 0.4, 1.2, 3.3, mx, y1 - 0.2, mz, "#f5e4c6", 0, null, rot);
      });
      // ático macizo con ventanitas
      if (!broken) {
        K.box(len + 0.3, ATTIC[1] - ATTIC[0], 3, mx, (ATTIC[0] + ATTIC[1]) / 2, mz, "#efd6b0", 0, null, rot);
        if (i % 2 === 0) {
          const nx = b * Math.cos(t0), nz = a * Math.sin(t0), nl = Math.hypot(nx, nz);
          K.box(1.4, 1.8, 0.4, mx + (nx / nl) * 1.55, 29.5, mz + (nz / nl) * 1.55, "#b8946c", 0, null, rot);
        }
      }
      // muro interior oscuro: hace que se lean los arcos
      const [ix0, iz0] = pt(t0, a - 3.4, b - 3.4), [ix1, iz1] = pt(t1, a - 3.4, b - 3.4);
      const ih = broken ? ruinH(i) - 1.5 : ATTIC[0];
      K.box(Math.hypot(ix1 - ix0, iz1 - iz0) + 0.3, ih, 1.6, (ix0 + ix1) / 2, ih / 2, (iz0 + iz1) / 2, "#b58f6c", 0, null, Math.atan2(-(iz1 - iz0), ix1 - ix0));
      // techos de arcada (para que no se vea a través)
      tiers.forEach(([, y1]) => {
        if (y1 > topH) return;
        const cx = (mx + (ix0 + ix1) / 2) / 2, cz = (mz + (iz0 + iz1) / 2) / 2;
        K.box(len + 0.4, 0.6, 3.6, cx, y1 - 0.5, cz, "#e2c7a0", 0, null, rot);
      });
    }

    // gradas interiores
    const prof = [[0.56, 0], [0.56, 4], [0.6, 4], [0.6, 6.5], [0.66, 6.5], [0.66, 9.5], [0.72, 9.5], [0.72, 13],
      [0.78, 13], [0.78, 17], [0.84, 17], [0.84, 21], [0.9, 21], [0.9, 25], [0.93, 25], [0.93, 0], [0.56, 0]];
    K.lathe(prof, 0, 0, 0, "#ecd4ae", null, [a, 1, b], 64);
    // arena y muros del hipogeo
    K.cyl(2, 2, 0.5, 0, 0.25, 0, "#f6dfb4", 48, null).scaling.set(a * 0.56, 1, b * 0.56);
    for (let k = -3; k <= 3; k++) K.box(a * 0.8, 1, 0.6, 0, 0.9, k * 4.2, "#d9bb92", 0);
    K.box(1.2, 1, b * 0.9, 0, 0.9, 0, "#d9bb92", 0);

    K.collider("cyl", (a + 2.5) * 2, 36, (b + 2.5) * 2, 0, 18, 0);
    return { height: 33, radius: a + 3 };
  },

  /* ---------------- TAJ MAHAL ---------------- */
  taj(K) {
    const W = "#fbf7f4", P = 2.6;
    K.box(64, P, 64, 0, P / 2, 0, "#f1e8e3", 0.3);
    K.box(65, 0.5, 65, 0, P - 0.1, 0, "#e7dcd8", 0.2);
    // cuerpo octagonal
    K.cyl(36.8, 36.8, 22, 0, P + 11, 0, W, 8, null, Math.PI / 8);
    K.cyl(37.6, 37.6, 1.4, 0, P + 22.4, 0, "#efe6ea", 8, null, Math.PI / 8);
    // iwanes (arcos apuntados) en las 4 caras
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      const at = (x, z) => [x * c + z * s, -x * s + z * c];
      let [x, z] = at(0, -17.25);
      K.box(14, 19, 0.7, x, P + 10.5, z, "#f1e6ee", 0.2, null, ang);
      [x, z] = at(0, -17.55);
      K.box(10, 13, 0.6, x, P + 8.5, z, "#d9cde3", 0.1, null, ang);
      K.prism(10, 3.6, 0.6, x, P + 15, z, "#d9cde3", null, ang);
      const [dxp, dzp] = at(0, -17.85);
      K.box(4, 7, 0.6, dxp, P + 3.5, dzp, "#b9a7c9", 0.2, null, ang);
      // arcos laterales pequeños (dos pisos)
      [-11.2, 11.2].forEach((sx) => {
        [5.5, 14].forEach((sy) => {
          const [ax, az] = at(sx, -17.5);
          K.box(4.6, 5.6, 0.5, ax, P + sy, az, "#ddd2e6", 0.1, null, ang);
          K.prism(4.6, 1.8, 0.5, ax, P + sy + 2.8, az, "#ddd2e6", null, ang);
        });
      });
    });
    // tambor, cúpula de bulbo y remate
    const top = P + 23.1;
    K.cyl(20, 20, 5, 0, top + 2.5, 0, W, 32);
    const onion = [[10.2, 0], [11.6, 2.5], [12.4, 5.5], [12.2, 8.5], [11, 11.5], [8.8, 14.5], [5.8, 17], [3, 19], [1.2, 20.6], [0.5, 22], [0, 22.6]];
    K.lathe(onion, 0, top + 5, 0, "#fffdfb", null, null, 48);
    K.cyl(0.6, 0.6, 5, 0, top + 5 + 22.6 + 2.2, 0, "#f0d58a", 8);
    K.sphere(1.4, 0, top + 5 + 23.6, 0, "#f0d58a");
    K.sphere(1.0, 0, top + 5 + 25, 0, "#f0d58a");
    // chhatris en las esquinas del techo
    [[-11.5, -11.5], [11.5, -11.5], [-11.5, 11.5], [11.5, 11.5]].forEach(([x, z]) => {
      K.cyl(5.6, 5.6, 3.6, x, top + 1.8, z, W, 8, null, Math.PI / 8);
      K.lathe(onion, x, top + 3.6, z, "#fffdfb", null, [0.3, 0.3, 0.3], 24);
    });
    // minaretes
    [[-29, -29], [29, -29], [-29, 29], [29, 29]].forEach(([x, z]) => {
      K.cyl(2.4, 3.3, 34, x, P + 17, z, W, 16);
      [10, 20, 30].forEach((hy) => K.cyl(4.6, 4.2, 0.7, x, P + hy, z, "#ece2e8", 16));
      K.cyl(3.2, 3.2, 2.4, x, P + 35.2, z, W, 8);
      K.lathe(onion, x, P + 36.4, z, "#fffdfb", null, [0.17, 0.17, 0.17], 20);
    });
    // estanque reflectante y jardines al frente
    K.box(8.6, 0.35, 28.4, 0, 0.18, -47, "#efe6e0", 0.1);
    K.box(6, 0.2, 26, 0, 0.32, -47, "#8fd3f0", 0, { cast: false });
    [-16, 16].forEach((x) => K.box(22, 0.25, 26, x, 0.13, -47, "#a5d9a6", 0.1));
    for (let z = -35; z >= -59; z -= 4) {
      [-5.6, 5.6].forEach((x) => K.sphere(1.6, x, 2.2, z, "#7cc08b", 2.2));
    }
    K.collider("box", 66, 40, 66, 0, 20, 0);
    return { height: top + 30, radius: 34, water: [{ type: "rect", x0: -4.3, x1: 4.3, z0: -61.2, z1: -32.8 }] };
  },

  /* ---------------- CRISTO REDENTOR ---------------- */
  cristo(K) {
    // cerro del Corcovado (se puede subir caminando)
    const R = 36, H = 26, prof = [[0, H]];
    for (let r = 1; r <= R; r += 1.5) {
      const t = r / R;
      prof.push([r, H * Math.pow((Math.cos(Math.PI * t) + 1) / 2, 1.15)]);
    }
    prof.push([R, 0]);
    K.lathe(prof, 0, 0, 0, "#a6d6a0", { walk: true }, null, 56);
    // rocas en las laderas
    [[12, 0.6], [20, 2.1], [8, 3.6], [24, 4.6], [16, 5.5]].forEach(([r, ang]) => {
      const x = r * Math.cos(ang), z = r * Math.sin(ang);
      const y = H * Math.pow((Math.cos(Math.PI * r / R) + 1) / 2, 1.15);
      K.box(5, 3, 4, x, y, z, "#cfc6d8", 1.2, null, ang);
    });
    // pedestal
    K.box(6.5, 8, 6.5, 0, H + 4, 0, "#e9e4dc", 0.5, { collide: true });
    K.box(8, 0.8, 8, 0, H + 0.4, 0, "#ddd6cc", 0.3);
    const y0 = H + 8;
    // túnica
    K.lathe([[0, 0], [2.9, 0], [3.1, 2], [2.7, 8], [2.5, 12.5], [2.9, 15], [2.4, 16.6], [1.1, 17.4], [0, 17.5]],
      0, y0, 0, "#f4f1ec", null, null, 32);
    // brazos abiertos y mangas
    K.box(27, 1.8, 1.9, 0, y0 + 15.6, 0, "#f4f1ec", 0.8);
    K.box(13, 3.2, 2.6, 0, y0 + 14.9, 0, "#f4f1ec", 1.2);
    [-13.4, 13.4].forEach((x) => K.box(1.4, 2.2, 1.5, x, y0 + 15.1, 0, "#f4f1ec", 0.6));
    // cabeza
    K.cyl(1.1, 1.2, 1.2, 0, y0 + 18, 0, "#f4f1ec", 16);
    K.sphere(2.4, 0, y0 + 19.6, 0, "#f4f1ec", 1.15);
    return { height: y0 + 21, radius: R, walkHill: true };
  },

  /* ---------------- MACHU PICCHU ---------------- */
  machu(K) {
    const L = 7, th = 2.6;
    for (let k = 0; k < L; k++) {
      const w = 64 - k * 4;
      const zf = -30 + k * 4.5, zb = 30;
      const top = (k + 1) * th;
      K.box(w, top, zb - zf, 0, top / 2, (zf + zb) / 2, k % 2 ? "#b8a07a" : "#c4ad86", 0.3);
      K.box(w + 0.3, 0.7, zb - zf + 0.3, 0, top + 0.2, (zf + zb) / 2, "#93cf8c", 0.3);
    }
    // escalera de piedra al frente
    for (let k = 0; k < L; k++) {
      K.box(3.2, (k + 1) * th, 4.6, 0, ((k + 1) * th) / 2, -30 + k * 4.5 + 2.3 - 4.5 * 0.5, "#cfbfa2", 0.1);
    }
    const yTop = L * th + 0.35;
    // casitas incas con techos a dos aguas
    [[-14, 6], [-7, 6], [0, 9], [7, 6], [14, 6], [-12, 16], [-4, 18], [4, 18], [12, 16], [-8, 25], [8, 25], [0, 26]]
      .forEach(([x, z], i) => {
        K.box(5, 2.8, 4, x, yTop + 1.4, z, "#e8dcc6", 0.2, null, (i % 3) * 0.05);
        K.prism(5.8, 2.5, 4.6, x, yTop + 2.8, z, "#c99a6b", null, Math.PI / 2 + (i % 3) * 0.05);
      });
    // Huayna Picchu y montañas
    const peak = (h, r) => [[0, h], [r * 0.12, h * 0.97], [r * 0.3, h * 0.84], [r * 0.48, h * 0.64], [r * 0.68, h * 0.4], [r * 0.86, h * 0.17], [r, 0]];
    K.lathe(peak(64, 30), 6, 0, 64, "#8ec994", null, null, 28);
    K.lathe(peak(42, 28), -38, 0, 48, "#a3d4a0", null, null, 28);
    K.lathe(peak(32, 24), 40, 0, 44, "#9bcf9b", null, null, 28);
    // nubecitas en la cima
    K.sphere(8, 10, 58, 60, "#ffffff", 0.5, { cast: false });
    K.sphere(6, 4, 60, 66, "#ffffff", 0.5, { cast: false });
    K.collider("box", 66, 24, 64, 0, 12, 0);
    K.collider("cyl", 50, 60, 50, 6, 30, 64);
    K.collider("cyl", 46, 40, 46, -38, 20, 48);
    K.collider("cyl", 40, 30, 40, 40, 15, 44);
    return { height: 64, radius: 34 };
  },

  /* ---------------- PETRA ---------------- */
  petra(K) {
    // macizo de roca
    K.box(92, 54, 34, 0, 27, 17, "#ec9f88", 4, { collide: true });
    K.box(32, 42, 30, -44, 21, 12, "#e4927b", 5, { collide: true });
    K.box(30, 38, 28, 44, 19, 10, "#f0a990", 5, { collide: true });
    K.box(44, 12, 28, -12, 54, 20, "#e89a84", 5);
    K.box(32, 10, 24, 24, 52, 22, "#eea48d", 4);
    // nicho tallado
    K.box(34, 44, 2, 0, 22, -0.4, "#d7836f", 0.6);
    const F = "#f7c2ad", D = "#f6b9a2";
    // piso inferior
    K.box(30, 1.5, 6, 0, 0.75, -3, D, 0.2);
    [-11, -6.6, -2.2, 2.2, 6.6, 11].forEach((x) => {
      K.cyl(1.7, 1.9, 13, x, 8, -3.6, F, 16);
      K.box(2.6, 1, 2.6, x, 15, -3.6, D, 0.2);
    });
    K.box(28, 2.4, 3.4, 0, 16.7, -3.3, D, 0.3);
    K.prism(18, 4.5, 2.6, 0, 17.9, -3.3, F);
    K.box(4.8, 8.4, 0.6, 0, 5.7, -1.4, "#8c4f43", 0.3);
    // piso superior: tholos central y pabellones
    K.box(30, 1.2, 3, 0, 23, -2.6, D, 0.2);
    K.cyl(8, 8, 11, 0, 29.1, -3.2, F, 24);
    for (let k = 0; k < 6; k++) {
      const ang = Math.PI + (k - 2.5) * 0.45;
      K.cyl(0.9, 0.9, 11, Math.sin(ang) * 4.6, 29.1, -3.2 + Math.cos(ang) * 4.6, D, 10);
    }
    K.cyl(0, 9.4, 4, 0, 36.6, -3.2, D, 24);
    K.sphere(1.8, 0, 39.2, -3.2, F, 1.3);
    [-11.5, 11.5].forEach((x) => {
      K.box(6.5, 11, 3, x, 29.1, -2.6, F, 0.3);
      K.prism(7.2, 2.6, 3.2, x, 34.6, -2.6, D);
      [-2.4, 2.4].forEach((dx) => K.cyl(1, 1, 11, x + dx, 29.1, -4.4, D, 10));
    });
    // el Siq: desfiladero de acceso
    for (let k = 0; k < 9; k++) {
      const z = -12 - k * 6.5;
      const hl = 24 + ((k * 7) % 11), hr = 26 + ((k * 5) % 9);
      K.box(10, hl, 8, -13.5 - (k % 3) * 0.8, hl / 2, z, k % 2 ? "#e9977f" : "#efa48c", 2.5, { collide: true });
      K.box(10, hr, 8, 13.5 + (k % 2) * 0.8, hr / 2, z, k % 2 ? "#f0a68e" : "#e48f78", 2.5, { collide: true });
    }
    return { height: 58, radius: 48 };
  },

  /* ---------------- GRAN MURALLA (en coordenadas de mundo) ---------------- */
  muralla(K, opts) {
    const pts = opts.points;      // [[x,z], ...] ya suavizados
    const yAt = opts.heightAt;    // altura del terreno
    const V = K.V;
    const WALL_H = 8, WALL_W = 6.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const y0 = yAt(x0, z0), y1 = yAt(x1, z1);
      K.beam(V(x0, y0 + WALL_H / 2 - 1, z0), V(x1, y1 + WALL_H / 2 - 1, z1), WALL_W, WALL_H + 2, "#e6d3b2", { collide: true }, 0.5);
      K.beam(V(x0, y0 + WALL_H + 0.2, z0), V(x1, y1 + WALL_H + 0.2, z1), WALL_W + 0.2, 0.5, "#d6bf98", null, 0.15);
      // almenas a ambos lados
      const len = Math.hypot(x1 - x0, z1 - z0);
      const tx = (x1 - x0) / len, tz = (z1 - z0) / len, nx = -tz, nz = tx;
      const rot = Math.atan2(tx, tz);
      for (let d = 1.2; d < len; d += 2.6) {
        const cx = x0 + tx * d, cz = z0 + tz * d, cy = y0 + (y1 - y0) * (d / len) + WALL_H + 1.2;
        [-1, 1].forEach((sd) => K.box(0.7, 1.5, 1.3, cx + nx * sd * 2.95, cy, cz + nz * sd * 2.95, "#e6d3b2", 0, null, rot));
      }
      // torres de vigilancia
      if (i % 4 === 0) {
        const ty = y0;
        K.box(11, 13, 11, x0, ty + 6.5, z0, "#dcc6a2", 0.6, { collide: true }, rot);
        K.box(11.6, 0.6, 11.6, x0, ty + 13.2, z0, "#cdb48c", 0.2, null, rot);
        for (let k = -2; k <= 2; k++) {
          [[k * 2.2, -5.4], [k * 2.2, 5.4], [-5.4, k * 2.2], [5.4, k * 2.2]].forEach(([u, v]) => {
            const ux = x0 + u * Math.cos(rot) + v * Math.sin(rot);
            const uz = z0 - u * Math.sin(rot) + v * Math.cos(rot);
            K.box(1, 1.4, 1, ux, ty + 14.2, uz, "#dcc6a2", 0, null, rot);
          });
        }
        if (i % 8 === 0) {
          K.box(6, 3.2, 6, x0, ty + 15.1, z0, "#f2e4c8", 0.3, null, rot);
          K.cyl(0, 10.5, 4, x0, ty + 18.7, z0, "#e07f63", 4, null, rot + Math.PI / 4);
        }
      }
    }
    return { height: 16, radius: 0 };
  }
};
