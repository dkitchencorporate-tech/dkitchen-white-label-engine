import type { Huecos } from '../../src/marca/huecos';
import Portada from './huecos/Portada';
import Preloader from './huecos/Preloader';
import Pie from './huecos/Pie';
import './estilos.css';

// Diseño de autor de Alacena: portada con escaparate 3D, preloader animado,
// pie de marca y efectos propios (estilos.css). El motor no cambia.
const huecos: Huecos = { Hero: Portada, Preloader, Pie };

export default huecos;
