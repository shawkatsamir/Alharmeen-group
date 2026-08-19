import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface Campaign {
  id: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  tone: "primary" | "accent";
}

/**
 * Editorial banner pair, in the spirit of awadserag's "أساسيات المطبخ" blocks.
 * Typographic by design so it needs no artwork — swap in images later without
 * changing the layout.
 */
export function CampaignBand({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href={campaign.href}
          className={`group/campaign relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-shadow hover:shadow-lg sm:p-8 ${
            campaign.tone === "primary"
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground"
          }`}
        >
          {/* Decorative bleed, keeps the block from reading as a flat rectangle. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-white/10"
          />
          <div className="relative">
            <p className="text-xl font-bold sm:text-2xl">{campaign.title}</p>
            <p className="mt-2 max-w-sm text-sm opacity-90">{campaign.body}</p>
          </div>
          <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold">
            {campaign.cta}
            <ArrowLeft className="h-4 w-4 transition-transform group-hover/campaign:-translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}
