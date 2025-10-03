import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const Clients = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: clients = [], refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
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
            <h1 className="text-3xl font-bold">{t("clients.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("clients.subtitle")}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("clients.newClient")}
          </Button>
        </div>

        <ClientsTable clients={clients} onUpdate={refetch} />

        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user?.id}
          onSuccess={refetch}
        />
      </div>
    </MainLayout>
  );
};

export default Clients;
