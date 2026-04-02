import { CreateUserDialog } from "@/components/CreateUserDialog";
import { UsersTable } from "@/components/UsersTable";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <CreateUserDialog />
      </div>
      <UsersTable />
    </div>
  );
}
