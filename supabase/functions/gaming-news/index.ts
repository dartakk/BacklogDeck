import { XMLParser } from "https://esm.sh/fast-xml-parser@4.5.3";

const feeds = [
  { source: "Eurogamer", url: "https://www.eurogamer.net/feed" },
  {
    source: "Rock Paper Shotgun",
    url: "https://www.rockpapershotgun.com/feed",
  },
  { source: "GamesIndustry.biz", url: "https://www.gamesindustry.biz/feed" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  time: string;
  imageUrl: string;
  url: string;
}

function list<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function categorize(title: string, categories: string[]) {
  const searchableText = `${title} ${categories.join(" ")}`.toLowerCase();
  if (
    searchableText.includes("hardware") ||
    searchableText.includes("console")
  ) {
    return "Hardware";
  }
  if (/\b(rumou?r|leak|reportedly|report says)\b/.test(searchableText)) {
    return "Rumor";
  }
  if (
    /\b(announce|announced|reveals?|launch|release date)\b/.test(searchableText)
  ) {
    return "Annunci";
  }
  return "News";
}

function normalizeFeed(source: string, xml: string): NewsItem[] {
  const channel = parser.parse(xml).rss?.channel;
  const items = list<Record<string, unknown>>(channel?.item);

  return items.flatMap((item) => {
    const title = String(item.title ?? "").trim();
    const url = String(item.link ?? "").trim();
    const publishedAt = Date.parse(String(item.pubDate ?? ""));
    if (!title || !url || !Number.isFinite(publishedAt)) return [];

    const media = item["media:content"] as Record<string, unknown> | undefined;
    const imageUrl = String(media?.["@_url"] ?? "");
    const categories = list(item.category as string | string[] | undefined).map(
      String,
    );

    return [
      {
        id: String(item.guid ?? url),
        title,
        source,
        category: categorize(title, categories),
        time: new Date(publishedAt).toISOString(),
        imageUrl,
        url,
      },
    ];
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return Response.json(
      { error: "Metodo non supportato." },
      { status: 405, headers: corsHeaders },
    );
  }

  const results = await Promise.allSettled(
    feeds.map(async ({ source, url }) => {
      const response = await fetch(url, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) throw new Error(`${source} RSS: ${response.status}`);
      return normalizeFeed(source, await response.text());
    }),
  );

  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (items.length === 0) {
    console.error("Nessun feed gaming disponibile:", results);
    return Response.json(
      { error: "Le fonti di notizie non sono al momento raggiungibili." },
      { status: 502, headers: corsHeaders },
    );
  }

  const uniqueItems = [
    ...new Map(items.map((item) => [item.url, item])).values(),
  ]
    .sort((left, right) => Date.parse(right.time) - Date.parse(left.time))
    .slice(0, 40);

  return Response.json(
    { items: uniqueItems },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
});
