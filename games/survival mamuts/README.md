# MAMUT · Dulce Apocalipsis (Phaser 3, top-down)

## Cómo jugar el proyecto
Phaser carga imágenes por HTTP, así que hay que servir la carpeta (no abrir index.html con doble clic):

    python3 -m http.server 8080      # y abre http://localhost:8080
    # o bien
    npx serve .

## Controles
| Acción | Tecla |
|---|---|
| Mover | WASD / flechas |
| Apuntar | Mouse |
| Disparar / golpear | Q o clic izquierdo (se puede mantener) |
| Recargar (balas infinitas, cargador de 12) | R |
| Cambiar pistola ⇄ bate de chocolate | C |
| Esquivar (invulnerable un instante) | SHIFT / ESPACIO |

## Estructura
    assets/
      audio/          (vacío: los sonidos se sintetizan con WebAudio en systems/Sfx.js)
      images/         mamut.png  (cuerpo del personaje)
      spritesheets/
    lib/phaser.min.js (Phaser 3.80.1 incluido, funciona sin internet)
    src/
      main.js         configuración de Phaser
      config.js       balance: vida, cadencia, daño, velocidades...
      scenes/
        Start.js          menú + carga de assets
        GameScene.js      mundo infinito, colisiones, daño, racha
        UIScene.js        HUD (vida, munición, arma, racha, radar)
        GameOverScene.js  resultados
      entities/
        Fighter.js        base: cuerpo + aura + brazos + piernas + ojos
        Player.js         mamut bueno (aura azul)
        MamutEnemy.js     mamut malvado (aura roja, embiste)
        BarritaEnemy.js   barrita de fresa (aura roja, dispara mermelada)
      systems/
        Textures.js       texturas procedurales
        Spawner.js        aparición de enemigos fuera de cámara
        Sfx.js            efectos de sonido
      utils/helpers.js

Para ajustar la dificultad edita `src/config.js` y `src/systems/Spawner.js`.
