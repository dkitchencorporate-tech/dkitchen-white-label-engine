import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { isStoreOpen, getStoreStatus, generateAvailableTimeSlots } from '../utils/timeUtils';
import { useHardwareBack } from '../utils/useHardwareBack';
import { generateSafeUUID } from '../utils/uuid';
import { useI18nStore } from '../store/i18nStore';
import { useClub, useSettingsStore } from '../store/settingsStore';
import { BRAND_CONFIG } from '../config/brandConfig';
import { moduloActivo } from '../marca';
import { formatoEuros, precioZona, useZonaStore, zonaDe } from '../store/zonaStore';

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: (orderData: any, isGuest: boolean) => void;
}

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic } = useI18nStore();
  const { items, getTotal, removeItem, kioskClientInfo, setKioskClientInfo } = useCartStore();
  const { user, profile, updateProfile } = useAuthStore();
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>(BRAND_CONFIG.modulosActivos.domicilio ? 'delivery' : 'pickup');
  // Misma clave en los reintentos de este pedido: el servidor nunca crea dos pedidos iguales.
  const [idempotencyKey] = useState(() => generateSafeUUID());
  const [clientName, setClientName] = useState(kioskClientInfo?.name || profile?.full_name || '');
  const [clientPhone, setClientPhone] = useState(kioskClientInfo?.phone || profile?.phone || '');

  // `profile.address` ya llega como objeto (columna jsonb en Postgres) —
  // a diferencia de la versión Supabase, aquí no hace falta JSON.parse.
  const profileAddress = profile?.address || {};
  const initStreet = profileAddress.street || '';
  const initNumber = profileAddress.number || '';
  const initCP = profileAddress.cp || useZonaStore.getState().codigoPostal || '';
  const initNotes = kioskClientInfo ? 'Local / Mesa' : (profileAddress.notes || '');

  const [addressStreet, setAddressStreet] = useState(initStreet);
  const [addressNumber, setAddressNumber] = useState(initNumber);
  const [addressCP, setAddressCP] = useState(initCP);
  const [addressNotes, setAddressNotes] = useState(initNotes);
  const [orderNotes, setOrderNotes] = useState('');
  const [pointsRedeemed, setPointsRedeemed] = useState(false);
  const [redeemItemId, setRedeemItemId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [esRegalo, setEsRegalo] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_delivery'>('cash');

  const storeStatus = getStoreStatus();
  const isOpen = storeStatus.isOpen;
  const availableSlots = generateAvailableTimeSlots(15);
  const [scheduledTime, setScheduledTime] = useState<string>(
    isOpen ? 'asap' : (availableSlots[0] || '')
  );

  // Pantalla de éxito para recogida (reemplaza la pantalla de tracking)
  const [isPickupSuccess, setIsPickupSuccess] = useState(false);
  const [pickupOrderId, setPickupOrderId] = useState<string | null>(null);

  const { deliveryFee, minOrderDelivery, freeDeliveryThreshold, alcoholSaleStart, alcoholSaleEnd, alcoholMinAge } = useSettingsStore();
  // Zona por el código postal de la dirección (el servidor hace lo mismo y es quien decide).
  const zonas = useZonaStore(s => s.zonas);
  const hayZonas = moduloActivo('zonas') && zonas.length > 0;
  const zonaCheckout = deliveryMethod === 'delivery' && hayZonas ? zonaDe(zonas, addressCP.trim()) : null;
  const pct = zonaCheckout?.price_adjust_pct ?? 0;
  const subtotal = getTotal(pct);
  const hasAlcohol = items.some(i => i.isAlcohol);

  // Todos los productos de la carta son elegibles para el
  // descuento VIP — el cliente elige a cuál lo aplica, con el más económico
  // preseleccionado por defecto.
  const eligibleItems = items;
  const selectedRedeemItem = eligibleItems.find(i => i.id === redeemItemId)
    || (eligibleItems.length > 0 ? eligibleItems.reduce((cheapest, i) => i.price < cheapest.price ? i : cheapest) : null);
  const eligibleDiscount = selectedRedeemItem ? precioZona(selectedRedeemItem.price, pct) : 0;

  const discount = pointsRedeemed && eligibleDiscount > 0 ? eligibleDiscount : 0;

  // Mismas reglas que el servidor: pedido mínimo obligatorio y envío gratis desde un umbral.
  const minimo = Number(zonaCheckout ? zonaCheckout.min_order : minOrderDelivery);
  const umbralGratis = zonaCheckout ? zonaCheckout.free_delivery_over : freeDeliveryThreshold;
  const tarifa = Number(zonaCheckout ? zonaCheckout.delivery_fee : deliveryFee);
  const neto = Math.max(0, subtotal - discount);
  const bajoMinimo = deliveryMethod === 'delivery' && neto < minimo;
  const gastosEnvio = deliveryMethod !== 'delivery' ? 0 : (umbralGratis != null && neto >= Number(umbralGratis) ? 0 : tarifa);
  const finalTotal = Math.round((neto + gastosEnvio) * 100) / 100;

  const userPoints = profile?.points || 0;
  const club = useClub();
  const canRedeem = userPoints >= club.meta && eligibleDiscount > 0;
  const pointsEarned = club.puntosPor(finalTotal);

  const validateGeofence = async (): Promise<boolean> => {
    // 1. Zona de reparto configurable por el cliente (CP de España válido, 5 dígitos)
    if (deliveryMethod === 'delivery') {
      const cleanCP = addressCP.trim();
      if (!/^\d{5}$/.test(cleanCP)) {
        setGeofenceError('Introduce un código postal español válido (5 dígitos) para el reparto a domicilio.');
        return false;
      }
      if (hayZonas && !zonaDe(zonas, cleanCP)) {
        setGeofenceError(`Todavía no repartimos en el ${cleanCP}.`);
        return false;
      }
      setGeofenceError(null);
    }

    // La zona de reparto la valida el servidor (códigos postales de la marca).
    // No se pide la ubicación del dispositivo.
    return true;
  };

  const handleCheckoutClick = async () => {
    setPaymentError(null);
    if (bajoMinimo || (hasAlcohol && !ageConfirmed)) {
      return;
    }

    setIsProcessing(true);
    const isWithinRange = await validateGeofence();
    setIsProcessing(false);

    if (!isWithinRange) {
      return;
    }

    // El motor no lleva ninguna pasarela de pago conectada: efectivo y
    // datáfono en reparto/recogida se procesan siempre directo, sin
    // redirección externa.
    processOrder();
  };

  const processOrder = async () => {
    setIsProcessing(true);

    const finalDeliveryAddress = deliveryMethod === 'delivery'
      ? `${addressStreet}, Nº ${addressNumber}, CP ${addressCP}${addressNotes ? '. Notas: ' + addressNotes : ''}`
      : addressNotes ? `Recogida en el local. Notas: ${addressNotes}` : 'Recogida en el local';

    try {
      const orderItems = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        options: item.options,
        customization_details: {
          name: item.name,
          notes: item.notes,
          extras: item.extras,
          size: item.size
        }
      }));

      const finalOrderNotes = [
        // Aviso visible para cocina; la hora real va en scheduled_time.
        scheduledTime !== 'asap' ? `⏰ Programado: ${scheduledTime}` : '',
        addressNotes ? `Dir/Mesa: ${addressNotes}` : '',
        orderNotes.trim() ? `📝 ${orderNotes.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const { orderId, order: fullOrder } = await api.post('/checkout', {
        client_name: clientName,
        client_phone: clientPhone,
        delivery_address: deliveryMethod === 'delivery'
          ? { text: finalDeliveryAddress, postal_code: addressCP.trim() }
          : finalDeliveryAddress,
        delivery_method: deliveryMethod,
        items: orderItems,
        points_redeemed: pointsRedeemed,
        notes: finalOrderNotes || null,
        // Los huecos llegan como «12:30», «Hoy 12:30» o «Mañana 12:30»: el servidor recibe HH:MM.
        scheduled_time: scheduledTime !== 'asap' ? scheduledTime.slice(-5) : null,
        idempotency_key: idempotencyKey,
        payment_method: paymentMethod,
        age_confirmed: hasAlcohol ? ageConfirmed : false,
        gift_message: esRegalo && giftMessage.trim() ? giftMessage.trim() : null
      });
      if (deliveryMethod === 'delivery' && hayZonas) useZonaStore.getState().setCodigoPostal(addressCP.trim());

      if (user && profile) {
        try {
          await updateProfile({
            phone: clientPhone,
            address: { street: addressStreet, number: addressNumber, cp: addressCP, notes: addressNotes },
            full_name: clientName
          });
        } catch (e) {
          // Un fallo actualizando el perfil no debe tirar abajo un pedido ya confirmado
          console.error('No se pudo sincronizar el perfil tras el pedido:', e);
        }
        useAuthStore.getState().fetchOrders();
      }

      if (kioskClientInfo) {
        setKioskClientInfo(undefined);
      }

      // Los correos de confirmación los envía el servidor al crear el pedido.

      // Para recogida mostramos pantalla de confirmación interna;
      // para domicilio llamamos onSuccess directamente (va a tracking)
      if (deliveryMethod === 'pickup') {
        setPickupOrderId(String(orderId));
        setIsPickupSuccess(true);
        useCartStore.getState().clearCart();
        if (user) {
          useAuthStore.getState().fetchOrders();
        }
      } else {
        onSuccess(fullOrder || { id: orderId }, !user);
      }
    } catch (error: any) {
      console.error('Error procesando pedido:', error);
      // Los rechazos de negocio (4xx) llegan redactados para el cliente desde el servidor.
      const friendlyMsg = error?.status >= 400 && error?.status < 500 && error?.message
        ? error.message
        : t('error_processing');
      setPaymentError(friendlyMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">

      {/* Pantalla de confirmación de recogida */}
      {isPickupSuccess && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-primary to-brand-accent"></div>
            <div className="w-24 h-24 bg-brand-primary/15 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-brand-primary/40 animate-scale-in">
              <svg className="w-12 h-12 text-brand-primaryHover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-brand-primaryHover uppercase tracking-widest block mb-1">Pedido Confirmado</span>
            <h2 className="font-display font-black text-2xl text-brand-ink uppercase mb-3">✨ ¡Listo!
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Tu pedido ha sido recibido. <strong className="text-brand-ink">Ven a recogerlo al local</strong> en unos <strong className="text-brand-primaryHover">20–25 minutos</strong>.
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 text-left space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dónde recoger</p>
              <p className="text-brand-ink font-bold text-sm">📍 {BRAND_CONFIG.name}</p>
              <p className="text-gray-500 text-xs">{BRAND_CONFIG.slogan}</p>
            </div>
            <button
              onClick={() => { setIsPickupSuccess(false); onSuccess({ id: pickupOrderId, total: finalTotal, clientName: clientName }, !user); }}
              className="w-full bg-brand-primaryHover hover:bg-brand-primary text-white font-bold py-4 rounded-2xl uppercase tracking-wider text-sm transition-all shadow-[0_0_25px_rgb(var(--brand-primary-rgb)/0.3)] hover:scale-105"
            >
              Perfecto, ¡gracias!
            </button>
          </div>
        </div>
      )}

      {geofenceError && (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h3 className="font-display font-black text-2xl text-brand-ink mb-2 uppercase tracking-wide">{t('far_away_title')}</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed font-medium">
              {geofenceError}
            </p>
            <div className="space-y-3">
              <button onClick={() => setGeofenceError(null)} className="block w-full bg-brand-primaryHover hover:bg-brand-primary text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgb(var(--brand-primary-rgb)/0.3)]">
                {t('understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[94vh] animate-fade text-brand-ink relative">
        <div className="p-4 pt-6 sm:p-6 sm:pt-8 border-b border-gray-200 flex items-center justify-between bg-gray-50 relative overflow-hidden gap-3 shrink-0">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-500/10 via-brand-primary/10 to-transparent pointer-events-none"></div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-display font-bold text-brand-primaryHover uppercase tracking-widest block">{t('official_checkout')}</span>
            <h3 className="font-display font-black text-xl sm:text-3xl text-brand-ink mt-0.5 uppercase">{t('checkout_summary')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-brand-ink text-xl font-bold p-2 bg-white rounded-2xl border border-gray-200 shrink-0 z-10 relative">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-sm sm:text-sm text-gray-600 no-scrollbar">

          {!isOpen && (
            <div className="bg-brand-primaryLight border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primaryHover">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-display font-black text-brand-ink uppercase tracking-wider">{storeStatus.badgeText}</span>
                  <span className="text-[10px] bg-brand-primaryLight text-brand-ink font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Programar Pedido</span>
                </div>
                <p className="text-xs text-amber-900/80 mt-1 leading-relaxed font-medium">
                  En este momento la cocina no está despachando en vivo ({storeStatus.detailText}). <strong>Puedes dejar tu pedido programado a continuación</strong> y te lo prepararemos con total puntualidad.
                </p>
              </div>
            </div>
          )}

          {paymentError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center animate-fade-in">
              <span className="text-2xl mb-2 block">⚠️</span>
              <p className="text-red-400 font-medium text-sm">{paymentError}</p>
            </div>
          )}

          {/* Artículos Seleccionados */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <span className="font-display font-bold text-brand-ink text-sm sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <span>{t('items_in_order')}</span>
                <span className="text-brand-primaryHover font-bold text-sm">{items.length} {t('items_count')}</span>
              </span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 group">
                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                    <span className="font-bold text-brand-ink text-sm truncate">{item.quantity}x {tDynamic(item.name)}</span>
                    {item.extras && item.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.extras.map((extra, i) => (
                          <span key={i} className="inline-flex items-center text-[10px] sm:text-xs font-bold bg-brand-primary/15 text-brand-primaryHover px-1.5 py-0.5 rounded-md border border-brand-primary/30">
                            + {extra}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-1 flex items-center gap-1">
                        <span>📝</span>
                        <span className="truncate">"{item.notes}"</span>
                      </p>
                    )}
                    {item.size && item.size !== 'normal' && (
                      <span className="text-xs text-gray-500 mt-0.5">{item.size === 'maxi' ? t('size_maxi') : item.size}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-brand-ink whitespace-nowrap">{formatoEuros(precioZona(item.price, pct) * item.quantity)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-500/80 text-gray-500 hover:text-white flex items-center justify-center transition-all shrink-0"
                      title="Eliminar artículo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Puntos Club VIP */}
          {user ? (
            <>
            <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border border-yellow-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-brand-ink font-display font-bold flex items-center justify-center text-sm shrink-0 shadow">VIP</div>
                <div>
                  <span className="font-bold text-brand-ink block text-sm sm:text-sm">{t('vip_club')} <span className="text-yellow-400 font-display font-extrabold">{userPoints}</span> {t('points')}</span>
                  <span className="text-[11px] sm:text-sm text-gray-500 leading-tight block">
                    {eligibleDiscount > 0 ? (
                      <>{t('redeem_25')} <strong className="text-brand-primaryHover whitespace-nowrap">-{eligibleDiscount.toFixed(2)}&nbsp;€</strong></>
                    ) : (
                      <>{t('add_product_redeem')}</>
                    )}
                  </span>
                  <span className="text-[10px] text-brand-primaryHover font-bold block mt-0.5">{t('earn_points')} +{pointsEarned} {t('with_this_order')}</span>
                </div>
              </div>
              <button
                onClick={() => setPointsRedeemed(!pointsRedeemed)}
                disabled={!canRedeem && !pointsRedeemed}
                className={`w-full sm:w-auto justify-center font-display font-bold px-4 py-2.5 rounded-xl text-sm uppercase tracking-wider shrink-0 transition-all border ${pointsRedeemed ? 'bg-brand-primaryHover text-brand-ink border-brand-primary' : (canRedeem ? 'bg-gray-50 hover:bg-gray-100 text-brand-ink border-gray-200' : 'bg-white text-zinc-600 border-gray-200 cursor-not-allowed')}`}
              >
                {pointsRedeemed ? t('redeemed_btn') : t('redeem_btn')}
              </button>
            </div>
            {pointsRedeemed && eligibleItems.length > 1 && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 -mt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{t('choose_redeem_item')}</p>
                <div className="flex flex-wrap gap-2">
                  {eligibleItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRedeemItemId(item.id)}
                      className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                        selectedRedeemItem?.id === item.id
                          ? 'bg-brand-primaryHover text-brand-ink border-brand-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-zinc-500'
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.name} · {formatoEuros(precioZona(item.price, pct))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-brand-ink block text-sm">{t('have_vip')}</span>
                <span className="text-xs text-gray-500 block mt-0.5">{t('login_to_redeem')}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    useAuthStore.getState().openUserModal('login');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gray-50 hover:bg-gray-100 text-brand-ink text-xs font-bold uppercase rounded-xl transition-colors border border-gray-200"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => {
                    useAuthStore.getState().openUserModal('register');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold uppercase rounded-xl transition-colors shadow-lg shadow-yellow-500/20"
                >
                  {t('register')}
                </button>
              </div>
            </div>
          )}

          {/* Método Entrega */}
          <div className="space-y-2.5 sm:space-y-3">
            <span className="font-display font-bold text-brand-ink text-sm uppercase tracking-wider block">{t('delivery_mode')}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 font-medium">
              {BRAND_CONFIG.modulosActivos.domicilio && (
              <label onClick={() => setDeliveryMethod('delivery')} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer shadow transition-all ${deliveryMethod === 'delivery' ? 'border-2 border-brand-primary bg-brand-primary/15' : 'border border-gray-200 bg-gray-50 hover:border-brand-primary'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={deliveryMethod === 'delivery'} readOnly className="text-brand-primaryHover w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-brand-ink block text-sm sm:text-sm">{t('delivery_zone_msg')}</span>
                    <span className="text-[10px] sm:text-[11px] text-brand-primaryHover font-bold">{t('free_delivery')}</span>
                  </div>
                </div>
              </label>
              )}
              {BRAND_CONFIG.modulosActivos.recogida && (
              <label onClick={() => setDeliveryMethod('pickup')} className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all ${deliveryMethod === 'pickup' ? 'border-2 border-brand-primary bg-brand-primary/15' : 'border border-gray-200 bg-gray-50 hover:border-brand-primary'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={deliveryMethod === 'pickup'} readOnly className="text-brand-primaryHover w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-brand-ink block text-sm sm:text-sm">Para Recoger</span>
                    <span className="text-[10px] sm:text-[11px] text-gray-500">{BRAND_CONFIG.address || BRAND_CONFIG.city}</span>
                  </div>
                </div>
              </label>
              )}
            </div>
          </div>

          {/* Datos de Envío */}
          <div className="space-y-3 border-t border-gray-200 pt-4 sm:pt-5">
            <span className="font-display font-bold text-brand-ink text-sm uppercase tracking-wider block">{t('contact_data')}</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium mb-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">{t('full_name')} <span className="text-red-500">*</span></label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('name_placeholder')} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">{t('mobile_whatsapp')} <span className="text-red-500">*</span></label>
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Ej. 679 00 00 00" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
              </div>
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-medium">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">{t('exact_street')} <span className="text-red-500">*</span></label>
                  <input type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder={t('street_placeholder')} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Nº <span className="text-red-500">*</span></label>
                  <input type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="1" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">CP <span className="text-red-500">*</span></label>
                  <input type="text" value={addressCP} onChange={e => setAddressCP(e.target.value)} placeholder="28013" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Piso / Puerta</label>
                  <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. 2ºA, Timbre azul" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
                </div>
              </div>
            ) : (
              <div className="font-medium">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">Notas para Recogida (Opcional)</label>
                <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. Recoge mi hermano Carlos" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm sm:text-sm focus:outline-none focus:border-brand-primary font-medium" />
              </div>
            )}

            {/* Notas Globales para Cocina / Elaboración */}
            <div className="pt-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                📝 Instrucciones Especiales para Cocina / Reparto (Opcional)
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="Ej: sin salsa picante, llamar al móvil al llegar..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 sm:py-3 text-brand-ink text-sm focus:outline-none focus:border-brand-primary font-medium"
              />
            </div>
          </div>

          {/* Cuándo lo quieres */}
          <div className="space-y-3 border-t border-gray-200 pt-4 sm:pt-5">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-brand-ink text-sm uppercase tracking-wider block">{t('when_want')}</span>
              {!isOpen && (
                <span className="text-[10px] bg-brand-primaryLight text-brand-ink font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Programación requerida
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium">
              <label 
                onClick={() => isOpen && setScheduledTime('asap')} 
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  scheduledTime === 'asap' 
                    ? 'bg-brand-primary/10 border-2 border-brand-primary' 
                    : 'bg-gray-50 border border-gray-200'
                } ${!isOpen ? 'opacity-40 cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-gray-300'}`}
              >
                <input 
                  type="radio" 
                  checked={scheduledTime === 'asap'} 
                  readOnly 
                  disabled={!isOpen} 
                  className="text-brand-primaryHover w-4 h-4 shrink-0" 
                />
                <div>
                  <span className="font-bold text-brand-ink text-sm block">{t('asap')}</span>
                  <span className="text-xs text-gray-500 font-medium">{isOpen ? t('prepare_now') : 'Cerrado ahora'}</span>
                </div>
              </label>

              <label 
                onClick={() => {
                  if (availableSlots.length > 0 && scheduledTime === 'asap') {
                    setScheduledTime(availableSlots[0]);
                  }
                }} 
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  scheduledTime !== 'asap' 
                    ? 'bg-brand-primary/10 border-2 border-brand-primary' 
                    : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                } ${availableSlots.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input 
                  type="radio" 
                  checked={scheduledTime !== 'asap'} 
                  readOnly 
                  disabled={availableSlots.length === 0} 
                  className="text-brand-primary w-4 h-4 shrink-0" 
                />
                <div className="w-full pr-2">
                  <span className="font-bold text-brand-ink text-sm block">{t('schedule')}</span>
                  {availableSlots.length > 0 ? (
                    <select 
                      value={scheduledTime !== 'asap' ? scheduledTime : availableSlots[0]} 
                      onChange={(e) => setScheduledTime(e.target.value)} 
                      className="mt-1.5 block w-full bg-white border border-gray-300 text-brand-ink rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-primary font-bold"
                    >
                      {availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-500">{t('no_slots_today')}</span>
                  )}
                </div>
              </label>
            </div>
            {!isOpen && availableSlots.length === 0 && (
              <p className="text-[11px] text-brand-primaryHover bg-brand-primaryLight p-2.5 rounded-lg border border-brand-border font-medium">
                No hay franjas horarias configuradas para programar en este momento.
              </p>
            )}
          </div>

          {/* Forma de Pago — solo estructura efectivo/datáfono, sin pasarela conectada */}
          <div className="space-y-3 border-t border-gray-200 pt-4 sm:pt-5">
            <span className="font-display font-bold text-brand-ink text-sm uppercase tracking-wider block">{t('payment_form')}</span>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col gap-2">
                <label onClick={() => setPaymentMethod('cash')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${paymentMethod === 'cash' ? 'bg-brand-primary/10 border border-brand-primary/50' : 'bg-white border border-gray-200 hover:border-gray-200'}`}>
                  <input type="radio" checked={paymentMethod === 'cash'} readOnly className="text-brand-primaryHover w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-brand-ink text-sm block">{t('pay_cash')}</span>
                    <span className="text-xs text-gray-500">{deliveryMethod === 'delivery' ? t('pay_cash_delivery_desc') : t('pay_cash_pickup_desc')}</span>
                  </div>
                </label>
                <label onClick={() => setPaymentMethod('card_delivery')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${paymentMethod === 'card_delivery' ? 'bg-blue-500/10 border border-blue-500/50' : 'bg-white border border-gray-200 hover:border-gray-200'}`}>
                  <input type="radio" checked={paymentMethod === 'card_delivery'} readOnly className="text-blue-500 w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-brand-ink text-sm block">{t('pay_card_terminal')}</span>
                    <span className="text-xs text-gray-500">{deliveryMethod === 'delivery' ? t('pay_card_terminal_delivery_desc') : t('pay_card_terminal_pickup_desc')}</span>
                  </div>
                </label>
                <p className="text-[10px] text-gray-500 border-t border-gray-200 pt-2 mt-1">
                  {t('instant_confirm')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 text-brand-ink border-t border-gray-200 space-y-3">
          {moduloActivo('regalos') && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={esRegalo} onChange={e => setEsRegalo(e.target.checked)} className="w-5 h-5 accent-[rgb(var(--brand-primary-rgb))]" />
                <span className="text-sm font-bold">🎁 Es un regalo</span>
              </label>
              {esRegalo && (
                <textarea
                  value={giftMessage}
                  onChange={e => setGiftMessage(e.target.value.slice(0, 250))}
                  rows={3}
                  placeholder="Mensaje para la tarjeta (opcional). No incluimos precios en el paquete."
                  className="mt-3 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                  aria-label="Mensaje de regalo"
                />
              )}
            </div>
          )}

          {hasAlcohol && (
            <label className="flex items-start gap-3 bg-white border-2 border-zinc-900/80 rounded-2xl p-4 cursor-pointer">
              <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)} className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">
                <strong>Tengo {alcoholMinAge} años o más.</strong> Tu pedido lleva alcohol: el repartidor pedirá el DNI y no lo entregará a menores.
                {alcoholSaleStart && alcoholSaleEnd && (
                  <span className="block text-xs text-gray-500 mt-1">Por normativa solo vendemos alcohol de {alcoholSaleStart} a {alcoholSaleEnd}.</span>
                )}
              </span>
            </label>
          )}

          {bajoMinimo && (
            <p className="text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-2xl p-3" role="status">
              Te faltan {formatoEuros(minimo - neto)} para el pedido mínimo de {formatoEuros(minimo)}{zonaCheckout ? ` en ${zonaCheckout.name}` : ''}.
            </p>
          )}

          {deliveryMethod === 'delivery' && (
            <div className="text-xs text-gray-600 flex justify-between">
              <span>Envío{zonaCheckout ? ` · ${zonaCheckout.name} · ~${zonaCheckout.eta_minutes} min` : ''}</span>
              <span className="font-bold">{gastosEnvio === 0 ? 'Gratis' : formatoEuros(gastosEnvio)}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">{t('total_to_pay')}</span>
              <span className="font-display font-black text-2xl sm:text-3xl text-brand-ink whitespace-nowrap">{formatoEuros(finalTotal)}</span>
            </div>
            <button
              disabled={isProcessing || !clientName || !clientPhone || (deliveryMethod === 'delivery' && (!addressStreet || !addressNumber || !addressCP)) || bajoMinimo || (hasAlcohol && !ageConfirmed) || (!isOpen && (!scheduledTime || scheduledTime === 'asap'))}
              onClick={handleCheckoutClick}
              className="bg-gradient-to-r from-brand-primaryHover to-brand-primaryHover hover:from-orange-600 hover:to-orange-700 text-white font-display font-bold px-8 py-4 rounded-2xl shadow-[0_15px_30px_-5px_rgb(var(--brand-primary-rgb)/0.4)] uppercase tracking-wider text-sm sm:text-sm transition-all hover:scale-105 shrink-0 disabled:opacity-50"
            >
              {isProcessing ? t('processing') : t('confirm_order_btn')}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 z-[1200] bg-gray-50/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] animate-fade-in">
            <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-brand-primaryHover font-bold uppercase tracking-widest animate-pulse">
              {t('confirming_order')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
