import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"] & {
  quote_items: Array<
    Database["public"]["Tables"]["quote_items"]["Row"] & {
      products: { name: string } | null;
    }
  >;
};

interface QuoteViewDialogProps {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuoteViewDialog = ({ quote, open, onOpenChange }: QuoteViewDialogProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>Quote Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6" id="quote-content">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold">QUOTE</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{quote.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(quote.created_at), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valid Until</p>
                <p className="font-medium">{format(new Date(quote.validity_date), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{quote.status}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Quantity</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.quote_items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">{item.products?.name || "Unknown Product"}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">${Number(item.unit_price).toFixed(2)}</td>
                    <td className="text-right">${Number(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan={3} className="text-right font-semibold py-3">Total:</td>
                  <td className="text-right font-bold text-lg">${Number(quote.total_amount).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="mt-2">{quote.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Print/Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
