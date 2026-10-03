import { BRAND_CONFIG } from '../config/brandConfig';

export interface Category {
    id: string;
    name: string;
    name_en?: string;
    subtitle: string | null;
    desc: string;
}

export interface Product {
    id: number | string;
    category?: string;
    category_id?: string;
    name: string;
    name_en?: string;
    desc?: string;
    description?: string;
    description_en?: string;
    price: number;
    badge?: string;
    badge_en?: string;
    img?: string;
    img_url?: string;
    image_url?: string | null;
    subcategory?: string;
    subcategory_id?: string | null;
    isGroup?: boolean;
    subProducts?: any[];
    is_available?: boolean;
    customization_schema?: any;
    sort_order?: number;
}

export const LOCAL_IMAGE_MAP: Record<string, string> = {};

export function getProductImageUrl(product?: { name?: string; image_url?: string | null; img_url?: string | null; img?: string | null } | null): string {
    if (!product) return BRAND_CONFIG.assets.placeholderProductUrl || '/assets/placeholder-food.svg';
    if (product.image_url) return product.image_url;
    if (product.img_url) return product.img_url;
    if (product.img) return product.img;
    if (product.name && LOCAL_IMAGE_MAP[product.name]) return LOCAL_IMAGE_MAP[product.name];
    return BRAND_CONFIG.assets.placeholderProductUrl || '/assets/placeholder-food.svg';
}

export interface UpsellItem {
    id: string;
    name: string;
    name_en?: string;
    desc: string;
    description_en?: string;
    price: number;
}

export interface UpsellCategory {
    category: string;
    items: UpsellItem[];
}

// Grupos de opciones de un producto (customization_schema.groups). Los define
// el negocio en el panel; el servidor valida y cobra cada opción.
export interface ProductOption { id: string; name: string; price: number; }
export interface OptionGroup { id: string; name: string; min: number; max?: number; options: ProductOption[]; }

export function getOptionGroups(product?: { customization_schema?: any } | null): OptionGroup[] {
    const groups = product?.customization_schema?.groups;
    if (!Array.isArray(groups)) return [];
    return groups
        .filter((g: any) => g && typeof g.id === 'string' && Array.isArray(g.options))
        .map((g: any) => ({
            id: g.id,
            name: String(g.name ?? ''),
            min: Number(g.min) || 0,
            max: g.max != null ? Number(g.max) : undefined,
            options: g.options.map((o: any) => ({ id: String(o.id), name: String(o.name ?? o.id), price: Number(o.price) || 0 }))
        }));
}
