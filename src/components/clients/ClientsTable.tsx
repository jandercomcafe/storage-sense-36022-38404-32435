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
import { Edit, Trash2, MessageCircle } from "lucide-react";
import { ClientDialog } from "./ClientDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";
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

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientsTableProps {
  clients: Client[];
  onUpdate: () => void;
}

export function ClientsTable({ clients, onUpdate }: ClientsTableProps) {
  const { t } = useTranslation();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const handleDelete = async () => {
    if (!deletingClient) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", deletingClient.id);

      if (error) throw error;

      toast.success(t("clients.clientDeleted"));
      onUpdate();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error(t("common.error"));
    } finally {
      setDeletingClient(null);
    }
  };

  const handleWhatsApp = (client: Client) => {
    const phone = (client.whatsapp || client.phone).replace(/\D/g, "");
    const message = encodeURIComponent(t("clients.whatsappGreeting", { name: client.full_name }));
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("clients.noClients")}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("clients.fullName")}</TableHead>
              <TableHead>{t("clients.companyName")}</TableHead>
              <TableHead>{t("clients.cpfCnpj")}</TableHead>
              <TableHead>{t("clients.phone")}</TableHead>
              <TableHead>{t("clients.email")}</TableHead>
              <TableHead>{t("clients.city")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.full_name}</TableCell>
                <TableCell>{client.company_name || "-"}</TableCell>
                <TableCell>{client.cpf_cnpj || "-"}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.email || "-"}</TableCell>
                <TableCell>{client.city || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleWhatsApp(client)}
                      title={t("clients.sendWhatsApp")}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingClient(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingClient(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingClient && (
        <ClientDialog
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          client={editingClient}
          onSuccess={() => {
            setEditingClient(null);
            onUpdate();
          }}
        />
      )}

      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
