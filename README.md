# BACKROOMS — No-Clip

Roguelike 2D contextual basado en la [wiki de las Backrooms](https://backrooms.fandom.com),
fiel al lore: niveles, entidades, salidas y mecánicas salen de las páginas reales de la wiki.

## Cómo jugar

**Doble clic en `game/index.html`.** No hace falta servidor, ni internet, ni instalar nada.

- **W / S**: avanzar y retroceder · **A / D**: girar (cada paso = 1 turno)
- **Espacio**: interactuar — cruzar salidas y **registrar muebles** (taquillas, archivadores… con tirada de dado)
- **X**: esperar · **Q / E**: usar la mano izquierda/derecha · **F**: linterna
- **B**: mochila · **M / N**: mapa · **L**: registro · **J**: diario · **C**: Códice
- **1-6**: usar un objeto de la mochila · **ESC**: ajustes · **G**: no-clip (si desbloqueas el Instinto)
- Los niveles visitados persisten durante la expedición; las puertas de retorno sustituyen al antiguo atajo **R**.
- **Perfiles**: crea tu usuario en el título; el Códice registra para siempre los niveles
  que transitas (con su descripción), veces visitados, mejores marcas y escapes.
  Exportable/importable como JSON.
- Escribe una **semilla** en el título para partidas reproducibles (compártela con el chat).
- **Sprites personalizados**: cualquier PNG en `game/assets/sprites/` sustituye al pixel-art
  integrado (ver `LEEME.txt` en esa carpeta).

Objetivo: encontrar una de las rarísimas rutas de escape de vuelta a la realidad.
La muerte es permanente: despiertas otra vez en Level 0.

Parámetros de URL útiles: `?seed=misemilla&autostart=1`, `?render=2d`, `?nofx=1`,
`?offline=1` y `?turnos=1` para recuperar el modo clásico durante pruebas.

## Modo online experimental

El modo offline sigue funcionando con doble clic. Cuando el juego se sirve desde web (`http`/`https`), el modo normal es online y el botón principal entra en sala pública.

Para jugar con otras personas hace falta arrancar el servidor:

```powershell
cd server
npm ci
npm start
```

Luego abre:

```text
http://localhost:8080/
```

Salas:

- Pública: `http://localhost:8080/`
- Privada por código: `http://localhost:8080/?sala=privada&codigo=MI-SALA`
- Estado del servidor: `http://localhost:8080/estado`

Privacidad para streamers:

- El campo del código privado está oculto.
- Al conectar a una sala privada, el cliente borra `codigo`/`room` de la barra de direcciones.
- El registro del juego, `/estado` y la consola del servidor no imprimen códigos privados.

Diseño actual del online:

- El servidor valida movimiento y colisiones.
- El mapa no viaja por red; cliente y servidor lo generan con la misma semilla.
- Las salas públicas se dividen en instancias de hasta 36 jugadores.
- Las salas privadas tienen hasta 12 jugadores para conservar tensión y legibilidad.
- Cada sala empieza en lobby: los jugadores esperan y pulsan **LISTO**; la expedición arranca cuando todos están listos.
- La semilla compartida cambia por día UTC.
- M1 online incluye lobby, presencia, movimiento y chat.
- El progreso de caminata/salidas debe ser personal por jugador, no global de sala. Las interacciones avanzadas del roguelike quedan para fases posteriores autoritativas.

## Estructura

```
pipeline/       Scripts Node (descarga de la wiki, parseo, fichas, mapa, empaquetado)
data/raw/       Snapshot local de Levels, Entities, Objects, Phenomena y Groups (1.113 páginas)
data/parsed/    Grafo estructurado: 734 niveles, 197 entidades, 89 objetos y 137 fenómenos/grupos
data/game/      Fichas jugables en español: 30 niveles, 16 entidades y 13 objetos + mapa-piloto.html
game/           El juego (HTML/JS/Canvas puro, cero dependencias)
server/         Servidor Node/WebSocket para el modo online experimental
```

## Comandos del pipeline (Node)

```
node pipeline/download.js    # re-descargar la wiki (incremental)
node pipeline/parse.js       # wikitext -> data/parsed/*.json
node pipeline/parse.test.js  # pruebas del parser (sin dependencias)
node pipeline/level0-audit.js            # 100 semillas fijas (regresión reproducible)
node pipeline/level0-audit.js --random   # muestra nueva; imprime cómo reproducirla
node pipeline/select-pilot.js # elegir niveles del piloto (BFS desde Level 0)
node pipeline/make-map.js    # regenerar data/game/mapa-piloto.html
node pipeline/build-data.js  # OBLIGATORIO tras editar data/game/*.json -> game/js/data.js
```

## El mapa para el autor

`data/game/mapa-piloto.html` — diagrama con los 30 niveles del piloto y flechas
de qué nivel conduce a cuál, coloreado por peligro, con la ruta de escape marcada (⭐).

## Escalar más allá del piloto

Las 734 páginas de niveles ya están en `data/parsed/levels.json`. Para añadir niveles:
crear su ficha en `data/game/levels.es.json` (bioma, paleta, reglas, entidades, salidas)
y ejecutar `build-data.js`. El motor los acepta sin tocar código.

## Contribuir

Los Pull Requests son bienvenidos — lee [CONTRIBUTING.md](CONTRIBUTING.md) antes.
Solo el autor acepta cambios en este repositorio.

## Licencia

- **Código y juego**: [PolyForm Noncommercial 1.0.0](LICENSE.md) — © 2026 MeltStudio.
  Puedes usarlo, estudiarlo y modificarlo libremente **sin fines comerciales**.
  Cualquier uso comercial queda reservado al autor.
- **Lore y textos derivados de la wiki**: el contenido descriptivo procede de
  [backrooms.fandom.com](https://backrooms.fandom.com) y pertenece a sus autores
  bajo [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/); cada ficha
  del juego conserva la `url` de su página original como atribución.
- **Terceros vendorizados**: [Three.js](https://threejs.org) r147 (licencia MIT)
  y fuentes tipográficas bajo [SIL OFL](https://openfontlicense.org/) en
  `game/assets/fonts/`.
