// A cena do escritorio: junta o motor, a sala (tema) e os personagens.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { config } from '../app/config.js';

export class Escritorio {
  constructor(host, camadaBaloes) {
    this.engine = new Engine(host, { qualidade: config.get('qualidade'), camera: config.get('camera') });
    this.camadaBaloes = camadaBaloes;
    this.engine.aplicarLuz({ ceu: 0xdfe8ff, chao: 0x3a3430, hemi: 1.1, corSol: 0xfff4e0, sol: 2.2, ambiente: 0.5, bloom: 0.25 });
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), new THREE.MeshStandardMaterial({ color: 0xcfc6bb, roughness: 0.8 }));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    this.engine.scene.add(piso);
    this.pronto = Promise.resolve();
  }

  aplicar(s) { this.estado = s; }
}
