import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/account/", "/cart/", "/checkout/"],
    },
    sitemap: "https://alharmaingroup.com/sitemap.xml",
  };
}
