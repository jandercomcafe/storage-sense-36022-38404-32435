import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { QuoteDialog } from "@/components/quotes/QuoteDialog";
import { QuotesTable } from "@/components/quotes/QuotesTable";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportQuotesToExcel, exportQuotesWithProfitToExcel } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Quotes = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: quotes = [], refetch } = useQuery({
    queryKey: ["quotes", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("quotes")
        .select(`
          *,
          quote_items (
            *,
            products (
              name,
              cost_price
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        query = query.lte("created_at", format(dateTo, "yyyy-MM-dd"));
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleExportQuotes = () => {
    if (quotes.length === 0) {
      toast({
        title: t("common.error"),
        description: "No quotes to export",
        variant: "destructive",
      });
      return;
    }
    exportQuotesToExcel(quotes);
    toast({ title: "Quotes exported successfully" });
  };

  const handleExportProfit = () => {
    if (quotes.length === 0) {
      toast({
        title: t("common.error"),
        description: "No quotes to export",
        variant: "destructive",
      });
      return;
    }
    exportQuotesWithProfitToExcel(quotes);
    toast({ title: "Profit analysis exported successfully" });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("quotes.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("quotes.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportQuotes}>
                  Export Quotes List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportProfit}>
                  Export Profit Analysis
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("quotes.newQuote")}
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

        <QuotesTable quotes={quotes} onUpdate={refetch} />

        <QuoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          products={products}
          userId={user?.id}
          onSuccess={refetch}
        />
      </div>
    </MainLayout>
  );
};

export default Quotes;
