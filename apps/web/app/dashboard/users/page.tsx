"use client";

import { Ban, CheckCircle, Edit, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getUserApi } from "@/lib/api-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  isSuspended: boolean;
  suspendedUntil: string | null;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.api.users.get();
      if (data && typeof data === "object" && "users" in data) {
        setUsers(data.users as User[]);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;

    try {
      const { error } = await api.api.users({ id: editingUser.id }).patch({
        name,
        role: role as "admin" | "user",
      });

      if (!error) {
        await fetchUsers();
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleSuspend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!suspendingUser) return;

    const formData = new FormData(e.currentTarget);
    const suspendedUntil = formData.get("suspendedUntil") as string;

    try {
      const { error } = await getUserApi(suspendingUser.id).suspension.patch({
        isSuspended: true,
        suspendedUntil: suspendedUntil || null,
      });

      if (!error) {
        await fetchUsers();
        setSuspendingUser(null);
      }
    } catch (error) {
      console.error("Failed to suspend user:", error);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      const { error } = await getUserApi(userId).suspension.patch({
        isSuspended: false,
        suspendedUntil: null,
      });

      if (!error) {
        await fetchUsers();
      }
    } catch (error) {
      console.error("Failed to unsuspend user:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    try {
      const { error } = await api.api.users({ id: deleteUser.id }).delete();

      if (!error) {
        await fetchUsers();
        setDeleteUser(null);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const isUserSuspended = (user: User): boolean => {
    if (!user.isSuspended) return false;
    if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      return false;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage user accounts and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>All registered users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {isUserSuspended(user) ? (
                          <Badge variant="destructive">
                            Suspended
                            {user.suspendedUntil &&
                              ` until ${new Date(user.suspendedUntil).toLocaleDateString()}`}
                          </Badge>
                        ) : (
                          <Badge variant={user.emailVerified ? "default" : "outline"}>
                            {user.emailVerified ? "Active" : "Unverified"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isUserSuspended(user) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnsuspend(user.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSuspendingUser(user)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={user.id === session?.user?.id}
                          onClick={() => setDeleteUser(user)}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingUser?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={editingUser?.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendingUser} onOpenChange={() => setSuspendingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend {suspendingUser?.name} from accessing the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSuspend}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="suspendedUntil">Suspend Until (Optional)</Label>
                <Input
                  id="suspendedUntil"
                  name="suspendedUntil"
                  type="datetime-local"
                  placeholder="Leave empty for indefinite suspension"
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty for indefinite suspension
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuspendingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Suspend User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
