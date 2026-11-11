import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_key?: string;
    osm_value?: string;
  };
};

function formatSuggestion(p: PhotonFeature["properties"]): string | null {
  if (!p) return null;
  const name = p.name?.trim();
  if (!name) return null;
  const locality = p.city || p.district || p.county;
  const provinceOrState = p.county && p.city ? p.county : p.state;
  const parts = [name];
  if (locality) parts.push(`in ${locality}`);
  const tail = [provinceOrState, p.country].filter(Boolean).join(", ");
  if (tail && tail !== locality) parts.push(tail);
  // Avoid duplicates like "X in Perugia Perugia, Italy"
  return parts
    .join(", ")
    .replace(/,\s*in\s+/g, " in ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("lang", "it");
  url.searchParams.set("limit", "6");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "catechismo-app/1.0 (local parish lookup)",
      },
      // small timeout via AbortController not critical; keep simple
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const f of data.features || []) {
      const label = formatSuggestion(f.properties);
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(label);
      if (suggestions.length >= 5) break;
    }
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
