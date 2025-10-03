import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ArrowLeftRight, FileText, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const navigation = [
    { name: t("navigation.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("navigation.products"), href: "/products", icon: Package },
    { name: t("navigation.quotes"), href: "/quotes", icon: FileText },
    { name: t("navigation.clients"), href: "/clients", icon: Users },
    { name: t("navigation.transactions"), href: "/transactions", icon: ArrowLeftRight },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t("navigation.logout") });
    navigate("/auth");
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center">
          <Package className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold">Inventory</span>
        </div>
        <LanguageSwitcher />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          {t("navigation.logout")}
        </Button>
      </div>
    </div>
  );
};
