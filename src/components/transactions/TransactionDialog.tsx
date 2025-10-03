import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  userId?: string;
}

export const TransactionDialog = ({ open, onOpenChange, products, userId }: TransactionDialogProps) => {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"income" | "outcome">("income");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [reference, setReference] = useState("");
  const [responsible, setResponsible] = useState("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-fill unit cost when product is selected
  useEffect(() => {
    if (productId) {
      const selectedProduct = products.find(p => p.id === productId);
      if (selectedProduct) {
        setUnitCost((selectedProduct.cost_price || selectedProduct.price).toString());
      }
    }
  }, [productId, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      const quantityNum = parseInt(quantity);
      const newQuantity = type === "income" 
        ? product.quantity + quantityNum 
        : product.quantity - quantityNum;

      if (newQuantity < 0) {
        throw new Error("Not enough stock for this sale");
      }

      // Create transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          product_id: productId,
          type,
          quantity: quantityNum,
          unit_cost: unitCost ? parseFloat(unitCost) : 0,
          document_number: documentNumber || null,
          reference: reference || null,
          responsible: responsible || null,
          transaction_date: format(transactionDate, "yyyy-MM-dd"),
          notes,
          user_id: userId!,
        });

      if (transactionError) throw transactionError;

      // Update product quantity
      const { error: productError } = await supabase
        .from("products")
        .update({ quantity: newQuantity })
        .eq("id", productId);

      if (productError) throw productError;

      toast({ 
        title: "Transaction recorded successfully",
        description: `${type === "income" ? "Stock added" : "Sale recorded"}` 
      });
      
      // Reset form
      setProductId("");
      setQuantity("");
      setUnitCost("");
      setDocumentNumber("");
      setReference("");
      setResponsible("");
      setTransactionDate(new Date());
      setNotes("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="product">Product *</Label>
              <Select value={productId} onValueChange={setProductId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Stock: {product.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={(value: "income" | "outcome") => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Restock (Income)</SelectItem>
                  <SelectItem value="outcome">Sale (Outcome)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Auto-filled from product"
              />
            </div>

            <div className="space-y-2">
              <Label>Transaction Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transactionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionDate ? format(transactionDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={transactionDate}
                    onSelect={(date) => date && setTransactionDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Additional Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentNumber">Invoice / Document Number</Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g., INV-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Internal Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Order or PO number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsible Person / Department</Label>
              <Input
                id="responsible"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="e.g., John Doe or Sales Team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
