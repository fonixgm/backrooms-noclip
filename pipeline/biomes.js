'use strict';

const BIOMES = {
  pasillos: { suelo: '#665f43', pared: '#aaa078', detalle: '#4c4939', luz: '#f2e6a8', fondo: '#0c0b08', descripcion: 'una red cambiante de pasillos y habitaciones' },
  garaje: { suelo: '#4b4d4b', pared: '#8b8d85', detalle: '#c1a34d', luz: '#e5e8dc', fondo: '#090a09', descripcion: 'un complejo de garajes y zonas de estacionamiento' },
  tuneles: { suelo: '#403b35', pared: '#746a5c', detalle: '#9a744b', luz: '#d4ba87', fondo: '#080706', descripcion: 'un sistema de túneles y espacios subterráneos' },
  hospital: { suelo: '#788482', pared: '#b7c2ba', detalle: '#52716b', luz: '#e6f4ed', fondo: '#080b0a', descripcion: 'un entorno médico de salas y corredores' },
  oficinas: { suelo: '#5e615b', pared: '#a9aaa0', detalle: '#60716c', luz: '#e8e3cb', fondo: '#090a09', descripcion: 'un conjunto de oficinas y zonas de trabajo' },
  exterior: { suelo: '#59624c', pared: '#8a8d7a', detalle: '#9e9b67', luz: '#d8d2ad', fondo: '#11120e', descripcion: 'un espacio exterior de límites inciertos' },
  bosque: { suelo: '#3f4937', pared: '#687057', detalle: '#8b7650', luz: '#b8c69e', fondo: '#070906', descripcion: 'una extensión boscosa de límites inciertos' },
  ciudad: { suelo: '#505052', pared: '#85858a', detalle: '#a89565', luz: '#d6d4c7', fondo: '#09090b', descripcion: 'un entorno urbano de calles y edificios' },
  torres: { suelo: '#4d4a55', pared: '#898590', detalle: '#9d8367', luz: '#d9d2c5', fondo: '#08080b', descripcion: 'una estructura vertical de gran altura' },
  invernadero: { suelo: '#53604b', pared: '#8b9a83', detalle: '#728f64', luz: '#d8e3c2', fondo: '#080b07', descripcion: 'un entorno vegetal encerrado entre estructuras de cristal' },
  acuatico: { suelo: '#315b62', pared: '#527c80', detalle: '#6ca4a0', luz: '#a7e1d8', fondo: '#061013', descripcion: 'una instalación parcialmente inundada por agua anómala' },
  oceano: { suelo: '#294956', pared: '#416675', detalle: '#6b8791', luz: '#8fc6d6', fondo: '#030b10', descripcion: 'una masa oceánica con estructuras dispersas' },
  desierto: { suelo: '#766b4d', pared: '#9a8d64', detalle: '#b69a5f', luz: '#f0d89a', fondo: '#17130b', descripcion: 'una extensión árida de arena y roca' },
  nevado: { suelo: '#78888c', pared: '#aebabc', detalle: '#7196a2', luz: '#dceff2', fondo: '#0b1114', descripcion: 'un paisaje cubierto de nieve y hielo' },
  espacial: { suelo: '#30313e', pared: '#55586b', detalle: '#7774a6', luz: '#c4c7ef', fondo: '#020207', descripcion: 'una instalación suspendida en un vacío espacial' },
  cielo: { suelo: '#71828a', pared: '#9caeb2', detalle: '#d5c78a', luz: '#e4f2ef', fondo: '#18252c', descripcion: 'un conjunto de plataformas expuestas al cielo' },
  hotel: { suelo: '#635249', pared: '#9b8071', detalle: '#a78958', luz: '#e4c993', fondo: '#100b09', descripcion: 'un hotel de habitaciones y corredores repetidos' },
  centro_comercial: { suelo: '#626568', pared: '#a4a5a2', detalle: '#b58a64', luz: '#edf0df', fondo: '#0e0e0c', descripcion: 'un centro comercial de locales y galerías vacías' },
  residencial: { suelo: '#5e554d', pared: '#958b7c', detalle: '#7b6b58', luz: '#dbcba7', fondo: '#0d0a08', descripcion: 'un complejo residencial de viviendas conectadas' },
  escuela: { suelo: '#59605a', pared: '#9ba298', detalle: '#627c70', luz: '#dce4ce', fondo: '#090c09', descripcion: 'un edificio escolar de aulas y pasillos' },
  industrial: { suelo: '#484846', pared: '#777872', detalle: '#b39445', luz: '#d8d7c5', fondo: '#090908', descripcion: 'una instalación industrial de maquinaria y conductos' },
  fabrica: { suelo: '#4e4842', pared: '#786e63', detalle: '#a66f46', luz: '#d9bd91', fondo: '#0b0806', descripcion: 'una fábrica abandonada de naves y líneas de producción' },
  laboratorio: { suelo: '#667476', pared: '#a9b7b5', detalle: '#5b8a8e', luz: '#d9f2ed', fondo: '#071011', descripcion: 'un laboratorio de cámaras y salas técnicas' },
  alcantarillas: { suelo: '#3d443c', pared: '#657064', detalle: '#718452', luz: '#b2bd88', fondo: '#060806', descripcion: 'una red de alcantarillas húmedas y contaminadas' },
  estacion: { suelo: '#55575b', pared: '#898d91', detalle: '#a77d55', luz: '#ddd9c7', fondo: '#090a0b', descripcion: 'una estación de andenes y pasajes de servicio' },
  tren: { suelo: '#514b47', pared: '#817873', detalle: '#9d654f', luz: '#d7bd9f', fondo: '#090706', descripcion: 'una sucesión de vagones y túneles ferroviarios' },
  carretera: { suelo: '#4a4b49', pared: '#73756f', detalle: '#b7a552', luz: '#dbd4b1', fondo: '#0d0e0c', descripcion: 'una carretera interminable rodeada de terreno vacío' },
  parque: { suelo: '#4b5c43', pared: '#72806b', detalle: '#8b8854', luz: '#ced7aa', fondo: '#080b07', descripcion: 'un parque de senderos, claros y vegetación' },
  granja: { suelo: '#5c5c3f', pared: '#85805d', detalle: '#a9874e', luz: '#dfd19c', fondo: '#0e0e08', descripcion: 'una zona rural de campos y construcciones agrícolas' },
  pantano: { suelo: '#3d4a3e', pared: '#59675a', detalle: '#657345', luz: '#9eaf7f', fondo: '#050805', descripcion: 'un pantano cubierto de agua estancada y vegetación' },
  ruinas: { suelo: '#56534e', pared: '#79756d', detalle: '#8e775d', luz: '#c8bda4', fondo: '#0b0a08', descripcion: 'unas ruinas de estructuras derrumbadas' },
  surreal: { suelo: '#4d485c', pared: '#77708b', detalle: '#8a6f93', luz: '#d7c5e5', fondo: '#09070d', descripcion: 'un espacio surrealista de geometría y escala incoherentes' },
};

const BIOME_NAMES = Object.keys(BIOMES);
const PALETTES = Object.fromEntries(Object.entries(BIOMES).map(([name, biome]) => [name, {
  suelo: biome.suelo, pared: biome.pared, detalle: biome.detalle, luz: biome.luz, fondo: biome.fondo,
}]));
const DESCRIPTIONS = Object.fromEntries(Object.entries(BIOMES).map(([name, biome]) => [name, biome.descripcion]));

module.exports = { BIOMES, BIOME_NAMES, PALETTES, DESCRIPTIONS };
