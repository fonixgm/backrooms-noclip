// Reglas ambientales por nivel, derivadas de las descripciones de la wiki.
// Cada regla es un hook que se ejecuta al entrar al nivel y/o cada turno.
(function () {
  const RULES = {
    zumbido: {
      nombre: 'Zumbido fluorescente',
      icono: '〰',
      desc: 'El zumbido constante de las luces erosiona tu cordura. Una máscara de gas filtra la mitad.',
      turno(world, rng) {
        const filtrado = world.equipado('mascara_gas') || world.tienePasivo?.('traje_hostil') || world.tienePasivo?.('proteccion_quimica');
        if (world.turn % (filtrado ? 40 : 20) === 0) world.sanity(-1);
      },
    },
    luces_inestables: {
      nombre: 'Iluminación inestable',
      icono: '⚡',
      desc: 'Los fluorescentes fallan, parpadean y dejan zonas a oscuras durante unos instantes.',
    },
    apagones: {
      nombre: 'Apagones del garaje',
      icono: '■',
      desc: 'Las luces colgantes pueden apagarse por completo y regresar sin aviso.',
      turno(world, rng) {
        if ((world._blackoutHasta || -1) > world.turn) {
          if (world.turn + 1 === world._blackoutHasta)
            world.log('Las luminarias del garaje vuelven a encenderse una tras otra.', 'event');
          return;
        }
        if (world.turn > 20 && world.turn % 70 === 0 && rng.chance(0.58)) {
          world._blackoutHasta = world.turn + rng.int(9, 18);
          world.log('Un chasquido seco recorre el techo. El garaje queda a oscuras.', 'danger');
          world.sanity(-2);
          if (window.Sfx) Sfx.play('apagado');
        }
      },
    },
    deterioro_longitudinal: {
      nombre: 'Deterioro por distancia',
      icono: '↠',
      desc: 'Cuanto más avanzas, más calor, niebla, fallos de luz y daños estructurales aparecen.',
      entrar(world) {
        world._deterioroNivel = 0;
        world._deterioroTramo = 0;
      },
      turno(world) {
        const objetivo = world.level.deterioroPasos || 1200;
        const fase = Math.max(0, Math.min(1, (world.pasosNivel || 0) / objetivo));
        world._deterioroNivel = fase;
        world.visionMod = Math.min(world.visionMod || 0, -Math.floor(fase * 3));
        const tramo = Math.min(4, Math.floor(fase * 5));
        if (tramo > (world._deterioroTramo || 0)) {
          world._deterioroTramo = tramo;
          world.log([
            '',
            'El aire se vuelve más pesado. La niebla ya roza la moqueta.',
            'Cada vez faltan más paneles de luz. El papel pintado comienza a rasgarse.',
            'El calor resulta sofocante y los apagones duran cada vez más.',
            'Las paredes están abiertas por grietas. Las falsas salidas se multiplican.',
          ][tramo], tramo >= 3 ? 'danger' : 'event');
          world.sanity(-tramo);
        }
        if (fase > 0.78 && world.turn % 80 === 0) world.hurt(2, 'el calor y el agotamiento de The Exit', true);
      },
    },
    libros_sueltos: {
      nombre: 'Suelo cubierto de libros',
      icono: '▤',
      desc: 'Las pilas de libros frenan el paso y pueden hacerte tropezar o delatar tu posición.',
      turno(world, rng) {
        const px = Math.round(world.player.x), py = Math.round(world.player.y);
        const libros = (world.map.props || []).find((p) =>
          p.id === 'libros_caidos' && p.x === px && p.y === py);
        if (!libros || libros._pisadoTurno === world.turn) return;
        libros._pisadoTurno = world.turn;
        world.hacerRuido(px, py, 6);
        if (window.Sfx) Sfx.play('papeles');
        if (rng.chance(0.28)) {
          world.log('Los libros se deslizan bajo tus pies. Tropiezas y el golpe resuena entre las estanterías.', 'danger');
          world.sanity(-1);
          if (rng.chance(0.2)) world.hurt(1, 'una caída sobre los libros', true);
        }
      },
    },
    no_euclidiano: {
      nombre: 'Espacio no euclidiano',
      icono: '♾',
      desc: 'De vez en cuando, una zona lejana del nivel se reorganiza de verdad. Lo oirás.',
      turno(world, rng) {
        const level0 = world.level.id === 'level-0';
        const intervalo = level0 ? 70 : 90;
        if (world.turn > 0 && world.turn % intervalo === 0 && rng.chance(level0 ? 0.65 : 0.5)) {
          if (world.remodelarZona()) {
            world.log(level0
              ? 'El zumbido cambia de tono. En algún lugar, un pasillo ya no conduce al mismo sitio.'
              : 'Un crujido lejano recorre el nivel: las Backrooms se reorganizan.', 'danger');
            world.sanity(-2);
            if (window.Sfx) Sfx.play(level0 ? 'crujido' : 'derrumbe');
          }
        }
      },
    },
    calor: {
      nombre: 'Calor extremo',
      icono: '🔥',
      desc: 'El vapor y el calor duplican tu sed.',
      turno(world) {
        if (world.turn % 4 === 0) world.thirst(-1);
      },
    },
    frio: {
      nombre: 'Frío glacial',
      icono: '❄',
      desc: 'El frío te daña lentamente. Una chaqueta térmica PUESTA lo anula.',
      turno(world) {
        if (world.turn % 8 === 0 && !world.equipado('chaqueta') && !world.tienePasivo?.('traje_hostil')) world.hurt(1, 'el frío', true);
      },
    },
    oscuridad_total: {
      nombre: 'Oscuridad devoradora',
      icono: '●',
      desc: 'Ninguna fuente de luz funciona aquí. La visión se reduce al mínimo.',
      entrar(world) {
        world.player.luz = false;
        world.luzBloqueada = true;
      },
    },
    lluvia_acida: {
      nombre: 'Lluvia ácida',
      icono: '☔',
      desc: 'Aguaceros corrosivos barren el nivel en oleadas.',
      turno(world, rng) {
        if (world.turn % 30 === 15) {
          world.log('La lluvia ácida arrecia. Te quema la piel.', 'danger');
          if (world.tienePasivo?.('traje_hostil') || world.tienePasivo?.('proteccion_quimica')) world.log('La proteccion quimica aguanta la lluvia acida.', 'good');
          else world.hurt(6, 'la lluvia ácida', true);
        }
      },
    },
    hambre_extrema: {
      nombre: 'Hambre voraz',
      icono: '🍖',
      desc: 'Este nivel devora tus reservas: el hambre avanza el doble de rápido.',
      turno(world) {
        if (world.turn % 7 === 0) world.hunger(-1);
      },
    },
    alucinaciones: {
      nombre: 'Alucinaciones',
      icono: '👁',
      desc: 'Oyes y ves cosas que no existen. Tu cordura se resiente. Una máscara de gas filtra la mitad.',
      turno(world, rng) {
        const filtrado = world.equipado('mascara_gas') || world.tienePasivo?.('traje_hostil') || world.tienePasivo?.('proteccion_quimica');
        if (world.turn % (filtrado ? 50 : 25) === 0) world.sanity(-1);
        if (rng.chance(0.01)) {
          world.log(rng.pick([
            'Crujidos a tu espalda. No hay nada.',
            'Alguien susurra tu nombre.',
            'Por el rabillo del ojo, algo se mueve.',
            'Pasos. ¿Tuyos?',
          ]), 'event');
          world.sanity(-1);
        }
      },
    },
    aislamiento: {
      nombre: 'Aislamiento',
      icono: '⌀',
      desc: 'Este nivel te separa de todo ser vivo. La soledad pesa. Una máscara de gas filtra la mitad.',
      turno(world) {
        const filtrado = world.equipado('mascara_gas') || world.tienePasivo?.('traje_hostil') || world.tienePasivo?.('proteccion_quimica');
        if (world.turn % (filtrado ? 50 : 25) === 0) world.sanity(-1);
      },
    },
    tiempo_raro: {
      nombre: 'Tiempo fracturado',
      icono: '🕰',
      desc: 'Los segundos avanzan y retroceden: a veces el mundo juega dos turnos.',
      turno(world, rng) {
        if (rng.chance(0.12)) {
          world.extraWorldStep = true;
          if (rng.chance(0.3)) world.log('El reloj retrocede. O avanza. Da igual.', 'event');
        }
      },
    },
    gravedad_baja: {
      nombre: 'Gravedad reducida',
      icono: '🪶',
      desc: 'Gravedad de 2 m/s²: te desplazas a saltos de dos casillas.',
      // implementado en el movimiento del jugador
    },
    pierdes_inventario: {
      nombre: 'Despojo',
      icono: '∅',
      desc: 'Tus pertenencias no cruzan a este nivel: entras con las manos vacías.',
      entrar(world) {
        const p = world.player;
        if (p.inv.length || p.manos.some(Boolean) || Object.values(p.equipo).some(Boolean)) {
          p.inv = [];
          p.manos = [null, null];
          p.equipo = { cara: null, cuerpo: null, pies: null };
          p.luz = false; // la linterna perdida no puede seguir alumbrando
          world.log('Tu equipo ha desaparecido. Solo quedas tú.', 'danger');
        }
      },
    },
    controles_invertidos: {
      nombre: 'Reflejo invertido',
      icono: '🪞',
      desc: 'El espacio está espejado: tus movimientos se invierten.',
      // implementado en el input
    },
    niebla: {
      nombre: 'Niebla persistente',
      icono: '🌫',
      desc: 'Una niebla espesa reduce tu campo de visión.',
      entrar(world) {
        world.visionMod = -2;
      },
    },
    equipo_asesino: {
      nombre: 'Equipamiento hostil',
      icono: '🔪',
      desc: 'El instrumental quirúrgico del nivel cobra vida y se lanza contra ti. Tirada de dado para esquivar.',
      turno(world, rng) {
        if (world.turn % 26 === 13) {
          world.log('El instrumental quirúrgico se eleva en el aire a tu alrededor…', 'danger');
          world.rollDice('🔪 ¡Un bisturí apunta hacia ti! Tira para esquivar…', (d) => {
            const p = world.player;
            const dir = rng.pick([[7, 0], [-7, 0], [0, 6], [5, -5], [-5, -5]]);
            if (window.Sfx) Sfx.play('bisturi');
            if (d <= 8) {
              if (window.Effects) Effects.proyectil(p.x + dir[0], p.y + dir[1], p.x, p.y, '#d8e0e8');
              setTimeout(() => {
                world.hurt(10, 'un bisturí volador', true);
                if (window.Effects) {
                  Effects.particles(p.x, p.y, '#c04030', 10);
                  Effects.doShake(4, 140);
                }
                world.log(`Dado: ${d}. ¡El bisturí te alcanza! (−10 salud)`, 'danger');
              }, 380);
            } else {
              // pasa rozando y cae al suelo a medio camino
              if (window.Effects)
                Effects.proyectil(p.x + dir[0], p.y + dir[1], p.x - dir[0] * 0.3, p.y - dir[1] * 0.3 + 0.6, '#d8e0e8');
              world.log(`Dado: ${d}. Te agachas a tiempo: el bisturí pasa silbando y cae con un tintineo.`, 'good');
            }
          });
        }
      },
    },
    agua_traicionera: {
      nombre: 'Charcos sirena',
      icono: '💧',
      desc: 'El agua de este nivel atrae con fuerza gravitatoria a quien se acerca. Unas botas reforzadas te anclan al suelo.',
      turno(world, rng) {
        if (world.equipado('botas_reforzadas')) return; // pisada firme
        const g = world.map.grid, p = world.player;
        if (MapGen.at(g, Math.round(p.x), Math.round(p.y)) === MapGen.T.AGUA && rng.chance(0.08)) {
          world.hurt(4, 'una corriente anómala', true);
          world.log('La corriente tira de ti y te golpea contra el fondo.', 'danger');
        }
      },
    },
    respiracion_acuatica: {
      nombre: 'Inmersión',
      icono: '◌',
      desc: 'El oxígeno baja mientras nadas. Sal a una zona seca o alcanza un respiradero de burbujas.',
      entrar(world) {
        world.player.oxigeno = 100;
      },
      turno(world) {
        const p = world.player, g = world.map.grid;
        const enAgua = MapGen.at(g, Math.round(p.x), Math.round(p.y)) === MapGen.T.AGUA;
        const respiradero = (world.map.airPockets || []).some((air) =>
          Math.hypot(air.x - p.x, air.y - p.y) <= 1.25);
        const anterior = p.oxigeno ?? 100;
        if (!enAgua || respiradero) p.oxigeno = Math.min(100, anterior + (respiradero ? 28 : 18));
        else p.oxigeno = Math.max(0, anterior - 4);
        if (respiradero && anterior < 70 && p.oxigeno >= 70)
          world.log('El respiradero llena tus pulmones de aire.', 'good');
        if (p.oxigeno === 20 && anterior > 20) world.log('Te queda muy poco oxígeno.', 'danger');
        if (p.oxigeno === 0 && world.turn % 2 === 0) world.hurt(8, 'el ahogamiento', true);
      },
    },
    vigilado: {
      nombre: 'Escopofobia',
      icono: '👀',
      desc: 'Todo en este nivel te observa. La cordura se desangra. Una máscara de gas filtra la mitad.',
      turno(world) {
        if (world.turn % (world.equipado('mascara_gas') ? 24 : 12) === 0) world.sanity(-1);
      },
    },
  };

  window.Rules = {
    get: (id) => RULES[id],
    aplicarEntrada(world) {
      for (const id of world.level.reglas || []) RULES[id]?.entrar?.(world);
    },
    aplicarTurno(world, rng) {
      for (const id of world.level.reglas || []) RULES[id]?.turno?.(world, rng);
    },
  };
})();
