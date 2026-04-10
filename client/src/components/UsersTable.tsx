import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Role } from "core";
import { EditUserDialog } from "@/components/EditUserDialog";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export function UsersTable() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      axios.get<{ users: User[] }>("/api/admin/users").then((r) => r.data.users),
  });

  const users = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => axios.delete(`/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUser(null);
      setDeleteError(null);
    },
    onError: (err) => {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Failed to delete user.")
        : "Failed to delete user.";
      setDeleteError(message);
    },
  });

  return (
    <>
      <EditUserDialog
        user={editingUser}
        open={editingUser !== null}
        onOpenChange={(open) => { if (!open) setEditingUser(null); }}
      />
      <DeleteUserDialog
        user={deletingUser}
        open={deletingUser !== null}
        onOpenChange={(open) => { if (!open) { setDeletingUser(null); setDeleteError(null); } }}
        onConfirm={() => deleteMutation.mutate(deletingUser!.id)}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
      {isError && <p className="text-sm text-destructive">Failed to load users.</p>}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === Role.admin ? "default" : "secondary"}
                      className={user.role === Role.agent ? "bg-green-100 text-green-800 hover:bg-green-100 border-transparent" : ""}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => setEditingUser(user)}
                    >
                      <Pencil />
                    </Button>
                    {user.role !== Role.admin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingUser(user)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
