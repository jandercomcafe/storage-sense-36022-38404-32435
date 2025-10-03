import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  userId?: string;
}

export const ProductDialog = ({ open, onOpenChange, product, userId }: ProductDialogProps) => {
  const { toast } = useToast();
  // Basic fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  
  // Accounting fields
  const [costPrice, setCostPrice] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date>();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  
  // Stock control fields
  const [minimumStock, setMinimumStock] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date>();
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku || "");
      setQuantity(product.quantity.toString());
      setPrice(product.price.toString());
      setCostPrice(product.cost_price?.toString() || "");
      setTaxCode(product.tax_code || "");
      setTaxRate(product.tax_rate?.toString() || "");
      setSupplier(product.supplier || "");
      setPurchaseDate(product.purchase_date ? new Date(product.purchase_date) : undefined);
      setInvoiceNumber(product.invoice_number || "");
      setMinimumStock(product.minimum_stock?.toString() || "");
      setStorageLocation(product.storage_location || "");
      setExpirationDate(product.expiration_date ? new Date(product.expiration_date) : undefined);
    } else {
      setName("");
      setSku("");
      setQuantity("");
      setPrice("");
      setCostPrice("");
      setTaxCode("");
      setTaxRate("");
      setSupplier("");
      setPurchaseDate(undefined);
      setInvoiceNumber("");
      setMinimumStock("");
      setStorageLocation("");
      setExpirationDate(undefined);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name,
        sku: sku || null,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        cost_price: costPrice ? parseFloat(costPrice) : 0,
        tax_code: taxCode || null,
        tax_rate: taxRate ? parseFloat(taxRate) : 0,
        supplier: supplier || null,
        purchase_date: purchaseDate ? format(purchaseDate, "yyyy-MM-dd") : null,
        invoice_number: invoiceNumber || null,
        minimum_stock: minimumStock ? parseInt(minimumStock) : 0,
        storage_location: storageLocation || null,
        expiration_date: expirationDate ? format(expirationDate, "yyyy-MM-dd") : null,
      };

      if (product) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from("products")
          .insert({
            ...productData,
            user_id: userId!,
          });
        
        if (error) throw error;
        toast({ title: "Product added successfully" });
      }
      
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Code</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., PROD-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Sale Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Collapsible Sections */}
          <Accordion type="multiple" className="w-full">
            {/* Accounting Details */}
            <AccordionItem value="accounting">
              <AccordionTrigger>Accounting Details</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="Purchase cost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxCode">Tax Code / NCM</Label>
                    <Input
                      id="taxCode"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      placeholder="e.g., 8517.12.31"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="e.g., 18.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Supplier name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Purchase Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !purchaseDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {purchaseDate ? format(purchaseDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={purchaseDate}
                          onSelect={setPurchaseDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Invoice reference"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stock Control */}
            <AccordionItem value="stock">
              <AccordionTrigger>Stock Control</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumStock">Minimum Stock Level</Label>
                    <Input
                      id="minimumStock"
                      type="number"
                      min="0"
                      value={minimumStock}
                      onChange={(e) => setMinimumStock(e.target.value)}
                      placeholder="Alert threshold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storageLocation">Storage Location</Label>
                    <Input
                      id="storageLocation"
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value)}
                      placeholder="e.g., Warehouse A, Shelf 3"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiration Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expirationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expirationDate ? format(expirationDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={expirationDate}
                          onSelect={setExpirationDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
