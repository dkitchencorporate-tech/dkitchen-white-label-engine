declare module '*.css';

declare module 'virtual:marca-config' {
  import type { BrandConfig } from './marca/esquema';
  const brand: BrandConfig;
  export default brand;
}
