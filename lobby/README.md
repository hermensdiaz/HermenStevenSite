# Lobby 3D soft (Babylon.js)

Interior navegable de la cabaña sobre pilotes, hecho con Babylon.js.
Cada cuadro del muro trasero es una sección del sitio.

## Estructura

```
index.html              → página principal (en la raíz del sitio)
lobby/
├── css/styles.css      → estilos del HUD, menú, joystick, transición
└── js/
    ├── config.js       → nombre del sitio y secciones (EDITA AQUÍ)
    ├── shapes.js       → cajas y vigas con bordes redondeados (soft 3D)
    ├── materials.js    → paleta pastel (Lobby.PALETTE) y cielo
    ├── structure.js    → la cabaña (medidas en Lobby.DIM)
    ├── decor.js        → alfombra, bancas, plantas y lámparas de la cabaña
    ├── wonders-data.js → textos de los carteles de las 7 maravillas
    ├── wonders.js      → modelos soft 3D de las 7 maravillas
    ├── world.js        → mapa: terreno, río, estanques, caminos, puente, plaza (Lobby.MAP)
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
- **Shift**: correr · sal por la puerta derecha de la cabaña y baja la escalera para explorar
- Menú **Tour · 7 maravillas**: te lleva frente a cada maravilla (y de regreso a la cabaña)
- Móvil: joystick abajo a la izquierda, arrastra para mirar, toca un cuadro

## Ajustar la estructura a tu modelo de Blender

Las medidas están en `Lobby.DIM` (structure.js): `bays`, `bay`, `depth`,
`frontH`, `backH`, `sill`, etc. Si prefieres usar tu modelo exacto,
expórtalo como `.glb` y cárgalo con `BABYLON.SceneLoader.ImportMeshAsync`
en lugar de `Lobby.buildStructure` (los cuadros solo necesitan la Z del muro trasero).

## Cambiar los colores

Toda la paleta está en `Lobby.PALETTE` (materials.js). El color de cada
cuadro sale de `color` en config.js.

## El mapa

Todo el diseño del mapa está en `Lobby.MAP` (world.js): los caminos (`paths`),
el río (`stream`), los estanques (`ponds`), el puente (`bridge`), la Gran Muralla
(`wall`) y la posición de cada maravilla (`wonders`). Los textos de los carteles
están en `wonders-data.js`.
