import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { variantAxisLabel } from "@/features/products/constants/variant-axes";
import {
  getGroupHealth,
  getGroupMembers,
  type GroupHealthRow,
} from "@/features/admin/products/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "مجموعات المنتجات" };

/**
 * Every variant group in one place, with what is wrong with each.
 *
 * The gap this fills: before it, a group could only be reached from a product
 * that happened to be in it, and the group picker on the product form listed
 * names with no indication of how many members a group had, which one was the
 * primary, or whether it was quietly broken.
 */
export default async function ProductGroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const groups = await getGroupHealth();

  // One extra round trip per group, to link each row at its primary — the
  // product an admin actually wants to open. At this catalogue size that is
  // cheaper than a second view.
  const entryPoints = await Promise.all(
    groups.map(async (group) => {
      const members = await getGroupMembers(group.id);
      const primary =
        members.find((m) => m.is_group_primary) ?? members[0] ?? null;
      return [group.id, primary] as const;
    }),
  );
  const primaryOf = new Map(entryPoints);

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            مجموعات المنتجات
          </h1>
          <p className="text-sm text-muted-foreground">
            المنتجات التي تُباع في أكثر من لون أو مقاس أو مواصفة.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-sunken"
        >
          كل المنتجات
        </Link>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا توجد مجموعات بعد. أنشئ واحدة من صفحة تعديل أي منتج.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {groups.map((group) => {
            const primary = primaryOf.get(group.id) ?? null;
            const warnings = warningsFor(group);

            return (
              <li key={group.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {primary ? (
                      <Link
                        href={`/admin/products/${primary.id}/edit`}
                        className="text-primary hover:underline"
                      >
                        {group.name_ar}
                      </Link>
                    ) : (
                      group.name_ar
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    يختلف في: {group.axes.map(variantAxisLabel).join("، ") || "—"} ·{" "}
                    {group.member_count} منتج ({group.active_count} منشور)
                  </p>
                </div>

                <ul className="flex flex-wrap gap-1.5">
                  {warnings.map((warning) => (
                    <li
                      key={warning}
                      className="rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                    >
                      {warning}
                    </li>
                  ))}
                  {warnings.length === 0 && (
                    <li className="rounded bg-green-50 px-2 py-0.5 text-[11px] text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      سليمة
                    </li>
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Arabic warnings for a group.
 *
 * Ordered by how badly each one breaks the storefront: a group that shows no
 * switcher at all comes before one that merely looks unfinished.
 */
function warningsFor(group: GroupHealthRow): string[] {
  const warnings: string[] = [];

  if (group.active_count < 2) {
    warnings.push(
      group.active_count === 0
        ? "كل المنتجات مؤرشفة"
        : "منتج واحد منشور — لا يظهر زر التبديل",
    );
  }
  if (group.primary_count !== 1) {
    warnings.push(
      group.primary_count === 0 ? "بدون منتج أساسي" : "أكثر من منتج أساسي",
    );
  }
  if (group.members_missing_axis > 0) {
    warnings.push(`${group.members_missing_axis} بدون قيمة للخاصية`);
  }
  if (group.members_with_extra_axis > 0) {
    warnings.push(`${group.members_with_extra_axis} بخاصية غير معرّفة`);
  }
  if (group.members_without_images > 0) {
    warnings.push(`${group.members_without_images} بدون صورة`);
  }

  return warnings;
}
