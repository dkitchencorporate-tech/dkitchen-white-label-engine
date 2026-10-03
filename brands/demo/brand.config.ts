import { defineBrand } from '../../src/marca/definir';

// Marca neutra de ejemplo. Es la plantilla de `npm run nueva-marca`.
export default defineBrand({
  slug: 'demo',
  preajuste: 'restaurante',
  modulos: {},

  name: 'Marca Demo',
  shortName: 'Demo',
  legalName: 'Marca Demo S.L.',
  slogan: 'Cocina de temporada',
  cif: '',

  phone: '',
  email: 'hola@marca-demo.example',
  address: '',
  city: 'Ciudad Demo',

  tema: {
    primary: '#18181B',
    primaryHover: '#27272A',
    primaryLight: '#F4F4F5',
    accent: '#52525B',
    accentHover: '#3F3F46',
    surface: '#FAFAFA',
    card: '#FFFFFF',
    cardHover: '#F4F4F5',
    ink: '#18181B',
    inkSoft: '#71717A',
    border: '#E4E4E7',
    radius: 1.5,
    scheme: 'light'
  },
  fuentes: {
    sans: 'Plus Jakarta Sans',
    display: 'Outfit',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
  },

  assets: {
    logoUrl: '/marca/logo.svg',
    heroBannerUrl: '',
    placeholderProductUrl: '/marca/placeholder-producto.svg',
    iconoFuente: 'recursos/icono.svg'
  },

  splash: { title: 'Marca Demo', subtitle: 'Preparando la carta…', durationMs: 1200 },

  loyalty: {
    clubName: 'Club Demo',
    badgeText: 'Club de puntos',
    heroTitle: 'Gana puntos en cada pedido',
    heroSubtitle: 'Y canjéalos por platos gratis',
    heroDescription: 'Regístrate gratis, acumula puntos con cada pedido y canjéalos por platos de la carta.',
    rewardDescription: 'Tu plato favorito, gratis.'
  },

  orderDefaults: {
    currency: 'EUR',
    currencySymbol: '€',
    estimatedDeliveryMinutes: '30-45 min',
    estimatedPickupMinutes: '15-20 min',
    upsellNotice: '',
    ticketPrefix: 'DEMO'
  },

  social: {},
  legal: { contactEmail: 'hola@marca-demo.example', dpoEmail: '' },

  seo: {
    title: 'Marca Demo · Pide online',
    description: 'Carta digital, pedidos a domicilio y para recoger.',
    lang: 'es'
  },

  pwa: { themeColor: '#18181B', backgroundColor: '#FFFFFF', adminName: 'Panel Demo' },

  creditos: { mostrar: true, texto: 'Tecnología DKitchen', url: 'https://dkitchencorporate.es/' }
});
