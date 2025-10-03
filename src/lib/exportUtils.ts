import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"] & {
  quote_items: Array<
    Database["public"]["Tables"]["quote_items"]["Row"] & {
      products: { name: string; cost_price: number } | null;
    }
  >;
};

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export const exportQuotesToExcel = (quotes: Quote[]) => {
  const data = quotes.map((quote) => ({
    "Quote Number": quote.quote_number || "N/A",
    "Client": quote.client_name,
    "Date": format(new Date(quote.created_at), "yyyy-MM-dd"),
    "Valid Until": format(new Date(quote.validity_date), "yyyy-MM-dd"),
    "Status": quote.status,
    "Items": quote.quote_items.length,
    "Total Amount": Number(quote.total_amount).toFixed(2),
    "Payment Terms": quote.payment_terms || "",
    "Delivery": quote.delivery_details || "",
    "Notes": quote.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotes");
  
  const fileName = `quotes_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportQuotesWithProfitToExcel = (quotes: Quote[]) => {
  const data = quotes.flatMap((quote) =>
    quote.quote_items.map((item) => {
      const costPrice = item.products?.cost_price || 0;
      const revenue = Number(item.total_price);
      const cost = Number(costPrice) * item.quantity;
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0.00";

      return {
        "Quote Number": quote.quote_number || "N/A",
        "Client": quote.client_name,
        "Date": format(new Date(quote.created_at), "yyyy-MM-dd"),
        "Product": item.products?.name || "Unknown",
        "Quantity": item.quantity,
        "Unit Price": Number(item.unit_price).toFixed(2),
        "Unit Cost": Number(costPrice).toFixed(2),
        "Revenue": revenue.toFixed(2),
        "Cost": cost.toFixed(2),
        "Profit": profit.toFixed(2),
        "Profit Margin (%)": profitMargin,
        "Status": quote.status,
      };
    })
  );

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quote Profit Analysis");
  
  const fileName = `quotes_profit_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportTransactionsToExcel = (
  transactions: Transaction[],
  products: Product[]
) => {
  const data = transactions.map((transaction) => {
    const product = products.find((p) => p.id === transaction.product_id);
    return {
      "Date": format(new Date(transaction.transaction_date || transaction.created_at), "yyyy-MM-dd"),
      "Product": product?.name || "Unknown",
      "SKU": product?.sku || "",
      "Type": transaction.type === "income" ? "Restock" : "Sale",
      "Quantity": transaction.quantity,
      "Unit Cost": Number(transaction.unit_cost || 0).toFixed(2),
      "Total Value": (transaction.quantity * Number(transaction.unit_cost || 0)).toFixed(2),
      "Document Number": transaction.document_number || "",
      "Reference": transaction.reference || "",
      "Responsible": transaction.responsible || "",
      "Notes": transaction.notes || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory Movements");
  
  const fileName = `transactions_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportInventoryToExcel = (products: Product[]) => {
  const data = products.map((product) => ({
    "SKU": product.sku || "",
    "Product Name": product.name,
    "Current Stock": product.quantity,
    "Minimum Stock": product.minimum_stock || 0,
    "Sale Price": Number(product.price).toFixed(2),
    "Cost Price": Number(product.cost_price || 0).toFixed(2),
    "Total Value (Cost)": (product.quantity * Number(product.cost_price || 0)).toFixed(2),
    "Total Value (Sale)": (product.quantity * Number(product.price)).toFixed(2),
    "Tax Rate (%)": Number(product.tax_rate || 0).toFixed(2),
    "Tax Code": product.tax_code || "",
    "Supplier": product.supplier || "",
    "Storage Location": product.storage_location || "",
    "Purchase Date": product.purchase_date ? format(new Date(product.purchase_date), "yyyy-MM-dd") : "",
    "Expiration Date": product.expiration_date ? format(new Date(product.expiration_date), "yyyy-MM-dd") : "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  
  const fileName = `inventory_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportMonthlySalesReport = (
  quotes: Quote[],
  transactions: Transaction[],
  products: Product[]
) => {
  // Quotes sheet
  const quotesData = quotes.map((quote) => ({
    "Date": format(new Date(quote.created_at), "yyyy-MM-dd"),
    "Type": "Quote",
    "Client": quote.client_name,
    "Amount": Number(quote.total_amount).toFixed(2),
    "Status": quote.status,
    "Quote Number": quote.quote_number || "N/A",
  }));

  // Transactions sheet
  const transactionsData = transactions
    .filter((t) => t.type === "outcome")
    .map((transaction) => {
      const product = products.find((p) => p.id === transaction.product_id);
      const totalValue = transaction.quantity * Number(product?.price || 0);
      
      return {
        "Date": format(new Date(transaction.transaction_date || transaction.created_at), "yyyy-MM-dd"),
        "Type": "Sale",
        "Product": product?.name || "Unknown",
        "Quantity": transaction.quantity,
        "Unit Price": Number(product?.price || 0).toFixed(2),
        "Amount": totalValue.toFixed(2),
        "Notes": transaction.notes || "",
      };
    });

  const wb = XLSX.utils.book_new();
  
  const quotesWs = XLSX.utils.json_to_sheet(quotesData);
  XLSX.utils.book_append_sheet(wb, quotesWs, "Quotes");
  
  const transactionsWs = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(wb, transactionsWs, "Sales");
  
  const fileName = `monthly_sales_${format(new Date(), "yyyy-MM")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
