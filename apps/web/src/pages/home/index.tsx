import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import {
  createSampleItem,
  deleteSampleItem,
  updateSampleItem,
  type SampleItem,
} from "@/api";
import { useSampleItems } from "@/hooks/useSampleItems";
import { authBridge, loginWithAi101 } from "@/lib/authBridge";
import { getApiErrorMessage } from "@/lib/apiError";
import type { AuthInfo } from "@zcat-open/auth-bridge";

type AuthUser = {
  displayNameHint?: unknown;
};

const resolveDisplayName = (authInfo: AuthInfo | null): string => {
  const displayNameHint = (authInfo as AuthUser | null)?.displayNameHint;
  if (typeof displayNameHint === "string" && displayNameHint.trim()) {
    return displayNameHint.trim();
  }

  return "";
};

const resolveAuthStatusLabel = (authInfo: AuthInfo | null, displayName: string): string => {
  if (displayName) {
    return displayName;
  }
  if (authInfo?.token) {
    return "已登录";
  }
  return "未登录";
};

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingItem, setEditingItem] = useState<SampleItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo());
  const { items, listLoading, listError, loadItems } = useSampleItems();
  const displayName = useMemo(() => resolveDisplayName(authInfo), [authInfo]);
  const authStatusLabel = useMemo(
    () => resolveAuthStatusLabel(authInfo, displayName),
    [authInfo, displayName],
  );
  const isAuthenticated = Boolean(authInfo?.token);

  useEffect(() => {
    return authBridge.subscribe(setAuthInfo);
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await loginWithAi101();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "登录失败"));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.warning("name 为必填");
      return;
    }

    setLoading(true);
    try {
      await createSampleItem({ name: name.trim(), description: description.trim() });
      toast.success("新增成功");
      setName("");
      setDescription("");
      await loadItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "提交失败"));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item: SampleItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description);
  };

  const closeEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditDescription("");
  };

  const handleUpdate = async () => {
    if (!editingItem || !editName.trim()) {
      toast.warning("name 为必填");
      return;
    }

    setEditLoading(true);
    try {
      await updateSampleItem(editingItem.id, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      toast.success("修改成功");
      closeEdit();
      await loadItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "修改失败"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteSampleItem(id);
      toast.success("删除成功");
      await loadItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "删除失败"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Info Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              MVP Template - Sample 页面
            </CardTitle>
            <CardDescription className="text-slate-500">
              这是模板默认示例。新人新开项目时，按 OpenSpec 先设计，再替换这里的 sample 业务。
            </CardDescription>
            <div className="mt-4 flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-slate-700">AI101 认证用户</span>
              <div className="flex items-center gap-3">
                <span className={isAuthenticated ? "font-medium text-green-600" : "text-slate-400"}>
                  {authStatusLabel}
                </span>
                {!isAuthenticated ? (
                  <Button size="sm" loading={loginLoading} onClick={() => void handleLogin()}>
                    登录
                  </Button>
                ) : null}
              </div>
            </div>
            {listError ? (
              <p className="mt-2 text-sm font-medium text-red-500">{listError}</p>
            ) : null}
          </CardHeader>
        </Card>

        {/* Add Item Form Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-950">新增 Sample Item</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name（必填）"
              className="max-w-md"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="description（可选）"
              className="max-w-md"
            />
            <Button
              className="w-fit"
              loading={loading}
              disabled={!name.trim()}
              onClick={handleSubmit}
            >
              提交
            </Button>
          </CardContent>
        </Card>

        {/* List Card */}
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-955">Sample Items</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadItems()} loading={listLoading}>
              刷新
            </Button>
          </CardHeader>
          <CardContent className="p-0 border-t border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/75">
                <TableRow>
                  <TableHead className="w-[100px] font-medium text-slate-500">ID</TableHead>
                  <TableHead className="font-medium text-slate-500">Name</TableHead>
                  <TableHead className="font-medium text-slate-500">Description</TableHead>
                  <TableHead className="w-[200px] font-medium text-slate-500">Created At</TableHead>
                  <TableHead className="w-[160px] font-medium text-slate-500 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>加载中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-400">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                      <TableCell className="text-slate-600 max-w-[240px] truncate">
                        {item.description || <span className="text-slate-300">-</span>}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">{item.created_at}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            修改
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                loading={deletingId === item.id}
                              >
                                删除
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确定删除这条记录吗？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  此操作无法撤销。删除后，该项将永久移除。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void handleDelete(item.id)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  确认
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal (Dialog) */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>修改 Sample Item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="name（必填）"
            />
            <Input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="description（可选）"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={editLoading}>
              取消
            </Button>
            <Button onClick={() => void handleUpdate()} loading={editLoading} disabled={!editName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
