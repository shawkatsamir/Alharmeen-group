import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  suggestedAxes,
  variantAxisLabel,
} from "@/features/products/constants/variant-axes";
import {
  getGroupHealth,
  getGroupMembers,
  type GroupHealthRow,
} from "@/features/admin/products/data";
import {
  deleteEmptyGroup,
  renameGroupAxis,
} from "@/features/admin/products/actions/variant-groups";
import { getAxisRegistry } from "@/services/server/variant-axes";

export const dynamic = "force-dynamic";

export const metadata = { title: "مجموعات المنتجات" };

/** Failure codes redirected back by the group actions. */
const GROUP_ERRORS: Record<string, string> = {
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء",
  members: "المجموعة لم تصبح فارغة — أزل منتجاتها أولاً",
  delete: "تعذر حذف المجموعة، حاول مرة أخرى",
  axis: "اسم الخاصية مطلوب",
  axisTaken: "هذه المجموعة تختلف في هذه الخاصية بالفعل",
  rename: "تعذر تغيير الخاصية، حاول مرة أخرى",
};

/**
 * Every variant group in one place, with what is wrong with each.
 *
 * The gap this fills: before it, a group could only be reached from a product
 * that happened to be in it, and the group picker on the product form listed
 * names with no indication of how many members a group had, which one was the
 * primary, or whether it was quietly broken.
 */
interface ProductGroupsPageProps {
  searchParams: Promise<{ groupError?: string }>;
}

export default async function ProductGroupsPage({
  searchParams,
}: ProductGroupsPageProps) {
  const { groupError } = await searchParams;

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

  const [groups, axisRegistry] = await Promise.all([
    getGroupHealth(),
    getAxisRegistry(),
  ]);
  const axisChoices = suggestedAxes(axisRegistry);

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

      {groupError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
        >
          {GROUP_ERRORS[groupError] ?? "حدث خطأ غير متوقع"}
        </p>
      )}

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
                    {group.member_count} منتج ({group.active_count} منشور)
                  </p>

                  {/*
                    Renaming an axis used to be impossible, so a mistyped one
                    was permanent: a group ended up axed on `موراندي جراي` — a
                    colour VALUE in the axis field — and another on `الشاشة`,
                    both deleted and recreated rather than corrected. The RPC
                    rewrites product_groups.axes and re-keys every member's
                    variant_values and specifications in one transaction.
                  */}
                  {group.axes.length === 0 && (
                    <p className="text-xs text-sale">بدون خاصية محددة</p>
                  )}
                  {group.axes.map((axis) => (
                    <form
                      key={axis}
                      action={renameGroupAxis.bind(null, group.id, axis)}
                      className="mt-1 flex flex-wrap items-center gap-1 text-xs"
                    >
                      <span className="text-muted-foreground">يختلف في</span>
                      <input
                        name="axis"
                        defaultValue={axis}
                        list={`axis-choices-${group.id}`}
                        className="w-44 rounded border border-gray-200 px-2 py-0.5 dark:border-gray-700 dark:bg-gray-900"
                      />
                      {variantAxisLabel(axis, axisRegistry) !== axis && (
                        <span className="text-muted-foreground">
                          ({variantAxisLabel(axis, axisRegistry)})
                        </span>
                      )}
                      <button
                        type="submit"
                        className="rounded border border-border px-2 py-0.5 hover:bg-surface-sunken"
                      >
                        تغيير
                      </button>
                    </form>
                  ))}
                  <datalist id={`axis-choices-${group.id}`}>
                    {axisChoices.map((axis) => (
                      <option key={axis} value={axis} />
                    ))}
                  </datalist>
                </div>

                <ul className="flex flex-wrap gap-1.5">
                  {warnings.map((warning) => (
                    <li
                      key={warning}
                      className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground dark:text-accent"
                    >
                      {warning}
                    </li>
                  ))}
                  {warnings.length === 0 && (
                    <li className="rounded bg-success-soft px-2 py-0.5 text-xs text-success">
                      سليمة
                    </li>
                  )}
                </ul>

                {/*
                  Only offered for an empty group, and the action re-counts
                  server-side before deleting — `member_count` here is a view
                  read from one request ago.
                */}
                {group.member_count === 0 && (
                  <form action={deleteEmptyGroup.bind(null, group.id)}>
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-sale hover:bg-surface-sunken"
                    >
                      حذف المجموعة
                    </button>
                  </form>
                )}
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

  /*
   * An empty group is its own state and returns early.
   *
   * It used to fall through to `active_count === 0` and report "كل المنتجات
   * مؤرشفة" — "all products archived" — for a group that has no products at
   * all, and then add "بدون منتج أساسي" on top. Three identically named
   * orphans reading that way is why the residue went unrecognised for weeks.
   */
  if (group.member_count === 0) {
    warnings.push("مجموعة فارغة — بلا أي منتج");
    return warnings;
  }

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
  /*
   * A contradiction outranks everything below it: the product page shows one
   * value in the spec table and a different one on the switcher, which the
   * customer can see. Two Toshiba freezers are in exactly this state — the
   * switcher calls them رمادي غامق / رمادي فاتح while their spec row says
   * سيلفر, copied from the silver sibling.
   */
  if (group.members_axis_spec_mismatch > 0) {
    warnings.push(
      `${group.members_axis_spec_mismatch} المواصفات تخالف قيمة النسخة`,
    );
  }
  if (group.members_axis_spec_missing > 0) {
    warnings.push(
      `${group.members_axis_spec_missing} الخاصية غير مذكورة في المواصفات`,
    );
  }
  if (group.members_with_extra_axis > 0) {
    warnings.push(`${group.members_with_extra_axis} بخاصية غير معرّفة`);
  }
  if (group.members_without_images > 0) {
    warnings.push(`${group.members_without_images} بدون صورة`);
  }
  // Not broken — the axis renders on the `text` fallback with its raw key as
  // the label — just unfinished, and invisible before this.
  if (group.undeclared_axes && group.undeclared_axes.length > 0) {
    warnings.push(`خاصية غير مُعرَّفة: ${group.undeclared_axes.join("، ")}`);
  }

  return warnings;
}
