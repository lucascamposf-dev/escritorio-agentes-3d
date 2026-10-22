// Catalogo de temas do escritorio. Para criar um tema novo: copie um arquivo desta pasta,
// mude cores/materiais/vista/extras e acrescente aqui. A planta (layout.js) e a mesma para todos.
import moderno from './moderno.js';
import loft from './loft.js';
import cyberpunk from './cyberpunk.js';
import aconchegante from './aconchegante.js';
import espacial from './espacial.js';

export const TEMAS = [moderno, loft, cyberpunk, aconchegante, espacial];
export const tema = (id) => TEMAS.find((t) => t.id === id) || TEMAS[0];
