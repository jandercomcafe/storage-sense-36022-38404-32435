import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ClientDialog } from "@/components/clients/ClientDialog";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];

interface QuoteItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercentage: number;
}

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  userId?: string;
  onSuccess: () => void;
}

export const QuoteDialog = ({ open, onOpenChange, products, userId, onSuccess }: QuoteDialogProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [validityDate, setValidityDate] = useState<Date>();
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryDetails, setDeliveryDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ 
    productId: "", 
    quantity: 1, 
    unitPrice: 0,
    discount: 0,
    taxPercentage: 0
  }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchClients();
    }
  }, [open, userId]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("full_name");
    
    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients(data || []);
    }
  };

  const addItem = () => {
    setItems([...items, { 
      productId: "", 
      quantity: 1, 
      unitPrice: 0,
      discount: 0,
      taxPercentage: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items];
    if (field === "productId") {
      const product = products.find(p => p.id === value);
      newItems[index] = { 
        ...newItems[index], 
        productId: value as string, 
        unitPrice: product?.price || 0,
        taxPercentage: product?.tax_rate || 0
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const afterDiscount = subtotal - (subtotal * item.discount / 100);
    const tax = afterDiscount * item.taxPercentage / 100;
    return afterDiscount + tax;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      return sum + (subtotal * item.discount / 100);
    }, 0);
  };

  const calculateTotalTax = () => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const afterDiscount = subtotal - (subtotal * item.discount / 100);
      return sum + (afterDiscount * item.taxPercentage / 100);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !validityDate || !selectedClientId) return;

    setLoading(true);
    try {
      const total = calculateGrandTotal();

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          user_id: userId,
          client_id: selectedClientId,
          validity_date: format(validityDate, "yyyy-MM-dd"),
          payment_terms: paymentTerms || null,
          delivery_details: deliveryDetails || null,
          notes,
          total_amount: total,
          status: "draft",
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      const quoteItems = items.map(item => ({
        quote_id: quote.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        tax_percentage: item.taxPercentage,
        total_price: calculateItemTotal(item),
      }));

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      toast({ title: t("quotes.quoteCreated") });
      
      // Reset form
      setSelectedClientId("");
      setValidityDate(undefined);
      setPaymentTerms("");
      setDeliveryDetails("");
      setNotes("");
      setItems([{ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxPercentage: 0 }]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewClient = () => {
    setClientDialogOpen(true);
  };

  const handleClientCreated = () => {
    fetchClients();
    setClientDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("quotes.newQuote")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">{t("quotes.client")} *</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                  required
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("quotes.placeholders.selectClient")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} {client.company_name ? `(${client.company_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={handleNewClient}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("quotes.validityDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !validityDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validityDate ? format(validityDate, "PPP") : t("quotes.placeholders.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={validityDate}
                    onSelect={setValidityDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) => updateItem(index, "productId", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${Number(product.price).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.discount}
                      onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 space-y-2">
                    <Label>Tax (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.taxPercentage}
                      onChange={(e) => updateItem(index, "taxPercentage", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-right">
                  Line Total: ${calculateItemTotal(item).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Additional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g., Net 30, 50% upfront"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDetails">Delivery Details</Label>
                <Input
                  id="deliveryDetails"
                  value={deliveryDetails}
                  onChange={(e) => setDeliveryDetails(e.target.value)}
                  placeholder="e.g., 2-3 business days"
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Discount:</span>
              <span className="text-destructive">-${calculateTotalDiscount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tax:</span>
              <span>${calculateTotalTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Grand Total:</span>
              <span>${calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
