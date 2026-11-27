import Link from "next/link";

import { Img } from "@/shared/components/ui/Image";
import { formatCurrency } from "@/lib/utils";
import {
  variantAxisLabel,
  type AxisRegistry,
} from "@/features/products/constants/variant-axes";
import { describeVariant, sortVariantMembers } from "@/features/products/lib/variant-group";
import type { GroupMember } from "../data";
import {
  addVariantToGroup,
  createGroupFromProduct,
  removeFromGroup,
  renameVariantGroup,
  setGroupPrimary,
  setMemberVariantValue,
} from "../actions/variant-groups";

/** A candidate axis offered to the admin, with the source product's value. */
export interface AxisCandidate {
  key: string;
  /** This product's value for it, empty when the product does not record it. */
  value: string;
  /** How many products in this category use the key. */
  uses: number;
}

interface VariantGroupPanelProps {
  productId: string;
  productName: string;
  productSku: string;
  /** Seed for the group name field when creating a group. */
  suggestedName: string;
  /**
   * Specification rows of THIS product, plus keys its category uses that it
   * lacks. The axis is chosen from here rather than typed.
   */
  axisCandidates: AxisCandidate[];
  registry?: AxisRegistry;
  group: { id: string; name_ar: string; axes: string[] } | null;
  members: GroupMember[];
}

/**
 * The group summary on the product edit page.
 *
 * This exists because of a question the store owner asked that the first version
 * could not answer: the group picker listed group *names* only, so a group whose
 * only member was the product that created it looked identical to a populated
 * one, and nothing said which product was the primary or which values were
 * already taken. There was no way to get from a group back to its origin.
 *
 * A server component — every control is a form posting to a Server Action, so
 * the panel needs no client JavaScript at all.
 */
export function VariantGroupPanel({
  productId,
  productName,
  productSku,
  suggestedName,
  axisCandidates,
  registry,
  group,
  members,
}: VariantGroupPanelProps) {
  if (!group) {
    return (
      <CreateGroupForm
        productId={productId}
        productName={productName}
        productSku={productSku}
        suggestedName={suggestedName}
        axisCandidates={axisCandidates}
      />
    );
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
              {group.axes.map((axis) => variantAxisLabel(axis, registry)).join("، ") ||
                "—"}
            </span>
            {" · "}
            <Link href="/admin/products/groups" className="text-primary hover:underline">
              إدارة المجموعات
            </Link>
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
            <li key={member.id} className="py-2">
              <div className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-sunken">
                  {image ? (
                    <Img src={image} alt="" fill sizes="48px" className="object-contain" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] text-sale">
                      بلا صورة
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {label || <span className="text-sale">بدون قيمة</span>}
                    {member.is_group_primary && (
                      <span className="mr-2 rounded bg-primary-soft px-1.5 py-0.5 text-[11px] text-primary">
                        الأساسي
                      </span>
                    )}
                    {isCurrent && (
                      <span className="mr-2 text-[11px] text-muted-foreground">
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
              </div>

              {/*
                Fix a member's value in place.
                The operation whose absence cost six failed saves: this group's
                only member claimed "بدون شاشة" while its own name says
                شاشة ديجيتال, so the genuinely screenless product could not be
                added — and correcting it meant working out which product held
                the value and opening its whole form.
              */}
              <div className="mt-1 flex flex-wrap gap-2 ps-15">
                {group.axes.map((axis) => (
                  <form
                    key={axis}
                    action={setMemberVariantValue.bind(
                      null,
                      productId,
                      member.id,
                      group.id,
                    )}
                    className="flex items-end gap-1"
                  >
                    <input type="hidden" name="axis" value={axis} />
                    <label className="text-[11px] text-muted-foreground">
                      <span className="mb-0.5 block">
                        {variantAxisLabel(axis, registry)}
                      </span>
                      <input
                        name="value"
                        defaultValue={readValue(member.variant_values, axis)}
                        className="w-40 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded border border-border px-2 py-1 text-[11px] hover:bg-surface-sunken"
                    >
                      حفظ
                    </button>
                  </form>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        The copy here used to read "أضف نسخة أخرى أو أزل المنتج من المجموعة",
        which steered the admin straight into the orphan trap: removing the last
        member leaves the group behind, and nothing could delete it.
      */}
      {members.length < 2 && (
        <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          هذه المجموعة تحتوي على منتج واحد فقط، لذلك لا يظهر زر التبديل في المتجر.
          اضغط «أضف نسخة جديدة» أعلاه لإنشاء النسخة الثانية — ستُنسخ كل البيانات
          ويبقى عليك رمز المنتج وقيمة الخاصية. وإن أزلت المنتج من المجموعة فستبقى
          المجموعة فارغة، ويمكن حذفها من صفحة مجموعات المنتجات.
        </p>
      )}

      <p className="sr-only">مجموعة المنتج {productName}</p>
    </section>
  );
}

function readValue(variantValues: unknown, axis: string): string {
  if (
    typeof variantValues !== "object" ||
    variantValues === null ||
    Array.isArray(variantValues)
  ) {
    return "";
  }
  const raw = (variantValues as Record<string, unknown>)[axis];
  return typeof raw === "string" ? raw : "";
}

/**
 * Shown on a product that belongs to no group.
 *
 * ---------------------------------------------------------------------------
 * The axis is PICKED FROM THIS PRODUCT'S OWN SPECIFICATIONS, not typed.
 *
 * Three live mistakes came out of the free-text version, all of them the same
 * mistake:
 *
 *   * a group axed on `موراندي جراي` — the colour VALUE typed into the axis box
 *   * a group axed on `الشاشة`, deleted and recreated as `نوع الشاشة` because
 *     an axis could not be renamed
 *   * the surviving gas cooker group, whose axis `نوع الشاشة` appears NOWHERE in
 *     the product's specifications, so the spec table and the switcher state
 *     different things and `groupSpecifications()` cannot group the one fact
 *     that distinguishes the variants
 *
 * `AXIS_REGISTRY`'s contract has always been that an axis key IS a spec key.
 * Picking from the spec table makes that true by construction, and carries the
 * product's own value across with it — so the value cannot be inverted either,
 * which is the other thing that happened: the admin typed the OTHER product's
 * value into a box labelled only «قيمة هذا المنتج», with no product named.
 * ---------------------------------------------------------------------------
 */
function CreateGroupForm({
  productId,
  productName,
  productSku,
  suggestedName,
  axisCandidates,
}: {
  productId: string;
  productName: string;
  productSku: string;
  suggestedName: string;
  axisCandidates: AxisCandidate[];
}) {
  const recorded = axisCandidates.filter((candidate) => candidate.value);
  const unrecorded = axisCandidates.filter((candidate) => !candidate.value);

  return (
    <section className="mb-6 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
      <h2 className="font-semibold text-gray-900 dark:text-white">
        هل يوجد نفس هذا المنتج مع اختلاف في خاصية واحدة؟
      </h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        اربطهما في مجموعة واحدة ليظهر للعميل زر تبديل بينهما، ويظهر المنتج مرة
        واحدة في القوائم بدلاً من مرة لكل نسخة. اختر الخاصية التي تختلف بينهما من
        مواصفات هذا المنتج.
      </p>

      <form action={createGroupFromProduct.bind(null, productId)} className="space-y-3">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            ما الذي يختلف بين النسختين؟
          </legend>

          {recorded.length === 0 && unrecorded.length === 0 && (
            <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              هذا المنتج لا يحتوي على مواصفات بعد. أضف المواصفة التي تختلف بين
              النسختين في تبويب «المواصفات» أولاً، ثم أنشئ المجموعة من هنا.
            </p>
          )}

          <div className="space-y-1.5">
            {recorded.map((candidate, index) => (
              <label
                key={candidate.key}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2 text-sm hover:bg-surface-sunken has-checked:border-primary has-checked:bg-primary-soft"
              >
                <input
                  type="radio"
                  name="picked"
                  value={candidate.key}
                  defaultChecked={index === 0}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{candidate.key}</span>
                  {/*
                    The product is NAMED here. The old form asked for
                    «قيمة هذا المنتج» with no indication of which product that
                    was, and the admin entered the other one's value.
                  */}
                  <span className="block text-xs text-muted-foreground">
                    قيمة {productSku}: <span className="font-medium">{candidate.value}</span>
                  </span>
                </span>
              </label>
            ))}

            {unrecorded.length > 0 && (
              <details className="rounded-lg border border-border p-2">
                <summary className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                  خاصية لا يسجّلها هذا المنتج بعد ({unrecorded.length})
                </summary>
                <div className="mt-2 space-y-1.5">
                  {unrecorded.map((candidate) => (
                    <label
                      key={candidate.key}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input type="radio" name="picked" value={candidate.key} />
                      <span>
                        {candidate.key}
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          · مستخدمة في {candidate.uses} منتج بهذا القسم
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-sm">
              <input type="radio" name="picked" value="" />
              <span>خاصية أخرى — اكتبها بنفسك</span>
            </label>
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
              اسم الخاصية (لو اخترت «أخرى»)
            </span>
            <input
              name="customAxis"
              placeholder="مثل: عدد الأبواب"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
              قيمة {productSku}
            </span>
            <input
              name="customValue"
              placeholder="اتركها فارغة لاستخدام قيمة المواصفة"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
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
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" name="writeSpec" defaultChecked />
          سجّل هذه القيمة في مواصفات المنتج أيضاً (حتى يظهر الفرق في جدول
          المواصفات ولا يتعارض معه)
        </label>

        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          أنشئ المجموعة وأضف نسخة
        </button>
      </form>

      <p className="sr-only">إنشاء مجموعة للمنتج {productName}</p>
    </section>
  );
}
