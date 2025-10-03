import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    recentSales: 0,
    recentPurchases: 0,
  });

  useEffect(() => {
    if (authLoading) return;
    
    const fetchStats = async () => {
      const { data: products } = await supabase
        .from("products")
        .select("quantity, price");

      const { data: transactions } = await supabase
        .from("transactions")
        .select("type, quantity")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalProducts = products?.length || 0;
      const totalValue = products?.reduce(
        (sum, p) => sum + (p.quantity * parseFloat(p.price.toString())),
        0
      ) || 0;

      const sales = transactions?.filter(t => t.type === "outcome")
        .reduce((sum, t) => sum + t.quantity, 0) || 0;
      
      const purchases = transactions?.filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.quantity, 0) || 0;

      setStats({
        totalProducts,
        totalValue,
        recentSales: sales,
        recentPurchases: purchases,
      });
    };

    fetchStats();
  }, [authLoading]);

  if (authLoading) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.totalProducts")}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active products in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sales (30d)</CardTitle>
              <TrendingDown className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentSales}</div>
              <p className="text-xs text-muted-foreground">Units sold last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Restocks (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentPurchases}</div>
              <p className="text-xs text-muted-foreground">Units added last 30 days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
