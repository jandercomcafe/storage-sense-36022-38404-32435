import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuoteDialog } from "@/components/quotes/QuoteDialog";
import { QuotesTable } from "@/components/quotes/QuotesTable";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const Quotes = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

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
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          quote_items (
            *,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("quotes.newQuote")}
          </Button>
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
