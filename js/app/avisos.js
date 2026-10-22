// Sons curtos (gerados pelo navegador) e notificacoes do Windows quando a janela nao esta em foco.
import { config } from './config.js';

let audio = null;

export function beep(seq) {
  if (!config.get('som')) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    let t = audio.currentTime;
    for (const [f, d] of seq) {
      const osc = audio.createOscillator(), g = audio.createGain();
      osc.frequency.value = f; osc.type = 'sine';
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g).connect(audio.destination); osc.start(t); osc.stop(t + d + 0.02); t += d * 0.9;
    }
  } catch {}
}

export const SONS = {
  done: [[660, .12], [880, .12], [1320, .22]],
  waiting: [[880, .14], [880, .14], [880, .2]],
  error: [[330, .2], [220, .3]],
};

export function notificar(titulo, corpo) {
  try {
    if (config.get('som') && 'Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) new Notification(titulo, { body: corpo });
  } catch {}
}

export async function ligarSom(on) {
  config.set('som', on);
  if (!on) return;
  beep([[880, .08]]);
  try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch {}
}
