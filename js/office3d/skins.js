// Skins dos personagens: as prontas (catalogo) e o gerador aleatorio com semente
// (a mesma semente sempre gera o mesmo personagem).
//
// Formato de uma skin:
//   pele, sorriso: 'normal' | 'grande' | 'dentes'
//   cabelo: { estilo, cor }   estilos: curto espetado longo cacheado longoCacheado coque rabo moicano afro chanel careca
//   barba: null | 'cheia' | 'cavanhaque' | 'bigode' | 'mago' (+ barbaCor)
//   roupa: { tipo, cor, cor2, numero }   tipos: camiseta jersey regata moletom terno camisa jaleco traje manto vestido ninja
//   calca: { tipo: 'calca' | 'short' | 'saia', cor }, meia (cor das canelas com short), sapato
//   acessorios: oculos oculosEscuros fone bone boneTras faixa capacete chapeuChef chapeuMago boina gravata coroa antena
//   altura, largura (escala ~0.9..1.1), robo: true (corpo de robo)

export const SKINS = {
  ronaldinho: {
    nome: 'Ronaldinho', pele: 0x7a4a2e, sorriso: 'dentes',
    cabelo: { estilo: 'longoCacheado', cor: 0x16110e },
    roupa: { tipo: 'jersey', cor: 0xffd21f, cor2: 0x0d9b45, numero: '10' },
    calca: { tipo: 'short', cor: 0x1f4fbf }, meia: 0xffffff, sapato: 0x0d9b45,
    acessorios: ['faixa'], faixaCor: 0xffffff, altura: 1.04,
  },
  executiva: {
    nome: 'Executiva', pele: 0xf1c9a5, sorriso: 'normal',
    cabelo: { estilo: 'coque', cor: 0x4a2c1d },
    roupa: { tipo: 'terno', cor: 0x1f2a44, cor2: 0xffffff }, calca: { tipo: 'saia', cor: 0x1f2a44 }, sapato: 0x111111,
    acessorios: ['oculos'], altura: 0.98,
  },
  dev: {
    nome: 'Dev de moletom', pele: 0xe0ac7e, sorriso: 'normal',
    cabelo: { estilo: 'curto', cor: 0x2b1d14 }, barba: 'cheia', barbaCor: 0x2b1d14,
    roupa: { tipo: 'moletom', cor: 0x6b7280, cor2: 0x9ca3af }, calca: { tipo: 'calca', cor: 0x1e3a5f }, sapato: 0xf2f2f2,
    acessorios: ['fone'],
  },
  cientista: {
    nome: 'Cientista', pele: 0xf3d2b8, sorriso: 'grande',
    cabelo: { estilo: 'espetado', cor: 0xeeeeee },
    roupa: { tipo: 'jaleco', cor: 0xf7f7f7, cor2: 0x6aa6ff }, calca: { tipo: 'calca', cor: 0x3a3f4a }, sapato: 0x2b2b2b,
    acessorios: ['oculos'], altura: 0.95,
  },
  astronauta: {
    nome: 'Astronauta', pele: 0xe8b996, sorriso: 'grande',
    cabelo: { estilo: 'curto', cor: 0x8a5a2b },
    roupa: { tipo: 'traje', cor: 0xf2f4f7, cor2: 0x3da9ff }, calca: { tipo: 'calca', cor: 0xf2f4f7 }, sapato: 0x9aa4b2,
    acessorios: ['capacete'],
  },
  robo: {
    nome: 'Robô', robo: true, pele: 0xb8c2cf, sorriso: 'normal', cabelo: { estilo: 'careca', cor: 0 },
    roupa: { tipo: 'camiseta', cor: 0x8f9aab, cor2: 0x3da9ff }, calca: { tipo: 'calca', cor: 0x6b7686 }, sapato: 0x3a4252,
    acessorios: ['antena'],
  },
  ninja: {
    nome: 'Ninja', pele: 0xe0ac7e, sorriso: 'normal', cabelo: { estilo: 'careca', cor: 0 },
    roupa: { tipo: 'ninja', cor: 0x16161a, cor2: 0xd62828 }, calca: { tipo: 'calca', cor: 0x16161a }, sapato: 0x16161a,
    acessorios: [],
  },
  chef: {
    nome: 'Chef', pele: 0xf1c9a5, sorriso: 'grande',
    cabelo: { estilo: 'curto', cor: 0x3b2a1c }, barba: 'bigode', barbaCor: 0x3b2a1c,
    roupa: { tipo: 'jaleco', cor: 0xffffff, cor2: 0xd62828 }, calca: { tipo: 'calca', cor: 0x2b2b2b }, sapato: 0x111111,
    acessorios: ['chapeuChef'], largura: 1.08,
  },
  mago: {
    nome: 'Mago', pele: 0xf3d2b8, sorriso: 'normal',
    cabelo: { estilo: 'longo', cor: 0xdddddd }, barba: 'mago', barbaCor: 0xeeeeee,
    roupa: { tipo: 'manto', cor: 0x4b2a8a, cor2: 0xf2c14e }, calca: { tipo: 'calca', cor: 0x4b2a8a }, sapato: 0x3a2a1e,
    acessorios: ['chapeuMago'],
  },
  hacker: {
    nome: 'Hacker', pele: 0xc68e62, sorriso: 'normal',
    cabelo: { estilo: 'moicano', cor: 0x2bd67b },
    roupa: { tipo: 'moletom', cor: 0x111317, cor2: 0x2bd67b }, calca: { tipo: 'calca', cor: 0x22252e }, sapato: 0x2bd67b,
    acessorios: ['oculosEscuros'],
  },
  designer: {
    nome: 'Designer', pele: 0xf6d5bd, sorriso: 'grande',
    cabelo: { estilo: 'chanel', cor: 0xff6fae },
    roupa: { tipo: 'camisa', cor: 0xffd166, cor2: 0x5aa9ff }, calca: { tipo: 'calca', cor: 0x2e4a7a }, sapato: 0xff6fae,
    acessorios: ['boina'], boinaCor: 0xd62828, altura: 0.96,
  },
  gamer: {
    nome: 'Gamer', pele: 0x8d5a3b, sorriso: 'grande',
    cabelo: { estilo: 'afro', cor: 0x1b120c },
    roupa: { tipo: 'camiseta', cor: 0x7c3aed, cor2: 0x2bf6ff }, calca: { tipo: 'short', cor: 0x22252e }, meia: 0xffffff, sapato: 0xffffff,
    acessorios: ['boneTras', 'fone'], boneCor: 0xff2bd6,
  },
  rockstar: {
    nome: 'Rockstar', pele: 0xf1c9a5, sorriso: 'dentes',
    cabelo: { estilo: 'longo', cor: 0x111111 },
    roupa: { tipo: 'regata', cor: 0x111111, cor2: 0xd62828 }, calca: { tipo: 'calca', cor: 0x1e2a3a }, sapato: 0x111111,
    acessorios: ['oculosEscuros'],
  },
};

// ---------- aleatorio com semente ----------
export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(semente) {
  let a = typeof semente === 'number' ? semente : hash(semente);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const um = (r, lista) => lista[Math.floor(r() * lista.length)];

const PELES = [0xf6d5bd, 0xf1c9a5, 0xe0ac7e, 0xc68e62, 0xa86f48, 0x8d5a3b, 0x6b4128, 0x4a2c1d];
const CABELOS = [0x16110e, 0x2b1d14, 0x4a2c1d, 0x8a5a2b, 0xc98b52, 0xe8c37a, 0xd9a066, 0x9b2e1f, 0xdddddd, 0xff6fae, 0x5aa9ff, 0x2bd67b, 0x7c3aed];
const ESTILOS = ['curto', 'curto', 'espetado', 'longo', 'cacheado', 'coque', 'rabo', 'moicano', 'afro', 'chanel', 'careca', 'longoCacheado'];
const ROUPAS = ['camiseta', 'camiseta', 'moletom', 'camisa', 'terno', 'jaleco', 'regata', 'vestido', 'jersey'];
const CORES = [0xe85d5d, 0xf28c28, 0xffd166, 0x4ade80, 0x2bb3a3, 0x5aa9ff, 0x3b5bdb, 0x7c3aed, 0xff6fae, 0x22252e, 0xf2f2f2, 0x6b7280, 0x8a5a36];
const CALCAS = [0x1e3a5f, 0x22252e, 0x3a3f4a, 0x6b4a2f, 0x2e4a7a, 0xc2a27a, 0x4a5d3a];
const ACESS = ['oculos', 'oculosEscuros', 'fone', 'bone', 'boneTras', 'faixa', 'boina', 'gravata'];

export function aleatoria(semente) {
  const r = rng(semente);
  const roupa = um(r, ROUPAS), estilo = um(r, ESTILOS);
  const acessorios = [];
  if (r() < 0.45) acessorios.push(um(r, ACESS));
  if (roupa === 'terno' && r() < 0.6 && !acessorios.includes('gravata')) acessorios.push('gravata');
  const temBarba = r() < 0.22 && !['chanel', 'coque'].includes(estilo);
  const corCabelo = um(r, CABELOS);
  return {
    nome: 'Aleatório',
    pele: um(r, PELES), sorriso: um(r, ['normal', 'normal', 'grande', 'dentes']),
    cabelo: { estilo, cor: corCabelo },
    barba: temBarba ? um(r, ['cheia', 'cavanhaque', 'bigode']) : null, barbaCor: corCabelo,
    roupa: { tipo: roupa, cor: um(r, CORES), cor2: um(r, CORES), numero: String(1 + Math.floor(r() * 23)) },
    calca: { tipo: roupa === 'vestido' ? 'saia' : r() < 0.2 ? 'short' : 'calca', cor: um(r, CALCAS) }, meia: 0xffffff,
    sapato: um(r, [0x111111, 0xf2f2f2, 0x6b4a2f, 0xe85d5d, 0x5aa9ff]),
    acessorios, faixaCor: um(r, CORES), boneCor: um(r, CORES), boinaCor: um(r, CORES),
    altura: 0.92 + r() * 0.16, largura: 0.92 + r() * 0.16,
  };
}

// nomes para os subagentes (cada um ganha um, sorteado pela semente)
const NOMES = ['Bia', 'Léo', 'Duda', 'Caio', 'Mari', 'Rafa', 'Gabi', 'Téo', 'Lia', 'Davi', 'Nina', 'Enzo', 'Yasmin', 'Igor', 'Luna',
  'Theo', 'Malu', 'Pedro', 'Sofia', 'Joca', 'Iris', 'Beto', 'Clara', 'Vini', 'Lara', 'Tito', 'Zoe', 'Guto', 'Mel', 'Nando'];
export const nomeAleatorio = (semente) => um(rng('nome' + semente), NOMES);

// resolve o que esta salvo na config: 'aleatorio' | id de skin pronta | { custom: skin }
export function resolver(escolha, semente) {
  if (escolha && typeof escolha === 'object' && escolha.custom) return { ...aleatoria(semente), ...escolha.custom, nome: escolha.custom.nome || 'Personalizado' };
  if (typeof escolha === 'string' && SKINS[escolha]) return SKINS[escolha];
  return aleatoria(semente);
}
