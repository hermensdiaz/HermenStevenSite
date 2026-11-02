# Lobby 3D (Babylon.js)

Interior navegable de la cabaña sobre pilotes, hecho con Babylon.js.
Cada cuadro del muro trasero es una sección del sitio.

## Estructura

```
lobby/
├── index.html          → página y HUD
├── css/styles.css      → estilos del HUD, menú, joystick, transición
└── js/
    ├── config.js       → nombre del sitio y secciones (EDITA AQUÍ)
    ├── materials.js    → madera procedural
    ├── structure.js    → la cabaña (medidas en Lobby.DIM)
    ├── frames.js       → los cuadros clicables
    ├── controls.js     → caminar, mirar, hover y clic
    └── main.js         → escena, luces, cámara y arranque
```

## Cómo verlo

Ábrelo con un servidor local (no con doble clic), por ejemplo:

```
cd lobby
npx serve .        # o:  python -m http.server 8000
```

## Agregar o cambiar secciones

En `js/config.js`, cada objeto es un cuadro:

```js
{ id: "videojuegos", title: "Videojuegos", subtitle: "Juega y explora",
  icon: "🎮", url: "videojuegos.html", color: "#6c3fc9", newTab: false }
```

Con más de 6 secciones se ponen 2 (o más) cuadros por bahía automáticamente.

## Controles

- **W A S D / flechas**: caminar · **rueda**: avanzar/retroceder
- **Arrastrar**: mirar · **Clic** en un cuadro: entrar
- **1–9**: caminar al cuadro · **Enter**: entrar al cuadro más cercano
- Móvil: joystick abajo a la izquierda, arrastra para mirar, toca un cuadro

## Ajustar la estructura a tu modelo de Blender

Las medidas están en `Lobby.DIM` (structure.js): `bays`, `bay`, `depth`,
`frontH`, `backH`, `sill`, etc. Si prefieres usar tu modelo exacto,
expórtalo como `.glb` y cárgalo con `BABYLON.SceneLoader.ImportMeshAsync`
en lugar de `Lobby.buildStructure` (los cuadros solo necesitan la Z del muro trasero).
