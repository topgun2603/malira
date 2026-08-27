"use client";

import { useState } from "react";
import { GripVertical, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useSeedCategories,
  useUpdateCategory,
} from "@/hooks/use-categories";
import { useArticles } from "@/hooks/use-articles";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const { data: articles } = useArticles({ max: 500 });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const seedCategories = useSeedCategories();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  // A category with articles behind it should not vanish silently.
  const usage = new Map<string, number>();
  for (const article of articles ?? []) {
    usage.set(article.categoryId, (usage.get(article.categoryId) ?? 0) + 1);
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Give the category an English name.");
      return;
    }
    createCategory.mutate(
      {
        name: name.trim(),
        nameTa: nameTa.trim(),
        order: (categories?.length ?? 0) + 1,
        active: true,
      },
      {
        onSuccess: () => {
          setName("");
          setNameTa("");
          setAddOpen(false);
        },
      },
    );
  }

  function move(category: Category, direction: -1 | 1) {
    const list = categories ?? [];
    const index = list.findIndex((item) => item.id === category.id);
    const target = list[index + direction];
    if (!target) return;
    updateCategory.mutate({ id: category.id, input: { order: target.order } });
    updateCategory.mutate({ id: target.id, input: { order: category.order } });
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="These become the tabs across the top of the app feed, in this order."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a category</DialogTitle>
                <DialogDescription>
                  It appears as a feed tab as soon as it is active.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">English name</Label>
                  <Input
                    id="name"
                    value={name}
                    placeholder="Agriculture & Tea"
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameTa">Tamil name</Label>
                  <Input
                    id="nameTa"
                    lang="ta"
                    className="font-tamil"
                    value={nameTa}
                    onChange={(event) => setNameTa(event.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={createCategory.isPending}>
                  Add category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (categories ?? []).length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Start with the seven from the Phase 1 scope, then adjust."
          action={
            <Button
              onClick={() => seedCategories.mutate()}
              disabled={seedCategories.isPending}
            >
              Add default categories
            </Button>
          }
        />
      ) : (
        <StaggerList className="space-y-2">
          {(categories ?? []).map((category, index) => {
            const count = usage.get(category.id) ?? 0;
            return (
              <StaggerItem key={category.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => move(category, -1)}
                      >
                        <GripVertical className="size-4 rotate-90" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{category.name}</p>
                      {category.nameTa && (
                        <p className="text-muted-foreground font-tamil text-sm">
                          {category.nameTa}
                        </p>
                      )}
                    </div>

                    <span className="text-muted-foreground hidden text-sm sm:block">
                      {count} {count === 1 ? "article" : "articles"}
                    </span>

                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`active-${category.id}`}
                        className="text-muted-foreground text-xs"
                      >
                        Active
                      </Label>
                      <Switch
                        id={`active-${category.id}`}
                        checked={category.active}
                        onCheckedChange={(checked) =>
                          updateCategory.mutate({
                            id: category.id,
                            input: { active: checked },
                          })
                        }
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => setPendingDelete(category)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {(usage.get(pendingDelete?.id ?? "") ?? 0) > 0
                ? `${usage.get(pendingDelete?.id ?? "")} articles still use "${pendingDelete?.name}". They will show as uncategorised until you reassign them. Switching it off instead hides the tab and keeps the link.`
                : `"${pendingDelete?.name}" is not used by any article and can be removed safely.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteCategory.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
