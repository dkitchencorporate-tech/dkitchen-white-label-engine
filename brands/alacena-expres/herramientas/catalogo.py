# Catálogo de Alacena Exprés. Genera ../semilla.sql (con cabecera.sql delante).
# Uso: python3 catalogo.py .   (desde esta carpeta); después copia semilla.sql a la marca.
import json, re, sys, unicodedata

CATEGORIAS = [
  ("Combos", "Packs, tablas y cestas listos para compartir o regalar"),
  ("Ibéricos y embutidos", "Loncheados a cuchillo y envasados al vacío"),
  ("Quesos", "Curados, cremosos y con denominación de origen"),
  ("Conservas gourmet", "Lo mejor del Cantábrico y de las rías"),
  ("Tapeo y aperitivo", "El picoteo de siempre, sin salir de casa"),
  ("Vinos", "Tintos, blancos y rosados para cada ocasión"),
  ("Cavas y champán", "Burbujas para celebrar"),
  ("Cervezas", "Bien frías, en lata o botella"),
  ("Licores y destilados", "Para el gin-tonic y la sobremesa"),
  ("Refrescos, aguas y hielo", "Lo que nunca puede faltar"),
  ("Postres y dulces", "El final perfecto"),
  ("Fiesta y menaje", "Vasos, platos y todo para la reunión"),
]

FRIO = {"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1,
         "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}
REGALO = {"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1,
         "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}
FIESTA = {"groups": [{"id": "extras", "name": "Añade", "min": 0, "max": 3,
         "options": [{"id": "hielo", "name": "Bolsa de hielo 2 kg", "price": 2.5},
                     {"id": "vasos", "name": "25 vasos compostables", "price": 3.9},
                     {"id": "servilletas", "name": "50 servilletas", "price": 2.5}]}]}
VELAS = {"groups": [{"id": "celebracion", "name": "Celebración", "min": 0, "max": 2,
         "options": [{"id": "velas", "name": "Velas de cumpleaños", "price": 1.5},
                     {"id": "tarjeta", "name": "Tarjeta con dedicatoria", "price": 0}]}]}
CORTE = {"groups": [{"id": "formato", "name": "Formato", "min": 1, "max": 1,
         "options": [{"id": "sobre-100", "name": "Sobre de 100 g", "price": 0},
                     {"id": "sobre-200", "name": "Dos sobres (200 g)", "price": None}]}]}

FOTO = ", professional food photography, soft natural window light, shallow depth of field, appetizing, high detail, no text, no labels, no logos, no watermark"
BOT = ", unlabeled bottle, elegant product photography on dark wood table, soft light, no text, no labels, no logos"

# (categoría, nombre, descripción, precio, formato, insignia, alérgenos, alcohol, existencias, opciones, prompt)
P = [
 # --- Packs y tablas
 ("Combos", "Tabla ibérica para dos", "Jamón de bellota, lomo, chorizo y salchichón ibéricos con picos camperos. Lista en 2 minutos.", 24.90, "2 personas · 300 g", "Más vendido", ["gluten"], False, None, None,
  "spanish iberian charcuterie board with jamon, lomo, chorizo and salchichon slices and breadsticks on a wooden board" + FOTO),
 ("Combos", "Tabla de quesos españoles", "Manchego curado, Idiazabal, Payoyo y Torta del Casar con membrillo y nueces.", 22.90, "2–3 personas · 400 g", "DOP", ["lacteos", "frutos_cascara"], False, None, None,
  "spanish cheese board with manchego wedges, creamy torta del casar, quince paste and walnuts on slate" + FOTO),
 ("Combos", "Pack reunión exprés", "Para 4–6 personas en 30 minutos: tabla ibérica, quesos, gildas, aceitunas, patatas, pan de cristal y 2 vinos.", 69.90, "4–6 personas", "Último momento", ["gluten", "lacteos", "pescado", "sulfitos"], True, 20, FIESTA,
  "generous spanish tapas spread for friends with cured ham, cheese, olives, gildas, chips and two bottles of wine on a table" + FOTO),
 ("Combos", "Pack fiesta 10–12 personas", "Dos tablas ibéricas, dos de quesos, tortilla, croquetas, conservas, 24 cervezas, hielo y menaje.", 159.00, "10–12 personas", "Para fiestas", ["gluten", "lacteos", "huevos", "pescado", "moluscos", "sulfitos"], True, 8, FIESTA,
  "big spanish party table with many tapas platters, tortilla, croquetas, cured meats, cheese and many beer cans with ice" + FOTO),
 ("Combos", "Pack vermut del domingo", "Vermut rojo de 1 L, gildas, mejillones en escabeche, aceitunas gordal y patatas al aceite de oliva.", 27.90, "2–4 personas", "Nuevo", ["pescado", "moluscos", "sulfitos"], True, None, None,
  "spanish vermouth aperitivo with glass of red vermouth with orange slice, gildas skewers, olives, mussels and potato chips" + FOTO),
 ("Combos", "Pack after-work", "Seis cervezas bien frías, chorizo ibérico, patatas fritas y aceitunas. Lo esencial para desconectar.", 21.90, "2–3 personas", None, ["gluten"], True, None, FRIO,
  "six cold beer cans with condensation, sliced chorizo, olives and potato chips on a wooden table" + FOTO),

 # --- Ibéricos y embutidos
 ("Ibéricos y embutidos", "Jamón ibérico de bellota 100 %", "Loncheado a cuchillo, curación mínima de 36 meses. Atemperar 15 minutos antes de servir.", 14.90, "Sobre 100 g", "Estrella", [], False, 40, None,
  "thinly hand sliced iberico bellota ham fanned on a white plate, translucent fat" + FOTO),
 ("Ibéricos y embutidos", "Jamón ibérico de cebo de campo", "Loncheado a máquina, sabor intenso y precio de diario.", 7.90, "Sobre 100 g", None, [], False, None, None,
  "sliced spanish cured ham on parchment paper" + FOTO),
 ("Ibéricos y embutidos", "Paleta ibérica de bellota", "Más jugosa y aromática que el jamón. Loncheada a cuchillo.", 9.90, "Sobre 100 g", None, [], False, None, None,
  "hand cut iberian paleta ham slices on wooden board" + FOTO),
 ("Ibéricos y embutidos", "Lomo ibérico de bellota", "Cinta de lomo adobada con pimentón de la Vera y curada en bodega.", 8.90, "Sobre 100 g", None, [], False, None, None,
  "thin slices of iberian cured pork loin lomo with paprika rim on a plate" + FOTO),
 ("Ibéricos y embutidos", "Chorizo ibérico de bellota", "Pimentón de la Vera y ajo. Sin gluten.", 6.90, "Sobre 150 g", None, [], False, None, None,
  "sliced spanish chorizo iberico on a rustic wooden board" + FOTO),
 ("Ibéricos y embutidos", "Salchichón ibérico de bellota", "Pimienta negra en grano y curación lenta.", 6.90, "Sobre 150 g", None, [], False, None, None,
  "sliced spanish salchichon with black peppercorns on a board" + FOTO),
 ("Ibéricos y embutidos", "Cecina de León IGP", "Carne de vacuno curada y ligeramente ahumada. Con un hilo de aceite de oliva, perfecta.", 6.50, "Sobre 100 g", "IGP", [], False, None, None,
  "thin slices of cecina de leon cured beef with olive oil drizzle" + FOTO),
 ("Ibéricos y embutidos", "Sobrasada de Mallorca IGP", "Para untar sobre pan tostado con un poco de miel.", 5.90, "Pieza 200 g", None, [], False, None, None,
  "sobrasada spread on toasted bread with honey drizzle" + FOTO),

 # --- Quesos
 ("Quesos", "Queso manchego curado DOP", "Leche de oveja manchega, curación de 12 meses. Cuña lista para cortar.", 7.90, "Cuña 250 g", "DOP", ["lacteos"], False, None, None,
  "wedge of cured manchego cheese with zigzag rind and a few slices" + FOTO),
 ("Quesos", "Queso Idiazabal ahumado DOP", "Oveja latxa, ligeramente ahumado con madera de haya.", 8.50, "Cuña 250 g", "DOP", ["lacteos"], False, None, None,
  "smoked idiazabal sheep cheese wedge with golden rind" + FOTO),
 ("Quesos", "Torta del Casar DOP", "Cremosa, para abrir por arriba y untar con picos.", 14.50, "Pieza 300 g", "DOP", ["lacteos"], False, 15, None,
  "creamy torta del casar cheese opened on top with a spoon and breadsticks" + FOTO),
 ("Quesos", "Queso Payoyo de cabra", "Queso de cabra payoya de la sierra de Grazalema, curado en manteca.", 9.90, "Cuña 250 g", "Premiado", ["lacteos"], False, None, None,
  "aged goat cheese wedge with dark rind on rustic board" + FOTO),
 ("Quesos", "Queso Cabrales DOP", "Azul asturiano de sabor intenso. Para los valientes.", 7.90, "Pieza 200 g", "DOP", ["lacteos"], False, None, None,
  "crumbly cabrales blue cheese with blue veins on slate" + FOTO),
 ("Quesos", "Queso Mahón-Menorca DOP", "Semicurado, suave y con un punto salino.", 6.90, "Cuña 250 g", None, ["lacteos"], False, None, None,
  "mahon menorca cheese wedge with orange rind" + FOTO),

 # --- Conservas
 ("Conservas gourmet", "Anchoas del Cantábrico 00", "Ocho filetes seleccionados a mano, en aceite de oliva.", 12.90, "Lata 8 filetes", "Gourmet", ["pescado"], False, None, None,
  "premium cantabrian anchovy fillets in olive oil in an open tin" + FOTO),
 ("Conservas gourmet", "Ventresca de bonito del norte", "La parte más jugosa del bonito, en aceite de oliva.", 9.50, "Lata 120 g", None, ["pescado"], False, None, None,
  "tender white tuna belly ventresca pieces in olive oil in a tin" + FOTO),
 ("Conservas gourmet", "Mejillones en escabeche gallegos", "Mejillones de las rías gallegas fritos y en escabeche. 8–12 piezas.", 6.90, "Lata 115 g", None, ["moluscos"], False, None, None,
  "spanish mussels in red escabeche sauce in an open tin with toothpicks" + FOTO),
 ("Conservas gourmet", "Berberechos de las rías 30/40", "Al natural, el aperitivo gallego por excelencia.", 13.90, "Lata 111 g", None, ["moluscos"], False, None, None,
  "small cockles berberechos in an open tin with lemon wedge" + FOTO),
 ("Conservas gourmet", "Pulpo en aceite de oliva", "Trozos de pulpo gallego cocido, listos para servir con pimentón.", 11.50, "Lata 111 g", None, ["moluscos"], False, None, None,
  "octopus pieces in olive oil with paprika in an open tin" + FOTO),
 ("Conservas gourmet", "Pimientos del piquillo de Lodosa DOP", "Asados a la leña y pelados a mano.", 5.90, "Frasco 220 g", None, [], False, None, None,
  "roasted red piquillo peppers in a glass jar and on a plate" + FOTO),
 ("Conservas gourmet", "Bonito del norte en aceite de oliva", "Bonito del Cantábrico de costera.", 6.50, "Lata 250 g", None, ["pescado"], False, None, None,
  "chunks of white tuna bonito in olive oil" + FOTO),

 # --- Tapeo
 ("Tapeo y aperitivo", "Aceitunas gordal aliñadas", "Sevillanas, carnosas, con aliño de la casa.", 4.50, "Tarrina 400 g", None, [], False, None, None,
  "big green gordal olives with herbs and garlic in a ceramic bowl" + FOTO),
 ("Tapeo y aperitivo", "Patatas fritas en aceite de oliva", "Fritas en caldera con aceite de oliva y sal.", 3.20, "Bolsa 150 g", "Imprescindible", [], False, None, None,
  "crispy artisan potato chips in a bowl" + FOTO),
 ("Tapeo y aperitivo", "Almendras marcona fritas", "Fritas y saladas, el aperitivo más fino.", 4.90, "Bolsa 150 g", None, ["frutos_cascara"], False, None, None,
  "fried salted marcona almonds in a small bowl" + FOTO),
 ("Tapeo y aperitivo", "Picos camperos", "Panecillos crujientes de Jerez, para acompañar ibéricos y quesos.", 2.90, "Bolsa 250 g", None, ["gluten"], False, None, None,
  "small crunchy spanish breadsticks picos in a basket" + FOTO),
 ("Tapeo y aperitivo", "Croquetas de jamón ibérico", "Cremosas, para freír o hacer en freidora de aire en 8 minutos.", 7.90, "6 unidades", "Casera", ["gluten", "lacteos", "huevos"], False, None, None,
  "golden spanish ham croquetas on a plate, one broken showing creamy inside" + FOTO),
 ("Tapeo y aperitivo", "Tortilla de patata jugosa", "Entera, con cebolla y poco cuajada. Hecha cada mañana.", 12.90, "Entera · 6 raciones", "Hecha hoy", ["huevos"], False, 12, None,
  "whole juicy spanish potato omelette tortilla with a slice cut showing runny center" + FOTO),
 ("Tapeo y aperitivo", "Ensaladilla rusa", "Con ventresca de bonito y mayonesa casera.", 7.50, "Tarrina 400 g", None, ["huevos", "pescado"], False, None, None,
  "spanish ensaladilla rusa potato salad with tuna topped with olives in a bowl" + FOTO),
 ("Tapeo y aperitivo", "Gildas clásicas", "Anchoa, piparra y aceituna manzanilla. Un bocado de San Sebastián.", 6.90, "4 unidades", None, ["pescado", "sulfitos"], False, None, None,
  "four gilda pintxos skewers with anchovy, green pepper and olive" + FOTO),
 ("Tapeo y aperitivo", "Pan de cristal", "Corteza finísima y miga aireada. Para el pan con tomate.", 3.50, "Barra 250 g", None, ["gluten"], False, None, None,
  "crispy spanish pan de cristal bread with tomato and olive oil" + FOTO),

 # --- Vinos
 ("Vinos", "Rioja Crianza DOCa", "Tempranillo con 12 meses en barrica. Fruta roja y vainilla.", 11.90, "Botella 75 cl", "Más vendido", ["sulfitos"], True, None, None,
  "red wine bottle and a glass of red wine" + BOT),
 ("Vinos", "Ribera del Duero Roble", "Tinta del país, joven y con un toque de madera.", 9.90, "Botella 75 cl", None, ["sulfitos"], True, None, None,
  "dark red wine bottle next to grapes" + BOT),
 ("Vinos", "Ribera del Duero Reserva", "Tres años de crianza. Para las ocasiones especiales.", 24.90, "Botella 75 cl", "Premium", ["sulfitos"], True, None, None,
  "premium red wine bottle with a decanter" + BOT),
 ("Vinos", "Albariño Rías Baixas", "Blanco fresco y salino, ideal con conservas y marisco.", 13.90, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "chilled white wine bottle in an ice bucket with a glass" + BOT),
 ("Vinos", "Verdejo Rueda", "Blanco aromático y fácil, el comodín de toda reunión.", 8.90, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "white wine bottle with condensation and a glass of white wine" + BOT),
 ("Vinos", "Priorat DOQ", "Garnacha y cariñena de pizarra. Potente y mineral.", 26.90, "Botella 75 cl", None, ["sulfitos"], True, None, None,
  "dark red wine bottle on slate stones" + BOT),
 ("Vinos", "Godello Valdeorras", "Blanco gallego con cuerpo y untuosidad.", 15.90, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "golden white wine bottle and glass" + BOT),
 ("Vinos", "Rosado de Navarra", "Garnacha rosada, fresca y frutal.", 7.90, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "pink rose wine bottle and glass" + BOT),
 ("Vinos", "Fino de Jerez", "Seco y punzante. El compañero perfecto del jamón.", 8.50, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "pale fino sherry in a small copita glass next to a bottle" + BOT),

 # --- Cavas y champán
 ("Cavas y champán", "Cava Brut Nature Reserva", "Burbuja fina, seco y elegante.", 9.90, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "sparkling wine bottle with champagne flutes" + BOT),
 ("Cavas y champán", "Cava Rosé Brut", "Trepat y garnacha. Fresco y festivo.", 11.50, "Botella 75 cl", None, ["sulfitos"], True, None, FRIO,
  "pink sparkling rose wine bottle with two flutes" + BOT),
 ("Cavas y champán", "Espumoso Gran Reserva", "Más de 30 meses en rima. Complejo y cremoso.", 24.90, "Botella 75 cl", "Premium", ["sulfitos"], True, None, FRIO,
  "premium sparkling wine bottle in ice bucket" + BOT),
 ("Cavas y champán", "Champagne Brut AOC", "Champagne francés para brindar a lo grande.", 44.90, "Botella 75 cl", None, ["sulfitos"], True, 24, FRIO,
  "champagne bottle with gold foil and pouring flute" + BOT),
 ("Cavas y champán", "Champagne Rosé AOC", "Champagne rosado de edición limitada.", 59.90, "Botella 75 cl", "Edición limitada", ["sulfitos"], True, 6, REGALO,
  "luxury rose champagne bottle with pink flutes" + BOT),

 # --- Cervezas
 ("Cervezas", "Cerveza lager especial · pack 6", "Lager española, rubia y refrescante.", 5.90, "6 latas de 33 cl", "Más vendido", ["gluten"], True, None, FRIO,
  "six pack of cold unbranded beer cans with condensation" + FOTO),
 ("Cervezas", "Cerveza tostada · pack 6", "Maltas tostadas, notas de caramelo.", 7.50, "6 botellas de 33 cl", None, ["gluten"], True, None, FRIO,
  "six amber beer bottles without labels" + FOTO),
 ("Cervezas", "IPA artesana de Madrid", "Lúpulos cítricos y amargor marcado. Cervecera local.", 3.20, "Lata 33 cl", "Local", ["gluten"], True, None, FRIO,
  "craft ipa beer poured in a glass next to an unbranded can" + FOTO),
 ("Cervezas", "Cerveza de trigo", "Turbia, suave, con notas de plátano.", 3.50, "Botella 50 cl", None, ["gluten"], True, None, FRIO,
  "hazy wheat beer in a tall glass" + FOTO),
 ("Cervezas", "Pack fiesta 24 latas", "Lager especial para la reunión. Fría si lo indicas.", 19.90, "24 latas de 33 cl", "Para fiestas", ["gluten"], True, None, FRIO,
  "large pile of cold beer cans in a tub with ice" + FOTO),
 ("Cervezas", "Cerveza sin alcohol 0,0 · pack 6", "Todo el sabor, 0,0 % de alcohol.", 5.50, "6 latas de 33 cl", None, ["gluten"], False, None, FRIO,
  "six alcohol free beer cans with condensation" + FOTO),

 # --- Licores
 ("Licores y destilados", "Ginebra premium", "London dry con enebro y cítricos. Para el gin-tonic perfecto.", 29.90, "Botella 70 cl", None, [], True, None, None,
  "gin tonic in a balloon glass with lime and juniper next to a clear bottle" + BOT),
 ("Licores y destilados", "Ron añejo", "Ron de caña envejecido, notas de vainilla y madera.", 27.90, "Botella 70 cl", None, [], True, None, None,
  "aged dark rum in a tumbler glass with a bottle" + BOT),
 ("Licores y destilados", "Whisky de malta 12 años", "Single malt, suave y afrutado.", 49.90, "Botella 70 cl", "Premium", [], True, 10, REGALO,
  "single malt whisky in a crystal glass with a bottle" + BOT),
 ("Licores y destilados", "Vermut rojo de reserva", "Vermut tradicional. Con hielo, rodaja de naranja y aceituna.", 14.90, "Botella 1 L", "Para el aperitivo", ["sulfitos"], True, None, None,
  "glass of red vermouth with ice, orange slice and olive" + BOT),
 ("Licores y destilados", "Pacharán navarro", "Endrinas maceradas en anís. La sobremesa de siempre.", 16.90, "Botella 70 cl", None, [], True, None, None,
  "pacharan sloe liqueur red in a small glass with sloe berries" + BOT),
 ("Licores y destilados", "Orujo de hierbas", "Aguardiente gallego con hierbas aromáticas, servir muy frío.", 14.50, "Botella 70 cl", None, [], True, None, None,
  "yellow herbal liqueur in a shot glass" + BOT),
 ("Licores y destilados", "Vodka premium", "Destilado cinco veces, limpio y neutro.", 26.90, "Botella 70 cl", None, [], True, None, None,
  "frosted clear vodka bottle with shot glasses" + BOT),

 # --- Refrescos
 ("Refrescos, aguas y hielo", "Refresco de cola", "Lata bien fría.", 1.60, "Lata 33 cl", None, [], False, None, None,
  "cold cola in a glass with ice and an unbranded red can" + FOTO),
 ("Refrescos, aguas y hielo", "Refresco de cola zero", "Sin azúcar.", 1.60, "Lata 33 cl", None, [], False, None, None,
  "cola zero glass with ice and a black unbranded can" + FOTO),
 ("Refrescos, aguas y hielo", "Tónica premium · pack 4", "Burbuja fina, amargor elegante.", 5.90, "4 botellas de 20 cl", None, [], False, None, None,
  "four small tonic water bottles without labels" + FOTO),
 ("Refrescos, aguas y hielo", "Refresco de limón", "Con zumo de limón.", 1.60, "Lata 33 cl", None, [], False, None, None,
  "lemon soda in a glass with ice and lemon slice" + FOTO),
 ("Refrescos, aguas y hielo", "Agua mineral natural", "Mineralización débil.", 1.20, "Botella 1,5 L", None, [], False, None, None,
  "large plastic water bottle without label and a glass of water" + FOTO),
 ("Refrescos, aguas y hielo", "Agua con gas", "Burbuja intensa.", 1.50, "Botella 50 cl", None, [], False, None, None,
  "sparkling water glass bottle without label with bubbles" + FOTO),
 ("Refrescos, aguas y hielo", "Zumo de naranja natural", "Exprimido el mismo día.", 4.90, "Botella 1 L", None, [], False, None, None,
  "fresh orange juice in a glass bottle with oranges" + FOTO),
 ("Refrescos, aguas y hielo", "Hielo en cubitos", "Hielo cristalino de agua mineral. Imprescindible para la fiesta.", 2.50, "Bolsa 2 kg", "Imprescindible", [], False, None, None,
  "bag of crystal clear ice cubes" + FOTO),
 ("Refrescos, aguas y hielo", "Ginger beer", "Jengibre picante, para moscow mule.", 2.20, "Botella 20 cl", None, [], False, None, None,
  "ginger beer in a copper mug with lime" + FOTO),

 # --- Postres
 ("Postres y dulces", "Tarta de queso cremosa", "Al estilo vasco, tostada por fuera y fluida por dentro.", 26.90, "Entera · 6–8 raciones", "La favorita", ["lacteos", "huevos", "gluten"], False, 8, VELAS,
  "whole basque burnt cheesecake with a creamy slice cut" + FOTO),
 ("Postres y dulces", "Torrijas caseras", "Pan brioche empapado en leche infusionada y caramelizado.", 8.90, "4 unidades", None, ["gluten", "lacteos", "huevos"], False, None, None,
  "spanish torrijas caramelized french toast with cinnamon" + FOTO),
 ("Postres y dulces", "Turrón de Jijona", "Almendra marcona molida y miel.", 9.90, "Tableta 200 g", None, ["frutos_cascara", "huevos"], False, None, None,
  "soft turron de jijona almond nougat slices" + FOTO),
 ("Postres y dulces", "Chocolate negro 70 % con almendras", "Cacao de origen y almendra tostada.", 4.50, "Tableta 150 g", None, ["frutos_cascara", "soja", "lacteos"], False, None, None,
  "dark chocolate bar with almonds broken into pieces" + FOTO),
 ("Postres y dulces", "Trufas de chocolate", "Ganache de chocolate negro cubierta de cacao.", 7.90, "Caja 150 g", None, ["lacteos"], False, None, REGALO,
  "cocoa dusted chocolate truffles in a box" + FOTO),
 ("Postres y dulces", "Arroz con leche asturiano", "Cremoso, con canela y limón.", 5.50, "2 tarrinas", None, ["lacteos"], False, None, None,
  "creamy spanish rice pudding with cinnamon in clay bowls" + FOTO),
 ("Postres y dulces", "Tocino de cielo", "Yema y almíbar, receta jerezana.", 5.90, "2 unidades", None, ["huevos"], False, None, None,
  "tocino de cielo egg yolk custard flan with caramel" + FOTO),

 # --- Regalos
 ("Combos", "Cesta gourmet clásica", "Rioja crianza, manchego curado, lomo ibérico, anchoas, picos y turrón en cesta de mimbre.", 64.00, "Cesta de mimbre", "Regalo", ["lacteos", "pescado", "gluten", "frutos_cascara", "sulfitos"], True, None, REGALO,
  "spanish gourmet gift basket with wine, cheese, cured meats and tins in a wicker basket" + FOTO),
 ("Combos", "Cesta premium ibérica", "Jamón de bellota loncheado, champagne, Torta del Casar, ventresca y trufas en caja de madera.", 139.00, "Caja de madera", "Edición limitada", ["lacteos", "pescado", "sulfitos"], True, 4, REGALO,
  "luxury wooden gift box with iberian ham, champagne, cheese and chocolates" + FOTO),
 ("Combos", "Estuche vino y queso", "Ribera del Duero roble y cuña de manchego curado.", 29.90, "Estuche de cartón", None, ["lacteos", "sulfitos"], True, None, REGALO,
  "gift box with a red wine bottle and a wedge of manchego cheese" + FOTO),
 ("Combos", "Estuche aperitivo", "Vermut, gildas, anchoas y almendras marcona.", 39.90, "Estuche de cartón", "Nuevo", ["pescado", "frutos_cascara", "sulfitos"], True, None, REGALO,
  "elegant aperitivo gift set with vermouth bottle, anchovy tin and almonds" + FOTO),
 ("Fiesta y menaje", "Envoltorio de regalo", "Papel kraft, lazo y tarjeta. Añádelo a cualquier pedido.", 3.50, "Por pedido", None, [], False, None, None,
  "kraft paper wrapped gift with red ribbon bow and small card" + FOTO),

 # --- Fiesta y menaje
 ("Fiesta y menaje", "Vasos compostables", "Vasos de 33 cl compostables.", 3.90, "Pack 25", None, [], False, None, None,
  "stack of white compostable paper cups on a party table" + FOTO),
 ("Fiesta y menaje", "Platos compostables", "Platos de fibra de caña, 23 cm.", 4.50, "Pack 25", None, [], False, None, None,
  "stack of eco friendly bagasse plates" + FOTO),
 ("Fiesta y menaje", "Servilletas de papel", "Servilletas de doble capa, 33 × 33 cm.", 2.50, "Pack 50", None, [], False, None, None,
  "folded white paper napkins stack" + FOTO),
 ("Fiesta y menaje", "Sacacorchos de camarero", "Doble palanca y cortacápsulas.", 6.90, "Unidad", None, [], False, None, None,
  "waiters corkscrew on wooden table next to a cork" + FOTO),
]

UPSELLS = ["Hielo en cubitos", "Patatas fritas en aceite de oliva", "Tónica premium · pack 4", "Envoltorio de regalo", "Picos camperos", "Refresco de cola"]

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def q(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

def main(dest):
    filas, imagenes = [], []
    orden = {}
    for (cat, nombre, desc, precio, formato, insignia, alerg, alcohol, stock, opciones, prompt) in P:
        orden[cat] = orden.get(cat, 0) + 1
        s = slug(nombre)
        esquema = json.loads(json.dumps(opciones)) if opciones else {}
        if opciones is CORTE:
            pass
        img = f"/marca/productos/{s}.webp"
        imagenes.append({"slug": s, "prompt": prompt})
        filas.append("  (%s, %s, %s, %.2f, %s, %s, ARRAY[%s]::text[], %s, %s, %s, '%s', %d)" % (
            q(cat), q(nombre), q(desc), precio, q(formato), q(insignia),
            ",".join(q(a) for a in alerg), "true" if alcohol else "false",
            "NULL" if stock is None else str(stock), q(img), json.dumps(esquema, ensure_ascii=False).replace("'", "''"), orden[cat]))
    sql = [open(dest + "/cabecera.sql", encoding="utf-8").read().rstrip() + "\n"]
    sql.append("INSERT INTO categories (name, subtitle, sort_order) VALUES")
    sql.append(",\n".join("  (%s, %s, %d)" % (q(n), q(sub), i + 1) for i, (n, sub) in enumerate(CATEGORIAS)))
    sql.append("ON CONFLICT (name) DO NOTHING;\n")
    sql.append("INSERT INTO products (category_id, name, description, price, unit_label, badge, allergens, is_alcohol, stock, image_url, customization_schema, sort_order)")
    sql.append("SELECT c.id, v.name, v.description, v.price, v.unit_label, v.badge, v.allergens, v.is_alcohol, v.stock, v.image_url, v.schema::jsonb, v.sort_order")
    sql.append("FROM (VALUES")
    sql.append(",\n".join(filas))
    sql.append(") AS v(category, name, description, price, unit_label, badge, allergens, is_alcohol, stock, image_url, schema, sort_order)")
    sql.append("JOIN categories c ON c.name = v.category")
    sql.append("WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);\n")
    sql.append("INSERT INTO upsells (product_id, category, sort_order)")
    sql.append("SELECT p.id, 'Que no falte', v.n FROM (VALUES %s) AS v(name, n)" % ", ".join("(%s, %d)" % (q(u), i + 1) for i, u in enumerate(UPSELLS)))
    sql.append("JOIN products p ON p.name = v.name")
    sql.append("WHERE NOT EXISTS (SELECT 1 FROM upsells u WHERE u.product_id = p.id);")
    open(dest + "/semilla.sql", "w", encoding="utf-8").write("\n".join(sql) + "\n")
    json.dump(imagenes, open(dest + "/imagenes.json", "w"), ensure_ascii=False, indent=1)
    print(len(P), "productos")

if __name__ == "__main__":
    main(sys.argv[1])
