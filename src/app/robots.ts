import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El panel y las APIs no tienen nada que buscar. Las encuestas
        // se comparten por link a quien participó: no queremos que un
        // desconocido llegue a contestarlas desde Google.
        disallow: ["/admin", "/api", "/encuesta"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
