// A cena do escritorio: junta o motor, a sala (tema) e os personagens.
import { Engine } from './engine.js';
import { construirSala } from './sala.js';
import { tema } from './temas/index.js';
import { config } from '../app/config.js';

export class Escritorio {
  constructor(host, camadaBaloes) {
    this.engine = new Engine(host, { qualidade: config.get('qualidade'), camera: config.get('camera') });
    this.camadaBaloes = camadaBaloes;
    this.trocarTema(config.get('tema'));
    this.engine.onTick((dt, t) => this.sala && this.sala.tick(dt, t));
    this.pronto = Promise.resolve();
  }

  trocarTema(id) {
    if (this.sala) this.sala.liberar();
    this.tema = tema(id);
    this.sala = construirSala(this.engine, this.tema);
  }

  aplicar(s) { this.estado = s; }
}
