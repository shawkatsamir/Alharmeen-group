import Link from "next/link";

import { Img } from "@/shared/components/ui/Image";
import { formatCurrency } from "@/lib/utils";
import {
  VARIANT_AXES,
  variantAxisLabel,
} from "@/features/products/constants/variant-axes";
import { describeVariant, sortVariantMembers } from "@/features/products/lib/variant-group";
import type { GroupMember } from "../data";
import {
  addVariantToGroup,
  createGroupFromProduct,
  removeFromGroup,
  renameVariantGroup,
  setGroupPrimary,
} from "../actions/variant-groups";

interface VariantGroupPanelProps {
  productId: string;
  productName: string;
  /** Seed for the group name field when creating a group. */
  suggestedName: string;
  /** Value suggestions for the axis field, from the product's own specs. */
  suggestedValues: Record<string, string>;
  group: { id: string; name_ar: string; axes: string[] } | null;
  members: GroupMember[];
}

/**
 * The group summary on the product edit page.
 *
 * This exists because of a question the store owner asked that the first version
 * could not answer: the group picker listed group *names* only, so a group whose
 * only member was the product that created it looked identical to a populated
 * one, and nothing said which product was the primary or which colours were
 * already taken. There was no way to get from a group back to its origin.
 *
 * A server component — every control is a form posting to a Server Action, so
 * the panel needs no client JavaScript at all.
 */
export function VariantGroupPanel({
  productId,
  productName,
  suggestedName,
  suggestedValues,
  group,
  members,
}: VariantGroupPanelProps) {
  if (!group) {
    return <CreateGroupForm productId={productId} suggestedName={suggestedName} suggestedValues={suggestedValues} />;
  }

  const ordered = sortVariantMembers(members);

  return (
    <section className="mb-6 rounded-lg border border-border p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            مجموعة المنتج
          </h2>
          <p className="text-xs text-muted-foreground">
            يختلف أفراد هذه المجموعة في:{" "}
            <span className="font-medium">
              {group.axes.map(variantAxisLabel).join("، ") || "—"}
            </span>
          </p>
        </div>

        <form action={addVariantToGroup.bind(null, productId)}>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            أضف نسخة جديدة
          </button>
        </form>
      </header>

      <form
        action={renameVariantGroup.bind(null, productId, group.id)}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
            اسم المجموعة
          </span>
          <input
            name="name"
            defaultValue={group.name_ar}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-sunken"
        >
          حفظ الاسم
        </button>
      </form>

      <ul className="divide-y divide-border">
        {ordered.map((member) => {
          const isCurrent = member.id === productId;
          const image =
            member.images?.find((i) => i.is_primary)?.image_url ??
            member.images?.[0]?.image_url;
          const label = describeVariant(member.variant_values, group.axes);

          return (
            <li key={member.id} className="flex items-center gap-3 py-2">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-sunken">
                {image ? (
                  <Img src={image} alt="" fill sizes="48px" className="object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-sale">
                    بلا صورة
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {label || <span className="text-sale">بدون قيمة</span>}
                  {member.is_group_primary && (
                    <span className="mr-2 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">
                      الأساسي
                    </span>
                  )}
                  {isCurrent && (
                    <span className="mr-2 text-[10px] text-muted-foreground">
                      (هذا المنتج)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.sku} · {formatCurrency(member.price)} ·{" "}
                  {member.is_active ? `${member.stock_quantity} بالمخزن` : "مؤرشف"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!isCurrent && (
                  <Link
                    href={`/admin/products/${member.id}/edit`}
                    className="text-xs text-primary hover:underline"
                  >
                    تعديل
                  </Link>
                )}
                {!member.is_group_primary && (
                  <form action={setGroupPrimary.bind(null, productId, member.id, group.id)}>
                    <button type="submit" className="text-xs text-primary hover:underline">
                      اجعله الأساسي
                    </button>
                  </form>
                )}
                <form action={removeFromGroup.bind(null, productId, member.id, group.id)}>
                  <button type="submit" className="text-xs text-sale hover:underline">
                    إزالة
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      {members.length < 2 && (
        <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          هذه المجموعة تحتوي على منتج واحد فقط، لذلك لا يظهر زر التبديل في المتجر.
          أضف نسخة أخرى أو أزل المنتج من المجموعة.
        </p>
      )}

      <p className="sr-only">مجموعة المنتج {productName}</p>
    </section>
  );
}

/**
 * Shown on a product that belongs to no group.
 *
 * The axis and this product's value for it are both required. There is no
 * default and no fallback — the previous version guessed colour and invented
 * "أساسي" when it found none, which is how two silver microwaves that differ by
 * a grill ended up as a colour group.
 */
function CreateGroupForm({
  productId,
  suggestedName,
  suggestedValues,
}: {
  productId: string;
  suggestedName: string;
  suggestedValues: Record<string, string>;
}) {
  return (
    <section className="mb-6 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
      <h2 className="font-semibold text-gray-900 dark:text-white">
        هل يوجد نفس المنتج بلون أو مقاس أو مواصفة مختلفة؟
      </h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        اربطهما في مجموعة واحدة ليظهر للعميل زر تبديل بينهما، ويظهر المنتج مرة
        واحدة في القوائم بدلاً من مرة لكل نسخة.
      </p>

      <form
        action={createGroupFromProduct.bind(null, productId)}
        className="grid gap-3 sm:grid-cols-3"
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
            يختلفان في
          </span>
          <input
            name="axis"
            list={`axis-suggestions-${productId}`}
            required
            placeholder="مثال: اللون"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <datalist id={`axis-suggestions-${productId}`}>
            {VARIANT_AXES.map((axis) => (
              <option key={axis} value={axis} />
            ))}
          </datalist>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
            قيمة هذا المنتج
          </span>
          <input
            name="value"
            list={`value-suggestions-${productId}`}
            required
            placeholder="مثال: أسود"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          {/*
            Seeded from this product's own specifications, so the common case —
            the colour is already recorded — is one click rather than retyping.
          */}
          <datalist id={`value-suggestions-${productId}`}>
            {Object.values(suggestedValues).map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
            اسم المجموعة
          </span>
          <input
            name="name"
            required
            defaultValue={suggestedName}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <div className="sm:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            أنشئ المجموعة وأضف نسخة
          </button>
        </div>
      </form>
    </section>
  );
}
