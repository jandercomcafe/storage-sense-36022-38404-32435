import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"] & {
  quote_items: Array<
    Database["public"]["Tables"]["quote_items"]["Row"] & {
      products: { name: string } | null;
    }
  >;
};

export const formatQuoteForWhatsApp = (quote: Quote): string => {
  const items = quote.quote_items
    .map((item, index) => {
      const itemTotal = Number(item.total_price).toFixed(2);
      return `${index + 1}. ${item.products?.name || "Produto"} - Qtd: ${item.quantity} - R$ ${itemTotal}`;
    })
    .join("\n");

  const message = `🧾 *Orçamento ${quote.quote_number || ""}*

📅 Data: ${new Date(quote.created_at).toLocaleDateString("pt-BR")}
⏰ Válido até: ${new Date(quote.validity_date).toLocaleDateString("pt-BR")}

📦 *Itens:*
${items}

💰 *Total: R$ ${Number(quote.total_amount).toFixed(2)}*

${quote.payment_terms ? `💳 Condições: ${quote.payment_terms}` : ""}
${quote.delivery_details ? `🚚 Entrega: ${quote.delivery_details}` : ""}
${quote.notes ? `\n📝 Observações: ${quote.notes}` : ""}

Aguardo seu retorno! 😊`;

  return message;
};

export const openWhatsApp = (phoneNumber: string, message: string) => {
  // Clean phone number (remove non-numeric characters)
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Open WhatsApp using wa.me
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
};
