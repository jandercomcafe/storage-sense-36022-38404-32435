import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, Download, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportTransactionsToExcel } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const fetchData = async () => {
    let transactionQuery = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (dateFrom) {
      transactionQuery = transactionQuery.gte("transaction_date", format(dateFrom, "yyyy-MM-dd"));
    }
    if (dateTo) {
      transactionQuery = transactionQuery.lte("transaction_date", format(dateTo, "yyyy-MM-dd"));
    }

    const { data: transactionsData } = await transactionQuery;
    
    const { data: productsData } = await supabase
      .from("products")
      .select("*");
    
    if (transactionsData) setTransactions(transactionsData);
    if (productsData) setProducts(productsData);
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      toast({
        title: t("common.error"),
        description: "No transactions to export",
        variant: "destructive",
      });
      return;
    }
    exportTransactionsToExcel(transactions, products);
    toast({ title: "Transactions exported successfully" });
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, dateFrom, dateTo]);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t("common.export")}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("transactions.newTransaction")}
            </Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">From:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">To:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              Clear Filters
            </Button>
          )}
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
