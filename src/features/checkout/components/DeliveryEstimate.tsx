"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Truck } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import {
  getCartDeliveryTiers,
  getShippingOptions,
} from "@/services/client/shipping";
import {
  effectiveDistanceKm,
  fallbackGovernorateCost,
  quoteDelivery,
  resolveDeliveryTier,
} from "../lib/shipping";

const STORAGE_KEY = "delivery-locality-id";

/*
 * localStorage read through useSyncExternalStore rather than a useEffect that
 * calls setState: the effect version triggers a cascading render on every
 * mount, which is what `react-hooks/set-state-in-effect` flags. The server
 * snapshot is null, so the prerendered HTML and the first client render agree.
 */
let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners = [...listeners, onChange];
  window.addEventListener("storage", onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredLocality(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

function writeStoredLocality(id: number) {
  window.localStorage.setItem(STORAGE_KEY, String(id));
  // The storage event only fires in *other* tabs, so notify this one directly.
  listeners.forEach((l) => l());
}

/**
 * "Is it worth buying this here?" answered on the product page.
 *
 * Delivery to a far village can be a meaningful fraction of a small
 * appliance's price, and finding that out four steps into checkout is the
 * wrong time. This surfaces it next to the price.
 *
 * MUST stay a client component. `/product/[slug]` is ISR (revalidate = 3600);
 * reading the chosen locality from a cookie in the RSC would force dynamic
 * rendering and lose static generation for every product page. localStorage
 * plus a client fetch keeps the page static. Same shape as LivePrice.
 */
export function DeliveryEstimate({
  productId,
  price,
}: {
  productId: string;
  price: number;
}) {
  const stored = useSyncExternalStore(
    subscribe,
    readStoredLocality,
    () => null,
  );
  const parsed = stored === null ? NaN : Number(stored);
  const localityId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  const { data: shipping } = useQuery({
    queryKey: ["shipping-options"],
    queryFn: getShippingOptions,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tiers } = useQuery({
    queryKey: ["cart-delivery-tiers", [productId]],
    queryFn: () =>
      getCartDeliveryTiers([productId], shipping?.fallbackTierKey ?? "small"),
    enabled: !!shipping,
    staleTime: 5 * 60 * 1000,
  });

  // Nothing to show until the shared config has loaded.
  if (!shipping) return null;

  const locality = shipping.localities.find((l) => l.id === localityId);

  let body: React.ReactNode;

  if (!locality) {
    body = (
      <span className="text-muted-foreground">
        اختر مدينتك لمعرفة تكلفة التوصيل
      </span>
    );
  } else {
    const tier = resolveDeliveryTier(tiers ?? [], shipping.tiers);
    const distanceKm = effectiveDistanceKm({
      straightKm: locality.straight_km,
      overrideKm: locality.distance_km_override,
      roadFactor: shipping.roadFactor,
    });

    if (distanceKm === null || !tier) {
      const governorate = shipping.governorates.find(
        (g) => g.id === locality.governorate_id,
      );
      const cost = fallbackGovernorateCost(governorate?.shipping_cost ?? 0);
      body = (
        <span>
          التوصيل إلى {locality.name_ar}:{" "}
          <span className="font-bold text-primary">{formatCurrency(cost)}</span>
        </span>
      );
    } else {
      const quote = quoteDelivery({
        distanceKm,
        tier,
        // A single unit — the real cart may qualify for a free-shipping band
        // this one does not, so the checkout figure can only go down.
        subtotal: price,
        rules: shipping.rules,
        maxDeliveryKm: shipping.maxDeliveryKm,
      });

      body = quote.isOutOfRange ? (
        <span className="text-amber-600">
          {locality.name_ar} خارج نطاق التوصيل — تواصل معنا للاتفاق
        </span>
      ) : (
        <span>
          التوصيل إلى {locality.name_ar}:{" "}
          <span className="font-bold text-primary">
            {quote.isFree ? "مجاني" : formatCurrency(quote.cost)}
          </span>
          <span className="text-muted-foreground"> · {quote.distanceKm} كم</span>
        </span>
      );
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
      <div className="flex items-start gap-2">
        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>{body}</div>

          <Select
            dir="rtl"
            value={localityId ? String(localityId) : ""}
            onValueChange={(value) => writeStoredLocality(Number(value))}
          >
            <SelectTrigger className="h-8 text-xs">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <SelectValue placeholder="اختر المدينة" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {shipping.governorates.map((governorate) => {
                const options = shipping.localities.filter(
                  (l) => l.governorate_id === governorate.id,
                );
                if (options.length === 0) return null;
                return (
                  <SelectGroupBlock
                    key={governorate.id}
                    label={governorate.name_ar}
                    options={options}
                  />
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/** Flat items under a governorate heading — the list spans 27 governorates. */
function SelectGroupBlock({
  label,
  options,
}: {
  label: string;
  options: { id: number; name_ar: string }[];
}) {
  return (
    <>
      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      {options.map((locality) => (
        <SelectItem key={locality.id} value={String(locality.id)}>
          {locality.name_ar}
        </SelectItem>
      ))}
    </>
  );
}
