// La dirección llega de la API como objeto (columna jsonb): { text, postal_code }
// en pedidos, { street, number, cp, notes } en perfiles; antiguamente, como
// texto o JSON en texto. Siempre devuelve texto apto para pintar.
export const formatAddress = (address: unknown): string => {
  if (address == null || address === '') return '';
  let valor: unknown = address;
  if (typeof valor === 'string') {
    try {
      valor = JSON.parse(valor);
    } catch {
      return address as string;
    }
  }
  if (typeof valor !== 'object' || valor === null) return String(valor);
  const a = valor as Record<string, unknown>;
  if (typeof a.street === 'string' && a.street) {
    let texto = a.street;
    if (a.number) texto += `, Nº ${String(a.number)}`;
    if (a.cp) texto += `, CP: ${String(a.cp)}`;
    if (a.notes) texto += ` - Notas: ${String(a.notes)}`;
    return texto;
  }
  if (typeof a.text === 'string') return a.text;
  return '';
};
