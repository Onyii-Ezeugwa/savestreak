export interface YoutubeVideo {
  url: string;
  label: string;
}

interface YoutubeHit {
  id: string;
  title: string;
  channel: string;
}

function clean(value: string) {
  return value.replaceAll("—", ", ").replaceAll("–", ", ").replace(/\s+/g, " ").trim();
}

function decodeJson(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function significant(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

async function searchYoutube(query: string): Promise<YoutubeHit[]> {
  const response = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok) {
    return [];
  }
  const text = await response.text();
  const hits: YoutubeHit[] = [];
  for (const block of text.split('"videoRenderer":').slice(1, 8)) {
    const id = block.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
    const title = block.match(/"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/)?.[1];
    const channel = block.match(/"ownerText":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/)?.[1];
    if (!id || !title || hits.some((hit) => hit.id === id)) {
      continue;
    }
    hits.push({
      id,
      title: clean(decodeJson(title)),
      channel: clean(decodeJson(channel ?? "")),
    });
    if (hits.length === 5) {
      break;
    }
  }
  return hits;
}

export async function findYoutubeVideo(title: string, channel: string): Promise<YoutubeVideo | null> {
  const query = clean([title, channel].filter(Boolean).join(" ")).slice(0, 120);
  if (query.length < 3) {
    return null;
  }
  let hits: YoutubeHit[] = [];
  try {
    hits = await searchYoutube(query);
  } catch {
    return null;
  }
  if (hits.length === 0) {
    return null;
  }

  const wanted = significant(title);
  const channelKey = channel.toLowerCase().slice(0, 12);
  let best = hits[0]!;
  let bestScore = -1;
  for (const hit of hits) {
    const words = new Set(significant(hit.title));
    let score = wanted.filter((word) => words.has(word)).length;
    if (channelKey && hit.channel.toLowerCase().includes(channelKey)) {
      score += 3;
    }
    if (score > bestScore) {
      best = hit;
      bestScore = score;
    }
  }

  const label = best.channel ? `${best.title} by ${best.channel}` : best.title;
  return {
    url: `https://www.youtube.com/watch?v=${best.id}`,
    label: label.slice(0, 140),
  };
}
