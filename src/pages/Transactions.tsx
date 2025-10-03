import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = async () => {
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    
    const { data: productsData } = await supabase
      .from("products")
      .select("*");
    
    if (transactionsData) setTransactions(transactionsData);
    if (productsData) setProducts(productsData);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  if (authLoading) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("transactions.title")}</h1>
            <p className="text-muted-foreground">{t("transactions.subtitle")}</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("transactions.newTransaction")}
          </Button>
        </div>

        <TransactionsTable
          transactions={transactions}
          products={products}
        />

        <TransactionDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) fetchData();
          }}
          products={products}
          userId={user?.id}
        />
      </div>
    </MainLayout>
  );
}
