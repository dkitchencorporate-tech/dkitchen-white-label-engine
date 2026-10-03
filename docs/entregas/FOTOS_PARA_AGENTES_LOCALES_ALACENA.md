# Instrucciones para los agentes locales · 47 fotos de producto de «Alacena Exprés»

**De:** agente del motor DKitchen (sesión en la nube)
**Para:** agentes locales de karc0 con acceso a un generador de imágenes de alta calidad (o a fotos reales de proveedor) y a GitHub o Google Drive.
**Por qué te llegan estas fotos:** el generador gratuito de la sesión en la nube hace fotos realistas, pero en **botellas, latas y etiquetas escribe texto inventado** (fotos 1–37) y en algunos productos no consigue el aspecto correcto (fotos 38–47) (por ejemplo «SAUCER DIRASE» en una etiqueta de vino), y eso delata que es IA. karc0 pidió que, en ese caso, las indicaciones se te pasaran a ti para que entregues los archivos.

---

## 1. Requisitos de cada foto (obligatorios)

| Requisito | Valor |
|---|---|
| Aspecto | **Foto real de estudio.** Sin ningún rastro de IA: ni texto inventado, ni marcas de agua, ni objetos deformes o duplicados, ni manos ni caras |
| Etiquetas | **Lisas** o con la única palabra **«Alacena»** en una tipografía serif elegante. **Nunca** marcas comerciales reales ni texto ilegible |
| Proporción y tamaño | **4:3**, mínimo **1024×768** (se reducen a 800×600) |
| Formato | `.webp` o `.jpg` (se convierten a WebP) |
| Nombre del archivo | Exactamente el que se indica en cada producto (en minúsculas, con guiones) |
| Estilo común | **Sueltos:** mesa de nogal oscura, servilleta de lino crema, pared beige lisa, luz suave desde la izquierda, ángulo de 45°. **Combos:** vista cenital, mesa de nogal y mantel de lino crema. Las fotos ya aprobadas siguen este estilo: deben parecer de la misma sesión |
| Combos | Tienen que verse **todas** las piezas que enumera la indicación, y **ninguna más** |

**Herramientas recomendadas** (las que hacen etiquetas limpias): Midjourney v7, FLUX 1.1 Pro o Ultra, Ideogram 3, Imagen 4 o GPT-Image. También valen **fotos reales** del proveedor o hechas en estudio, si cumplen el estilo.

**Antes de entregar, revisa cada foto a tamaño completo.** Si una etiqueta tiene letras, salvo «Alacena», repítela.

## 2. Cómo entregarlas (elige una)

**A. GitHub (preferida):**
1. En el repo `dkitchencorporate-tech/dkitchen-white-label-engine`, rama **`nube/fase-3-prueba-de-fuego`**.
2. Sube los archivos a `brands/alacena-expres/recursos/productos/` con el nombre exacto.
3. Commit: `Alacena: fotos de producto con etiqueta (entregadas por agentes locales)`.
4. No toques ningún otro archivo.

**B. Google Drive:** carpeta **«Alacena Exprés · fotos de producto»**, compartida con la cuenta de karc0. La sesión en la nube las descarga con su conector de Drive.

Después, pega en la sesión en la nube:
```
Fotos de Alacena entregadas por <GitHub|Drive>: __ de 47. Faltan: <lista de archivos o «ninguna»>.
```
La sesión en la nube:
- las revisa una a una con las reglas de `docs/manual/05_FOTOS_DE_PRODUCTO.md`;
- las convierte a WebP 800×600;
- comprueba que cada producto tiene su foto;
- las publica con el PR #6.

## 3. Las 37 fotos

Los combos 1–3 (pack reunión exprés, pack fiesta y pack vermut) ya tienen una foto **provisional** en el repo, con etiquetas diminutas. Sustitúyela con el mismo nombre de archivo.

### 1. Pack reunión exprés
- **Archivo:** `pack-reunion-expres.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** 4–6 personas
- **Indicación:**
  > A generous spanish tapas spread for six people: a board of sliced iberico ham and chorizo, manchego cheese wedges, a bowl of green olives, gilda skewers, a bowl of potato chips, crusty bread, and two bottles of wine with elegant minimal cream labels. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 2. Pack fiesta 10–12 personas
- **Archivo:** `pack-fiesta-1012-personas.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** 10–12 personas
- **Indicación:**
  > A big party table with several platters of spanish tapas: sliced iberico ham, cheese boards, a whole spanish potato omelette, golden croquetas, open tins of seafood, and a metal tub full of ice with many plain silver beer cans. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 3. Pack vermut del domingo
- **Archivo:** `pack-vermut-del-domingo.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** 2–4 personas
- **Indicación:**
  > A spanish vermouth aperitivo: a tumbler of red vermouth with ice and an orange slice, a bottle with a elegant minimal cream label, gilda skewers, a small bowl of green olives, an open tin of mussels and a bowl of potato chips. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 4. Pack after-work
- **Archivo:** `pack-after-work.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** 2–3 personas
- **Indicación:**
  > Six cold plain brushed aluminium beer cans, with condensation drops, next to a plate of sliced chorizo, a bowl of green olives and a bowl of potato chips. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 5. Rioja Crianza DOCa
- **Archivo:** `rioja-crianza-doca.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Red wine bottle with an elegant minimal cream label and a glass of red wine. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 6. Ribera del Duero Roble
- **Archivo:** `ribera-del-duero-roble.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Dark red wine bottle with an elegant minimal cream label next to grapes. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 7. Ribera del Duero Reserva
- **Archivo:** `ribera-del-duero-reserva.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Premium red wine bottle with an elegant minimal cream label with a decanter. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 8. Albariño Rías Baixas
- **Archivo:** `albarino-rias-baixas.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Chilled white wine bottle with an elegant minimal cream label in an ice bucket with a glass. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 9. Verdejo Rueda
- **Archivo:** `verdejo-rueda.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > White wine bottle with an elegant minimal cream label with condensation and a glass of white wine. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 10. Priorat DOQ
- **Archivo:** `priorat-doq.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Dark red wine bottle with an elegant minimal cream label on slate stones. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 11. Godello Valdeorras
- **Archivo:** `godello-valdeorras.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Golden white wine bottle with an elegant minimal cream label and glass. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 12. Rosado de Navarra
- **Archivo:** `rosado-de-navarra.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Pink rose wine bottle with an elegant minimal cream label and glass. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 13. Fino de Jerez
- **Archivo:** `fino-de-jerez.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Vinos · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Pale fino sherry in a small copita glass next to a bottle with an elegant minimal cream label. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 14. Cava Brut Nature Reserva
- **Archivo:** `cava-brut-nature-reserva.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cavas y champán · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Sparkling wine bottle with an elegant minimal cream label with champagne flutes. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 15. Cava Rosé Brut
- **Archivo:** `cava-rose-brut.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cavas y champán · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Pink sparkling rose wine bottle with an elegant minimal cream label with two flutes. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 16. Espumoso Gran Reserva
- **Archivo:** `espumoso-gran-reserva.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cavas y champán · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Premium sparkling wine bottle with an elegant minimal cream label in ice bucket. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 17. Champagne Brut AOC
- **Archivo:** `champagne-brut-aoc.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cavas y champán · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Champagne bottle with an elegant minimal cream label with gold foil and pouring flute. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 18. Champagne Rosé AOC
- **Archivo:** `champagne-rose-aoc.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cavas y champán · **Formato de venta:** Botella 75 cl
- **Indicación:**
  > Luxury rose champagne bottle with an elegant minimal cream label with pink flutes. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 19. Cerveza lager especial · pack 6
- **Archivo:** `cerveza-lager-especial-pack-6.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cervezas · **Formato de venta:** 6 latas de 33 cl
- **Indicación:**
  > Six pack of cold plain matte silver beer cans with condensation. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 20. Cerveza tostada · pack 6
- **Archivo:** `cerveza-tostada-pack-6.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cervezas · **Formato de venta:** 6 botellas de 33 cl
- **Indicación:**
  > Six amber beer bottles with elegant minimal cream labels. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 21. IPA artesana de Madrid
- **Archivo:** `ipa-artesana-de-madrid.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cervezas · **Formato de venta:** Lata 33 cl
- **Indicación:**
  > Craft ipa beer poured in a glass next to an plain matte can without any print. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 22. Pack fiesta 24 latas
- **Archivo:** `pack-fiesta-24-latas.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cervezas · **Formato de venta:** 24 latas de 33 cl
- **Indicación:**
  > Large pile of cold beer cans in a tub with ice. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 23. Cerveza sin alcohol 0,0 · pack 6
- **Archivo:** `cerveza-sin-alcohol-0-0-pack-6.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cervezas · **Formato de venta:** 6 latas de 33 cl
- **Indicación:**
  > Six alcohol free beer cans with condensation. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 24. Ginebra premium
- **Archivo:** `ginebra-premium.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Licores y destilados · **Formato de venta:** Botella 70 cl
- **Indicación:**
  > Gin tonic in a balloon glass with lime and juniper next to a clear bottle with an elegant minimal cream label. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 25. Ron añejo
- **Archivo:** `ron-anejo.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Licores y destilados · **Formato de venta:** Botella 70 cl
- **Indicación:**
  > Aged dark rum in a tumbler glass with a bottle with an elegant minimal cream label. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 26. Whisky de malta 12 años
- **Archivo:** `whisky-de-malta-12-anos.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Licores y destilados · **Formato de venta:** Botella 70 cl
- **Indicación:**
  > Single malt whisky in a crystal glass with a bottle with an elegant minimal cream label. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 27. Vodka premium
- **Archivo:** `vodka-premium.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Licores y destilados · **Formato de venta:** Botella 70 cl
- **Indicación:**
  > Frosted clear vodka bottle with an elegant minimal cream label with shot glasses. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 28. Refresco de cola zero
- **Archivo:** `refresco-de-cola-zero.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Refrescos, aguas y hielo · **Formato de venta:** Lata 33 cl
- **Indicación:**
  > Cola zero glass with ice and a black plain matte can without any print. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 29. Tónica premium · pack 4
- **Archivo:** `tonica-premium-pack-4.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Refrescos, aguas y hielo · **Formato de venta:** 4 botellas de 20 cl
- **Indicación:**
  > Four small tonic water bottles with elegant minimal cream labels. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 30. Agua mineral natural
- **Archivo:** `agua-mineral-natural.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Refrescos, aguas y hielo · **Formato de venta:** Botella 1,5 L
- **Indicación:**
  > Large plastic water bottle without label and a glass of water. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 31. Agua con gas
- **Archivo:** `agua-con-gas.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Refrescos, aguas y hielo · **Formato de venta:** Botella 50 cl
- **Indicación:**
  > Sparkling water glass bottle without label with bubbles. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 32. Zumo de naranja natural
- **Archivo:** `zumo-de-naranja-natural.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Refrescos, aguas y hielo · **Formato de venta:** Botella 1 L
- **Indicación:**
  > Fresh orange juice in a glass bottle with an elegant minimal cream label with oranges. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 33. Cesta gourmet clásica
- **Archivo:** `cesta-gourmet-clasica.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** Cesta de mimbre
- **Indicación:**
  > A wicker gift basket with straw filling containing a red wine bottle with a elegant minimal cream label, a wedge of manchego cheese, a pack of sliced cured loin, a tin of anchovies, breadsticks and a bar of turron. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 34. Cesta premium ibérica
- **Archivo:** `cesta-premium-iberica.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** Caja de madera
- **Indicación:**
  > An open luxury wooden gift box lined with cream paper containing sliced iberico ham, a champagne bottle with plain gold foil and blank label, a creamy torta del casar cheese, a tin of tuna belly and chocolate truffles. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 35. Estuche vino y queso
- **Archivo:** `estuche-vino-y-queso.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** Estuche de cartón
- **Indicación:**
  > An open kraft cardboard gift box containing a red wine bottle with a elegant minimal cream label and a wedge of manchego cheese. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 36. Estuche aperitivo
- **Archivo:** `estuche-aperitivo.webp` (o `.jpg`) · **Tipo:** Combo · **Categoría:** Combos · **Formato de venta:** Estuche de cartón
- **Indicación:**
  > An open kraft gift box containing a vermouth bottle with a elegant minimal cream label, an open tin of anchovies, gilda skewers and a small bag of marcona almonds. Overhead (top-down) food photograph for an online gourmet shop, all items arranged on a large dark walnut table with a cream linen cloth, soft diffused natural light from the left, realistic shadows, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.

### 37. Refresco de cola
- **Archivo:** `refresco-de-cola.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Refrescos, aguas y hielo · **Formato de venta:** Lata 33 cl
- **Indicación:**
  > Cold cola in a glass with ice and an plain red can. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. Any label must be either blank or show only the word "Alacena" in an elegant serif; no other text, no real brands, no logos, no watermark, no people, no hands.


## 4. Ampliación: 10 fotos más (el generador gratuito no consigue el producto correcto)

### 38. Arroz con leche asturiano
- **Archivo:** `arroz-con-leche-asturiano.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Postres y dulces · **Formato de venta:** 2 tarrinas
- **Por qué se rechazó aquí:** salió con nueces; debe llevar solo canela en polvo y piel de limón.
- **Indicación:**
  > Two small clay bowls of creamy spanish rice pudding dusted with ground cinnamon and a strip of lemon peel, no nuts. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 39. Cerveza de trigo
- **Archivo:** `cerveza-de-trigo.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Cervezas · **Formato de venta:** Botella 50 cl
- **Por qué se rechazó aquí:** el vaso llevaba un logo; vaso liso.
- **Indicación:**
  > A tall plain glass of hazy golden wheat beer with a thick foam head, no logo on the glass. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 40. Pacharán navarro
- **Archivo:** `pacharan-navarro.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Licores y destilados · **Formato de venta:** Botella 70 cl
- **Por qué se rechazó aquí:** botella con etiqueta con texto.
- **Indicación:**
  > A small glass of red sloe liqueur next to a bottle with an elegant minimal cream label and a few sloe berries. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 41. Sacacorchos de camarero
- **Archivo:** `sacacorchos-de-camarero.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Fiesta y menaje · **Formato de venta:** Unidad
- **Por qué se rechazó aquí:** salió un objeto que no es un sacacorchos de camarero.
- **Indicación:**
  > A classic stainless steel waiter's corkscrew with a dark wooden handle, folded open, next to a wine cork. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 42. Turrón de Jijona
- **Archivo:** `turron-de-jijona.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Postres y dulces · **Formato de venta:** Tableta 200 g
- **Por qué se rechazó aquí:** salió turrón duro de Alicante; el de Jijona es blando, de color tostado y textura untuosa.
- **Indicación:**
  > Slices of soft spanish jijona turron, light brown, smooth and oily ground-almond texture, on a small plate. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 43. Ventresca de bonito del norte
- **Archivo:** `ventresca-de-bonito-del-norte.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Conservas gourmet · **Formato de venta:** Lata 120 g
- **Por qué se rechazó aquí:** parecía crudo; en conserva es pálido, opaco y cocido.
- **Indicación:**
  > Pale cooked white tuna belly fillets, opaque ivory colour, glistening in golden olive oil inside an open round tin. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 44. Mejillones en escabeche gallegos
- **Archivo:** `mejillones-en-escabeche-gallegos.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Conservas gourmet · **Formato de venta:** Lata 115 g
- **Por qué se rechazó aquí:** salieron con concha; en conserva van SIN concha.
- **Indicación:**
  > Plump shelled orange mussel meats without any shells in red paprika escabeche sauce inside an open rectangular tin, two toothpicks beside it. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 45. Berberechos de las rías 30/40
- **Archivo:** `berberechos-de-las-rias-30-40.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Conservas gourmet · **Formato de venta:** Lata 111 g
- **Por qué se rechazó aquí:** salieron con concha; en conserva van SIN concha.
- **Indicación:**
  > Small shelled cockle meats without shells in clear natural brine inside an open round tin, a lemon wedge beside it. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 46. Bonito del norte en aceite de oliva
- **Archivo:** `bonito-del-norte-en-aceite-de-oliva.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Conservas gourmet · **Formato de venta:** Lata 250 g
- **Por qué se rechazó aquí:** parecía crudo; en conserva es pálido, en lascas y cocido.
- **Indicación:**
  > Flaky cooked white tuna chunks, pale beige and opaque, in golden olive oil inside an open round tin. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

### 47. Pimientos del piquillo de Lodosa DOP
- **Archivo:** `pimientos-del-piquillo-de-lodosa-dop.webp` (o `.jpg`) · **Tipo:** Suelto · **Categoría:** Conservas gourmet · **Formato de venta:** Frasco 220 g
- **Por qué se rechazó aquí:** parecían guindillas; el piquillo es grande, triangular y asado.
- **Indicación:**
  > Whole roasted red piquillo peppers, large triangular and glossy with charred spots, in an open glass jar and a few laid on a small plate. Product photograph for an online gourmet shop, single product centered on a dark walnut wooden table with a cream linen napkin, plain warm beige wall behind, soft diffused studio light from the left, gentle realistic shadow, 45-degree angle, 4:3, photorealistic, natural colors. No text, no real brands, no logos, no watermark, no people, no hands.

---

*Reglas generales de las fotos de cualquier marca: `docs/manual/05_FOTOS_DE_PRODUCTO.md`.*
