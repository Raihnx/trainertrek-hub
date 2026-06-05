import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  usePermissions,
  useRolePermissions,
  useUserPermissionOverrides,
  useSetUserPermission,
} from "@/lib/permissions";
import type { AppRole } from "@/lib/useRole";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
  role: AppRole;
};

export function PermissionMatrixDialog({ open, onOpenChange, userId, userName, role }: Props) {
  const { data: perms = [], isLoading: pLoading } = usePermissions();
  const { data: rolePerms, isLoading: rLoading } = useRolePermissions();
  const { data: overrides, isLoading: oLoading } = useUserPermissionOverrides(userId);
  const setPerm = useSetUserPermission();

  const isAdmin = role === "admin";
  const loading = pLoading || rLoading || oLoading;

  const grouped = useMemo(() => {
    const m = new Map<string, typeof perms>();
    perms.forEach((p) => {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(p);
    });
    return Array.from(m.entries());
  }, [perms]);

  const effective = (key: string) => {
    if (isAdmin) return true;
    const o = overrides?.get(key);
    if (o !== undefined) return o;
    return rolePerms?.[role]?.has(key) ?? false;
  };

  const isOverridden = (key: string) => overrides?.has(key) ?? false;

  const onToggle = async (key: string, next: boolean) => {
    if (!userId || isAdmin) return;
    const roleDefault = rolePerms?.[role]?.has(key) ?? false;
    try {
      // If toggling back to the role default, clear the override
      await setPerm.mutateAsync({
        userId,
        key,
        granted: next === roleDefault ? null : next,
        userLabel: userName,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update permission");
    }
  };

  const resetOne = async (key: string) => {
    if (!userId) return;
    try {
      await setPerm.mutateAsync({ userId, key, granted: null, userLabel: userName });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissions — {userName}</DialogTitle>
          <DialogDescription>
            Role: <span className="font-medium capitalize text-foreground">{role}</span>.
            {isAdmin
              ? " Admins have full access; toggles are disabled."
              : " Toggling overrides the role default for this user only."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading permissions…
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([category, list]) => (
              <div key={category} className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {category}
                </div>
                <div className="space-y-3">
                  {list.map((p) => {
                    const on = effective(p.key);
                    const overridden = isOverridden(p.key);
                    return (
                      <div key={p.key} className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{p.label}</div>
                            {overridden && !isAdmin && (
                              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                                Override
                              </Badge>
                            )}
                          </div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground">{p.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {overridden && !isAdmin && (
                            <button
                              type="button"
                              onClick={() => resetOne(p.key)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Reset to role default"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <Switch
                            checked={on}
                            disabled={isAdmin || setPerm.isPending}
                            onCheckedChange={(v) => onToggle(p.key, v)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
