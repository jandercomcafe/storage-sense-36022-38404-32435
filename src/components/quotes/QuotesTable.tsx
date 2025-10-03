import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, ShoppingCart, Eye } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuoteViewDialog } from "./QuoteViewDialog";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"] & {
  quote_items: Array<
    Database["public"]["Tables"]["quote_items"]["Row"] & {
      products: { name: string } | null;
    }
  >;
};

interface QuotesTableProps {
  quotes: Quote[];
  onUpdate: () => void;
}

export const QuotesTable = ({ quotes, onUpdate }: QuotesTableProps) => {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({ title: "Quote deleted successfully" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleConvertToOrder = async () => {
    if (!convertId) return;

    setLoading(true);
    try {
      const quote = quotes.find(q => q.id === convertId);
      if (!quote) throw new Error("Quote not found");

      // Get user_id from quote
      const userId = quote.user_id;

      // Create transactions for each item
      for (const item of quote.quote_items) {
        // Get current product quantity
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();

        if (productError) throw productError;

        const newQuantity = product.quantity - item.quantity;
        if (newQuantity < 0) {
          throw new Error(`Not enough stock for ${item.products?.name || "product"}`);
        }

        // Create transaction
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            product_id: item.product_id,
            type: "outcome",
            quantity: item.quantity,
            notes: `Converted from quote for ${quote.client_name}`,
            user_id: userId,
          });

        if (transactionError) throw transactionError;

        // Update product quantity
        const { error: updateError } = await supabase
          .from("products")
          .update({ quantity: newQuantity })
          .eq("id", item.product_id);

        if (updateError) throw updateError;
      }

      // Update quote status
      const { error: statusError } = await supabase
        .from("quotes")
        .update({ status: "converted" })
        .eq("id", convertId);

      if (statusError) throw statusError;

      toast({ 
        title: "Quote converted to order successfully",
        description: "Inventory has been updated" 
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setConvertId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      draft: "secondary",
      sent: "default",
      converted: "default",
      expired: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No quotes yet. Create your first quote!
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.client_name}</TableCell>
                  <TableCell>{format(new Date(quote.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{format(new Date(quote.validity_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{quote.quote_items.length} items</TableCell>
                  <TableCell>${Number(quote.total_amount).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(quote.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewQuote(quote)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {quote.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConvertId(quote.id)}
                        title="Convert to Order"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(quote.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!convertId} onOpenChange={() => setConvertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will create sale transactions for all items in this quote and update your inventory. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToOrder} disabled={loading}>
              {loading ? "Converting..." : "Convert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewQuote && (
        <QuoteViewDialog
          quote={viewQuote}
          open={!!viewQuote}
          onOpenChange={(open) => !open && setViewQuote(null)}
        />
      )}
    </>
  );
};
