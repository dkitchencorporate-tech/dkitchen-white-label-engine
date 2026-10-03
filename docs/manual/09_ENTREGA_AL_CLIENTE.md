# 09 · Entrega al cliente

## 1. Dossier `brands/<slug>/ENTREGA.md`

Copia `plantillas/ENTREGA.md` y rellena:
- qué incluye la PWA y el panel;
- catálogo por categoría (número de productos y «desde», sacado de la base, no de memoria: guía 04 §8);
- zonas, horario y franja del alcohol;
- lista de «antes de abrir al público» y cómo se ha probado.

Ejemplo completo: `brands/alacena-expres/ENTREGA.md`.

## 2. Lista legal (la confirma el cliente, nosotros la dejamos preparada)

- [ ] **Alérgenos**: revisados con la ficha técnica de cada proveedor (Reglamento UE 1169/2011).
- [ ] **Alcohol**:
  - franja de venta según la ordenanza municipal y autonómica;
  - edad mínima;
  - aviso «Prohibida la venta a menores de 18 años» visible (el pie de Alacena lo lleva);
  - el repartidor pide el DNI.
- [ ] **Datos del negocio**: razón social, CIF y dirección en Panel → Negocio.
- [ ] **Textos legales**: aviso legal, privacidad y cookies con los datos del cliente.
- [ ] **Precios con IVA incluido** y gastos de envío visibles antes de confirmar (el checkout ya los muestra).
- [ ] **Hoja de reclamaciones y derecho de desistimiento**: información para la venta a distancia (los productos perecederos están exentos de desistimiento).

## 3. Credenciales

- El administrador se crea con `npm run crear-admin`. La contraseña se muestra **una vez** y se entrega al cliente **por un canal seguro** (gestor de contraseñas compartido o mensaje que caduca), nunca por correo en claro ni en el repositorio.
- El cliente la cambia en el primer acceso.
- Claves de Vercel, Neon y GitHub: el cliente o DKitchen como propietarios. Nunca cuentas personales.

## 4. Formación rápida (15 minutos con el cliente)

1. Panel → Pedidos: aceptar, preparar, en reparto, entregado, cancelar (las existencias vuelven).
2. Carta: editar precio, existencias, «Agotado», alcohol, formato y foto.
3. Horarios y zonas: abrir o cerrar, editar zonas y códigos postales.
4. Club de puntos y clientes.
5. Avisos: «pedir DNI» y mensaje de regalo en el pedido.

## 5. Cierre

- [ ] PR fusionado y CI en verde.
- [ ] Comprobación en producción hecha y apuntada en el informe (guía 07 paso 6).
- [ ] `ENTREGA.md` e `INFORME_PRUEBAS.md` en la carpeta de la marca.
- [ ] `ESTADO_PROYECTO.md`: entrada en la bitácora.
