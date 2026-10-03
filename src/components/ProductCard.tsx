import { useState } from 'react';
import DOMPurify from 'dompurify';
import IngredientsModal from './IngredientsModal';
import SubcategoryModal from './SubcategoryModal';
import { useI18nStore } from '../store/i18nStore';
import { getProductImageUrl, LOCAL_IMAGE_MAP } from '../data/products';
import { formatoEuros, precioZona, useZonaActual } from '../store/zonaStore';

// Ingredientes a resaltar en la descripción: los define cada marca si quiere
// (el motor no conoce ninguna carta concreta).
const KEY_INGREDIENTS: string[] = [];

interface Product {
  id: number | string;
  category?: string;
  category_id?: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  desc?: string; // Legacy fallback
  price: number;
  badge?: string;
  badge_en?: string;
  img?: string;
  img_url?: string;
  image_url?: string | null;
  isGroup?: boolean;
  subProducts?: Product[];
  /** Existencias (null/undefined = sin control). */
  stock?: number | null;
  is_alcohol?: boolean;
  unit_label?: string | null;
}

// Utilidad para resaltar ingredientes en la descripción
const highlightIngredients = (desc: string) => {
  if (!desc) return null;

  // SECURITY: Sanitize the description before any HTML injection
  let highlightedDesc = DOMPurify.sanitize(desc, { ALLOWED_TAGS: [] });

  KEY_INGREDIENTS.forEach(ing => {
    // Expresión regular insensible a mayúsculas
    const regex = new RegExp(`(${ing})`, 'gi');
    highlightedDesc = highlightedDesc.replace(regex, '<span class="text-brand-primaryHover font-bold">$1</span>');
  });

  // SECURITY: Only <span> with specific class is allowed — all other tags stripped
  const sanitizedWithHighlights = DOMPurify.sanitize(highlightedDesc, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class']
  });

  return (
    <p 
      className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed font-medium line-clamp-3"
      dangerouslySetInnerHTML={{ __html: sanitizedWithHighlights }}
    ></p>
  );
};

interface ProductCardProps {
  product: Product;
  onCustomize?: (product: Product) => void;
}

export default function ProductCard({ product, onCustomize }: ProductCardProps) {
  const { t, tDynamic, lang } = useI18nStore() as any;
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);

  const rawName = product.name || '';
  const rawNameEn = product.name_en || '';
  const displayName = lang === 'en' && rawNameEn ? rawNameEn : tDynamic(rawName);

  const rawDesc = product.description || product.desc || '';
  const rawDescEn = product.description_en || '';
  const displayDesc = lang === 'en' && rawDescEn ? rawDescEn : tDynamic(rawDesc);

  const agotado = product.stock === 0;
  const isAvailable = (product as any).is_available !== false && !agotado;
  const quedanPocas = typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;
  // Re-render al cambiar de zona: el precio mostrado es el de la zona elegida.
  const pct = useZonaActual()?.price_adjust_pct ?? 0;
  const precio = formatoEuros(precioZona(product.price || 0, pct));

  const handleAdd = () => {
    if (!isAvailable) return;

    // Si es un grupo de subcategoría (bebidas, cervezas, aguas), mostrar modal de subcategoría
    if (product.isGroup) {
      setShowSubcategoryModal(true);
      return;
    }

    // Resto de productos:
    // Abrir el modal unificado con foto, extras, notas y cantidad
    if (onCustomize) {
      onCustomize(product);
      return;
    }

    setShowProductModal(true);
  };

  const fallback = `data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='540' viewBox='0 0 800 540'><rect width='800' height='540' fill='%23FAFAFA'/><text x='400' y='260' font-size='28' font-family='sans-serif' font-weight='800' fill='%2371717A' text-anchor='middle' dominant-baseline='middle'>${encodeURIComponent(product.name)}</text></svg>`;
  const localStaticFallback = LOCAL_IMAGE_MAP[product.name] || LOCAL_IMAGE_MAP[rawName];
  const imageSrc = getProductImageUrl(product) || fallback;

  return (
    <>
      <div data-motor="tarjeta-producto" className={`group relative bg-white rounded-3xl border-2 overflow-hidden shadow-xl transition-all duration-300 flex flex-col ${
        !isAvailable 
          ? 'opacity-60 grayscale-[35%] border-gray-300' 
          : 'border-gray-200 hover:border-brand-primary/60 hover:shadow-[0_0_30px_rgb(var(--brand-primary-rgb)/0.2)]'
      }`}>
        {/* Imagen */}
        <div 
          onClick={handleAdd}
          className={`relative h-52 sm:h-56 overflow-hidden bg-brand-surface shrink-0 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <img
            src={imageSrc}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isAvailable ? 'group-hover:scale-110' : ''}`}
            loading="lazy"
            onError={(e) => {
              if (localStaticFallback && !e.currentTarget.src.endsWith(localStaticFallback)) {
                e.currentTarget.src = localStaticFallback;
              } else {
                e.currentTarget.src = fallback;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
          {/* Badge / Tag visible sobre la foto */}
          {!isAvailable ? (
            <span className="absolute top-3 left-3 z-20 bg-zinc-900/90 text-white border-2 border-zinc-700 font-display font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg leading-none">
              {lang === 'en' ? 'OUT OF STOCK' : 'AGOTADO'}
            </span>
          ) : (() => {
            const rawBadge = product.badge || (product as any).customization_schema?.badge || product.name;
            if (!rawBadge) return null;
            const badgeText = (lang === 'en' && (product as any).badge_en) ? (product as any).badge_en : tDynamic(rawBadge);
            const isSpicy = /picante|spicy|hot/i.test(rawBadge);
            return (
              <span className={`absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm border-2 font-display font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg leading-none ${isSpicy ? 'border-red-500 text-red-600' : 'border-brand-primary text-brand-ink'}`}>
                {badgeText}
              </span>
            );
          })()}

          {/* +18 y existencias */}
          {product.is_alcohol && (
            <span className="absolute top-3 right-3 z-20 bg-zinc-900/90 text-white font-black text-[10px] px-2 py-1 rounded-lg" title="Venta solo a mayores de edad">+18</span>
          )}
          {quedanPocas && (
            <span className="absolute bottom-3 left-3 z-20 bg-amber-400 text-zinc-900 font-black text-[10px] uppercase px-2 py-1 rounded-lg">
              ¡Últimas {product.stock}!
            </span>
          )}

          {/* Precio */}
          {!product.isGroup ? (
            <span className="absolute bottom-3 right-3 z-20 bg-brand-primary border-2 border-white text-white font-display font-black text-lg sm:text-xl px-4 py-1.5 rounded-xl shadow-lg leading-none whitespace-nowrap">
              {precio}
            </span>
          ) : (
            <span className="absolute bottom-3 right-3 z-20 bg-white/95 border-2 border-brand-border text-brand-ink font-display font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">
              {t('from')} {precio}
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1 gap-3">
          <div className={`flex-1 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={handleAdd}>
            <h3 className={`font-display font-black text-lg sm:text-xl uppercase tracking-wide leading-tight transition-colors ${
              isAvailable ? 'text-brand-ink group-hover:text-brand-primaryHover' : 'text-zinc-500'
            }`}>
              {displayName}
            </h3>
            {product.unit_label && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-inkSoft mt-1">{product.unit_label}</p>
            )}
            {highlightIngredients(displayDesc)}
          </div>

          {/* Botón de pedido */}
          <button
            onClick={handleAdd}
            disabled={!isAvailable}
            className={`w-full font-display font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
              !isAvailable
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-brand-primary to-brand-primaryHover hover:brightness-110 text-white hover:shadow-[0_10px_25px_-5px_rgb(var(--brand-primary-rgb)/0.4)] active:scale-95'
            }`}
          >
            {product.isGroup ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            )}
            <span>
              {!isAvailable
                ? (lang === 'en' ? 'OUT OF STOCK' : 'AGOTADO')
                : (product.isGroup ? t('view_options') : t('order_now'))}
            </span>
          </button>
        </div>
      </div>

      {showProductModal && (
        <IngredientsModal product={product} onClose={() => setShowProductModal(false)} />
      )}

      {showSubcategoryModal && product.isGroup && (
        <SubcategoryModal productGroup={product} onClose={() => setShowSubcategoryModal(false)} />
      )}

    </>
  );
}
