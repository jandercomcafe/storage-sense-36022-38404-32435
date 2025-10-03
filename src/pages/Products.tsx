import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProductDialog } from "@/components/products/ProductDialog";
import { ProductsTable } from "@/components/products/ProductsTable";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { exportInventoryToExcel } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

type Product = Database["public"]["Tables"]["products"]["Row"];

export default function Products() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setProducts(data);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
    }
  }, [authLoading]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleExport = () => {
    if (products.length === 0) {
      toast({
        title: t("common.error"),
        description: "No products to export",
        variant: "destructive",
      });
      return;
    }
    exportInventoryToExcel(products);
    toast({ title: "Inventory exported successfully" });
  };

  if (authLoading) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("products.title")}</h1>
            <p className="text-muted-foreground">{t("products.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t("common.export")}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("products.addProduct")}
            </Button>
          </div>
        </div>

        <ProductsTable
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <ProductDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          product={editingProduct}
          userId={user?.id}
        />
      </div>
    </MainLayout>
  );
}
