'use strict';

// Un bioma decide materiales; el contrato decide cómo debe jugarse el mapa.
// Las reglas semánticas solo leen el comienzo de la descripción para evitar
// clasificar un nivel por una salida o un lugar mencionado de pasada.
const TOPOLOGY_RULES = [
  ['laberinto_salas', /\b(?:labyrinth(?:ine)?|maze|inverted corridors?|haphazardly positioned hallways|interconnected.{0,80}(?:rooms|corridors|chambers)|winding (?:halls|hallways|corridors)|network of (?:wooden )?corridors|nexus of corridors and rooms|numerous .{0,35}rooms and corridors|oddly shaped rooms|series of .{0,35}(?:rooms|chambers|hallways|corridors)|composed of hallways and rooms|small rooms and extremely long .{0,20}corridors|extensive,? directionless .{0,30}halls|endless complex of empty halls|shares (?:many )?similarities with level 0|identical layout to level 0|system of organ chambers)\b/],
  ['hotel_atrio', /\b(?:hotel|motel|resort)\b.{0,240}\b(?:courtyard|atrium)\b|\b(?:courtyard|atrium)\b.{0,240}\bhotel\b/],
  ['aguas_someras', /\b(?:expanse|plain|surface) of (?:shallow |knee-deep )?water\b|\bshallow waters?\b/],
  ['viviendas_conectadas', /\b(?:apartment complex|apartment blocks?|apartments spread|residential complex|suburban residence|house hallways?|paper houses?|small (?:yellow )?house|house undergoing renovation|interconnected (?:houses|homes)|household|domestic interior|mansion|manor|attic|victorian house|abandoned house|average house|two-story house|isolated house|urban home)\b/],
  ['sotanos_conectados', /\b(?:complex of interconnected basements|endless basements?|underground garages?.{0,80}basements?)\b/],
  ['recinto_deportivo', /\b(?:bowling alleys?|tennis courts?|roller rinks?|skating rinks?|skate ?parks?|gymnasium|sports complex|basketball courts?|golf course)\b/],
  ['galerias_comerciales', /\b(?:mall|video rental store|convenience store|public market|marketplaces?|commercial basement|shopping complexes?|shopping area|shopping centre|shopping center|supermarket|department store|retail (?:complex|outlet|zones?)|convention halls?)\b/],
  ['castillo', /\b(?:castle|palace|fortress|citadel|medieval keep)\b/],
  ['cuevas', /\b(?:caves?|cave system|cavern system|caverns?|grotto|mineshaft|underground mine|abandoned .{0,20}quarry|underground stone rooms)\b/],
  ['sala_columnada', /\b(?:columns?|pillars?) (?:spread|arranged|extending|at regular intervals)\b|\bcolonnade\b/],
  ['planta_estudio', /\b(?:television studio|broadcasting studio|music studio|film sets?|movie studio|recording studio|hollywood sets?)\b/],
  ['banos_publicos', /\b(?:public bathrooms?|public restrooms?|cold restroom|bathroom complex|restroom complex)\b/],
  ['aeronave', /\b(?:aircraft interior|inside (?:an |the )?aircraft|airplane interior|main part of aircraft)\b/],
  ['vagones', /\b(?:inside of a subway train|inside (?:a |the )?train|interconnected subway cars|network of cable cars|rail yard|train lines?.{0,80}locomotives)\b/],
  ['estacion_espacial', /\b(?:space station|orbital station|spaceship interior)\b/],
  ['vacio_cosmico', /\b(?:cosmic expanse|transcendent space|dark void lacking any features|nearly empty space devoid|outer-space void|interstellar void)\b/],
  ['corredor_longitudinal', /\b(?:marble corridor.{0,100}repeating set of openings|indefinite halls|infinitely repeating hallway|straight,? seemingly limitless path|endless straight corridor|single endless hallway)\b/],
  ['parque_recreativo', /\b(?:entertainment complex|amusement park|theme park|indoor inflatable park|arcade complex|unnerving arcade|carnival|bounce houses?|funhouse|bumper cars?|casino|game room|party rooms?|party zone|nightclubs?)\b/],
  ['cementerio', /\b(?:cemeter(?:y|ies)|graveyards?|burial grounds?|mausoleums?|funeral home)\b/],
  ['zoologico', /\b(?:endless zoo|resembles? a zoo|zoological (?:park|complex)|dirt trails.{0,100}(?:exhibits|enclosures))\b/],
  ['plataformas', /\b(?:sky-suspended domains?|walkways?.{0,100}(?:above|over) .{0,40}(?:water|void)|(?:expanse of )?mountainous terrains? connected by bridges|(?:cabins?|structures?).{0,90}connected by .{0,30}bridges|hallways? suspended in .{0,30}(?:abyss|void)|floating,? barren island|suspended (?:walkways?|bridges?|paths?))\b/],
  ['biblioteca_abierta', /\b(?:library|libraries|bookshel(?:f|ves)|bookcase|archive|athenaeum)\b/],
  ['prision', /\b(?:prison|jail|penitentiary|cellblock)\b/],
  ['templo', /\b(?:church|cathedral|chapel|monastery|temple|ancient pyramids?)\b/],
  ['aeropuerto', /\b(?:airport|airfield|runway|airport terminal)\b/],
  ['estadio', /\b(?:stadium|colosseum|sports arena|bleachers)\b/],
  ['teatro', /\b(?:theatres?|theaters?|cinema|auditorium|concert-themed space|outdoor concert)\b/],
  ['museo', /\b(?:museum|exhibition hall|art gallery)\b/],
  ['bunker', /\b(?:bunker|bomb shelter|military shelter|military facility|military base)\b/],
  ['almacen', /\b(?:warehouse|distribution center|storage facility)\b/],
  ['restaurante', /\b(?:restaurant|cafeteria|diner|commercial kitchen)\b/],
  ['planta_hotel', /\b(?:hotel|motel|resort|guest rooms?)\b/],
  ['alas_hospitalarias', /\b(?:hospital|clinic|medical wards?|asylum|surgery rooms?)\b/],
  ['alas_escolares', /\b(?:school|classrooms?|university|college|campus|kindergarten)\b/],
  ['alas_laboratorio', /\b(?:research facility|laboratory environment|testing facility)\b/],
  ['planta_oficinas', /\b(?:office building|office complex|office-like space|office spaces?|executive wing|workplace|cubicles?)\b/],
  ['nave_industrial', /\b(?:factory|factories lined|industrial complex|power plants?|power reactors?|nuclear (?:and power )?reactors?|nuclear facility|manufacturing plant|assembly line|abandoned facility.{0,100}(?:pipes|machinery)|rows of drying laundry)\b/],
  ['oceano_abierto', /\b(?:ocean|open sea|seabed|endless sea)\b/],
  ['instalacion_inundada', /\b(?:flooded (?:complex|rooms|building)|complex of flooded .{0,30}(?:rooms|hallways)|submerged (?:complex|rooms|building)|indoor swimming pools?|poolrooms?|sunlit pools?|pool chambers?|waterpark)\b/],
  ['invernadero', /\b(?:greenhouse|glasshouse|enclosed gardens?)\b/],
  ['bosque_claros', /\b(?:forest|woodland|rainforest|state park|nature park|suburban park|ethereal garden|grove of .{0,30}trees|thick canopy|park at night)\b/],
  ['terreno_abierto', /\b(?:tundra|meadow|countryside|grassland|prairie|great plains|verdant plains|pasture|wasteland|desert|landscapes?|valleys?|canyons?|open field|hilly field|flat field of grass|flat expanse of sand|flaming field|lavender flowers?|pale flower appearance|flowers cover it|wheat fields?|barley fields?|grassy hills?|snowy mountains?|hanging .{0,30}on a mountain|stands? before a mountain|field of (?:snow|flowers|roses)|flat terrains?|outdoor expanse|outdoor area|rural area|ice sheet|land covered in snow|covered in (?:a thick layer of )?snow|winter landscapes?|fields of ice and snow|endless expanse of grassy fields|vast expanse of grass|rocky,? dead landscape|large (?:area|plain) of land|level plain|arrangements? of basins|surface is made of nothing but mulch and water|mountainous terrains?|arid steppes|planetary environment|neon green grid stretching out infinitely|livestock farming complex)\b/],
  ['ciudad_transitable', /\b(?:cityscape|city|metropolis|urban district|town|village|rural residential areas|streets and large residential buildings|roads,? and miscellaneous buildings|closed megastructure with buildings|concrete buildings and terraces|abandoned man-made structures|brutalist structures|endlessly stretching ruin of a building)\b/],
  ['barrio_transitable', /\b(?:suburbs?|suburban (?:area|district)|neighbou?rhood|residential district|slums?)\b/],
  ['tuneles_anchos', /\b(?:carbon tunnels?|utility tunnels?|tunnel network|(?:network|system) of .{0,40}tunnels|(?:brick|subterranean|underground|narrow|concrete|dark|extensive) tunnels?|sewers?|maintenance shafts?|mine system|air conditioning ducts?)\b/],
  ['andenes', /\b(?:train station|railway station|subway station|subway system|metro station|bus terminal|bus park|platforms?)\b/],
  ['carretera', /\b(?:highways?|motorways?|freeways?|endless road|road-based level|countless infinitely extending roads|system of asphalt pathways|finds? (?:himself|themselves) in a random car|driving the only car|network of .{0,35}(?:asphalt )?roads?|road systems?)\b/],
  ['vertical', /\b(?:millions of floors|tall skyscrapers?|stairwells? branch|(?:nearly )?infinitely extending vertical architectural? (?:system|structure)?|endless spiral staircase|staircase extends infinitely|exceedingly long,? .{0,20}staircase)\b/],
  ['garaje_abierto', /\b(?:multi-story parking lot|parking lot garage|parking garage|parking lot covered in metal)\b/],
  ['sala_unica', /\b(?:single (?:large |empty )?room|small room consisting|room littered with|one vast room)\b/],
  ['geometria_surreal', /\b(?:most unstable levels|no standard appearance|no stable layout|ever-changing structure|architecturally distorted|distorted,? memory.{0,30}environments|nightmares?.{0,50}childhood|past,? present,? and (?:the )?future|six distinct variations|childhood memories|abstract environments?|randomly assorted rooms and areas|randomly spliced solids|unstable (?:amalgamation|and corrupted variation)|strange areas and structures|boundless sky.{0,180}spheres? that drift|terrain.{0,80}(?:fluctuate|shift|morph)|boundless assortment of areas|paths? will always be random|different forms that can shift|glitched? (?:environment|space)|constantly morphing)\b/],
];

const BIOME_TOPOLOGY = {
  pasillos: 'laberinto_salas', garaje: 'garaje_abierto', tuneles: 'tuneles_anchos',
  hospital: 'alas_hospitalarias', oficinas: 'planta_oficinas', biblioteca: 'biblioteca_abierta',
  recreativo: 'parque_recreativo', cementerio: 'cementerio',
  exterior: 'terreno_abierto', bosque: 'bosque_claros', ciudad: 'ciudad_transitable',
  torres: 'vertical', invernadero: 'invernadero', acuatico: 'instalacion_inundada',
  oceano: 'oceano_abierto', desierto: 'terreno_abierto', nevado: 'terreno_abierto',
  espacial: 'vertical', cielo: 'plataformas', hotel: 'planta_hotel',
  centro_comercial: 'galerias_comerciales', residencial: 'barrio_transitable',
  escuela: 'alas_escolares', industrial: 'nave_industrial', fabrica: 'nave_industrial',
  laboratorio: 'alas_laboratorio', alcantarillas: 'tuneles_anchos', estacion: 'andenes',
  tren: 'vagones', carretera: 'carretera', parque: 'bosque_claros', granja: 'terreno_abierto',
  pantano: 'bosque_claros', ruinas: 'ciudad_transitable', surreal: 'geometria_surreal',
};

const OPENNESS = {
  biblioteca_abierta: 'abierta', garaje_abierto: 'abierta', oceano_abierto: 'abierta',
  terreno_abierto: 'abierta', estadio: 'abierta', aeropuerto: 'mixta', aguas_someras: 'abierta',
  sala_columnada: 'abierta', recinto_deportivo: 'mixta', parque_recreativo: 'mixta',
  cementerio: 'abierta', zoologico: 'mixta', plataformas: 'mixta', geometria_surreal: 'mixta',
  sala_unica: 'abierta', sotanos_conectados: 'cerrada',
  planta_estudio: 'mixta', banos_publicos: 'cerrada', aeronave: 'lineal',
  estacion_espacial: 'cerrada', vacio_cosmico: 'abierta', corredor_longitudinal: 'lineal',
  ciudad_transitable: 'mixta', barrio_transitable: 'mixta', bosque_claros: 'mixta',
  hotel_atrio: 'mixta', galerias_comerciales: 'mixta', castillo: 'mixta',
  laberinto_longitudinal: 'lineal', carretera: 'lineal', vagones: 'lineal',
};

// Topologías que hoy tienen un generador deliberado. El informe de auditoría
// mantiene visibles las demás: detectarlas no equivale a darlas por resueltas.
const SUPPORTED = new Set([
  ...Object.values(BIOME_TOPOLOGY),
  ...TOPOLOGY_RULES.map(([name]) => name),
  'laberinto_no_euclidiano', 'laberinto_longitudinal', 'garaje_infinito',
]);

const PRIORITY = {
  'Level 0': 'laberinto_no_euclidiano',
  'Level 0.01': 'laberinto_longitudinal',
  'Level 1': 'garaje_infinito',
  'Level 11': 'ciudad_transitable',
  'Level 40': 'galerias_comerciales',
  'Level 130': 'viviendas_conectadas',
  'Level 188': 'hotel_atrio',
  'Level 207': 'cementerio',
  'Level 359': 'zoologico',
  'Level 37.2': 'instalacion_inundada',
  'Level 410': 'plataformas',
  'Level 499': 'recinto_deportivo',
  'Level 919': 'plataformas',
  'Level 910': 'aguas_someras',
  'Level Fun': 'parque_recreativo',
  'Toko Kelontong': 'galerias_comerciales',
  'The End': 'biblioteca_abierta',
};

function sourceIntro(source) {
  return `${source.displayTitle || source.title || ''} ${String(source.description || source.lead || '').slice(0, 1100)}`.toLowerCase();
}

function semanticTopology(source) {
  const title = String(source.displayTitle || source.title || '').toLowerCase();
  const description = String(source.description || source.lead || '').toLowerCase();
  const lead = description.slice(0, 520);
  const extended = description.slice(520, 2200);
  // El título es una señal fuerte. En la prosa solo usamos el primer párrafo:
  // más tarde suelen aparecer comparaciones, salidas o recuerdos de otros sitios.
  const firstMatch = (text, allowed = null) => {
    let best = null;
    for (const [topology, re] of TOPOLOGY_RULES) {
      if (allowed && !allowed.has(topology)) continue;
      const match = re.exec(text);
      if (match && (!best || match.index < best.index)) best = { topology, index: match.index };
    }
    return best?.topology || null;
  };
  // Tras el primer párrafo solo admitimos señales difíciles de usar como
  // metáfora. Evita casos como "mind palace" => castillo o una cita de un
  // diccionario universitario => escuela.
  const extendedSafe = new Set([
    'laberinto_salas', 'hotel_atrio', 'aguas_someras', 'viviendas_conectadas', 'sotanos_conectados',
    'recinto_deportivo', 'galerias_comerciales', 'cuevas', 'sala_columnada',
    'planta_estudio', 'banos_publicos', 'aeronave', 'vagones', 'estacion_espacial',
    'vacio_cosmico', 'corredor_longitudinal',
    'parque_recreativo', 'cementerio', 'zoologico', 'plataformas',
    'geometria_surreal', 'sala_unica', 'biblioteca_abierta', 'teatro', 'museo',
    'bunker', 'almacen', 'restaurante', 'planta_hotel', 'alas_hospitalarias',
    'nave_industrial', 'oceano_abierto', 'instalacion_inundada', 'invernadero', 'bosque_claros',
    'terreno_abierto', 'ciudad_transitable', 'barrio_transitable', 'tuneles_anchos',
    'carretera', 'vertical', 'garaje_abierto',
  ]);
  return firstMatch(title) || firstMatch(lead) || firstMatch(extended, extendedSafe);
}

function featuresFor(text) {
  const features = [];
  const rules = [
    ['estanterias', /bookshel|bookcase/], ['libros_sueltos', /\bbooks?\b/],
    ['ordenadores', /computer|terminal/], ['coches', /\bcars?|vehicles?\b/],
    ['charcos', /puddle/], ['niebla', /\bfog|mist\b/], ['apagones', /blackout|shutting off/],
    ['luces_inestables', /flicker|faulty light/], ['objetos_caidos', /litter|scattered|fallen|debris/],
    ['calor', /hot temperature|extreme heat|\bhumid\b/], ['deterioro', /deteriorat|dilapidat|crack|collapse/],
    ['geometria_mutable', /non.?euclidean|geometry|hallways? change|layout changes?/],
    ['patio_central', /courtyard|atrium/], ['viviendas', /apartment|household|residential/],
    ['instalacion_deportiva', /bowling|tennis court|roller rink|gymnasium|sports complex/],
    ['comercios', /market|store|mall|retail/], ['columnas', /columns?|pillars?/],
    ['puentes', /bridges?|walkways?/], ['sobre_agua', /above .{0,30}water|over ponds?|body of water/],
    ['sobre_vacio', /(?:over|above|under) the void|nothing but the void/],
    ['recintos_zoo', /zoo|exhibits?|enclosures?/],
  ];
  for (const [name, re] of rules) if (re.test(text)) features.push(name);
  return features;
}

function contractFor(title, source, biome) {
  const text = sourceIntro(source);
  const priority = PRIORITY[title];
  // Una mención secundaria a unas estanterías o a un búnker no puede
  // convertir un nivel oceánico entero en una biblioteca. Las categorías
  // ambientales explícitas de la wiki tienen precedencia sobre esos indicios.
  const categories = new Set(source.wikiCategories || []);
  const explicitEnvironment = categories.has('Aquatic');
  const semantic = explicitEnvironment ? null : semanticTopology(source);
  const topologia = priority || semantic || BIOME_TOPOLOGY[biome] || 'laberinto_salas';
  return {
    topologia,
    apertura: OPENNESS[topologia] || 'cerrada',
    rasgos: featuresFor(text),
    fuente: priority ? 'wiki_prioritaria' : semantic ? 'wiki_inferida' : explicitEnvironment ? 'wiki_categoria' : 'bioma_inferido',
    soportada: SUPPORTED.has(topologia),
  };
}

module.exports = { BIOME_TOPOLOGY, OPENNESS, PRIORITY, SUPPORTED, TOPOLOGY_RULES, contractFor };
