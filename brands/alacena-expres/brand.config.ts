import { defineBrand } from '../../src/marca/definir';

// Alacena Exprés · dark store de tapeo, embutidos y vinos gourmet a domicilio en
// Madrid. Consumo diario, fiestas, reuniones de último momento y regalos.
export default defineBrand({
  slug: 'alacena-expres',
  preajuste: 'dark_store',
  // Sin mostrador: solo reparto, con zonas de precio propio, regalos e inventario.
  modulos: { recogida: false },

  name: 'Alacena Exprés',
  shortName: 'Alacena',
  legalName: 'Alacena Exprés S.L.',
  slogan: 'Tapeo, ibéricos y vinos gourmet en tu puerta en 30 minutos',
  cif: '',

  phone: '',
  email: 'hola@alacena-expres.example',
  address: '',
  city: 'Madrid',

  tema: {
    primary: '#7A1E2C',
    primaryHover: '#5E1621',
    primaryLight: '#F6ECE4',
    accent: '#B8892F',
    accentHover: '#9A7226',
    surface: '#FBF7F0',
    card: '#FFFFFF',
    cardHover: '#FDF9F3',
    ink: '#2A1A14',
    inkSoft: '#6E5A4E',
    border: '#E9DFD2',
    radius: 1.25,
    scheme: 'light'
  },
  fuentes: {
    sans: 'Inter',
    display: 'Playfair Display',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800;900&display=swap'
  },

  assets: {
    logoUrl: '/marca/logo.svg',
    heroBannerUrl: '/marca/productos/pack-reunion-expres.webp',
    placeholderProductUrl: '/marca/placeholder-producto.svg',
    iconoFuente: 'recursos/icono.svg'
  },

  splash: { title: 'Alacena Exprés', subtitle: 'Abriendo la despensa…', durationMs: 1100 },

  loyalty: {
    clubName: 'Club Alacena',
    badgeText: 'Club Alacena',
    heroTitle: 'Cada pedido suma',
    heroSubtitle: 'Y la despensa te invita',
    heroDescription: 'Regístrate gratis: 3 puntos por cada 10 € y, al llegar a 40, el producto que elijas va de nuestra cuenta.',
    rewardDescription: 'Un producto de la despensa, gratis.'
  },

  orderDefaults: {
    currency: 'EUR',
    currencySymbol: '€',
    estimatedDeliveryMinutes: '30-60 min',
    estimatedPickupMinutes: '',
    upsellNotice: '¿Hielo, patatas o tónica? Que no falte nada en la reunión.',
    ticketPrefix: 'ALA'
  },

  social: {},
  legal: { contactEmail: 'hola@alacena-expres.example', dpoEmail: '' },

  seo: {
    title: 'Alacena Exprés · Tapeo y gourmet a domicilio en Madrid',
    description: 'Ibéricos, quesos DOP, conservas, vinos, cavas, cervezas frías, hielo y packs para fiestas en tu puerta en 30 minutos. Regalos con mensaje.',
    lang: 'es'
  },

  pwa: { themeColor: '#7A1E2C', backgroundColor: '#FBF7F0', adminName: 'Panel Alacena' },

  creditos: { mostrar: true, texto: 'Tecnología DKitchen', url: 'https://dkitchencorporate.es/' }
});
