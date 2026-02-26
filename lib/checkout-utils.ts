import { CartItem } from './cart-store';

export function generateWhatsAppMessage(items: CartItem[], totalPrice: number): string {
  const businessPhone = '584140938770'; // Reemplazar con el número real
  
  let message = '🎨 *Consulta de Arte*\n\n';
  message += 'Hola! Me interesan las siguientes obras:\n\n';
  
  items.forEach((item, index) => {
    message += `${index + 1}. *${item.title}*\n`;
    message += `   Artista: ${item.artist}\n`;
    message += `   Dimensiones: ${item.dimensions.width}x${item.dimensions.height} ${item.dimensions.unit}\n`;
    message += `   Precio: $${item.price.toLocaleString()} ${item.currency}\n`;
    if (item.quantity > 1) {
      message += `   Cantidad: ${item.quantity}\n`;
    }
    message += '\n';
  });
  
  message += `*Total: $${totalPrice.toLocaleString()} ${items[0]?.currency || 'USD'}*\n\n`;
  message += '¿Podrían darme más información sobre disponibilidad y envío?';
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${businessPhone}?text=${encodedMessage}`;
}

export function generateStripeCheckout(items: CartItem[]): string {
  // Esta es una URL de ejemplo - en producción se conectaría con Stripe API
  const lineItems = items.map(item => ({
    price_data: {
      currency: item.currency.toLowerCase(),
      product_data: {
        name: item.title,
        description: `${item.artist} - ${item.dimensions.width}x${item.dimensions.height} ${item.dimensions.unit}`,
        images: [item.image],
      },
      unit_amount: item.price * 100, // Stripe usa centavos
    },
    quantity: item.quantity,
  }));
  
  // En producción, esto sería una llamada al backend para crear una sesión de checkout
  console.log('Stripe line items:', lineItems);
  return '#'; // Placeholder
}
