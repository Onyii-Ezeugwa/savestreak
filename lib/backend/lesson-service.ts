import { getModelQueue } from "@/lib/openrouter";
import { CATEGORY_LABELS } from "./habits";
import { LESSONS } from "./lessons-catalog";
import type { LessonRecord } from "./habit-types";
import type { DataStore } from "./store";
import { ApiError } from "./types";
import { findYoutubeVideo } from "./youtube";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function contextHash(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function plain(value: string) {
  return value.replaceAll("—", ", ").replaceAll("–", ", ").trim();
}

function isWatchUrl(url: string) {
  return /[?&]v=[\w-]{11}\b/.test(url) || /youtu\.be\/[\w-]{11}/.test(url);
}

async function fallbackLesson(input: {
  userId: string;
  contextKey: string;
  topics: string[];
}): Promise<LessonRecord> {
  const topic = input.topics[0] ?? "beginner";
  const match =
    LESSONS.find((lesson) => lesson.topics.includes(topic)) ?? LESSONS[0]!;
  const video = await findYoutubeVideo(match.title, "");
  return {
    ...match,
    id: `ai-${input.userId}-${contextHash(input.contextKey)}`,
    youtubeUrl: video?.url ?? "",
    youtubeLabel: video?.label ?? "",
    contextKey: input.contextKey,
  };
}

async function writeLesson(facts: string, videoHint: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  for (const model of getModelQueue()) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://savestreak.org",
          "X-Title": "$aveStreak",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You write a short financial lesson for a college student. Return ONLY JSON. Do not give investment, credit, tax, or professional financial advice. Do not use em dashes. Never mention being an AI model. Do not return a YouTube URL or a video id. Name one real, specific video and its channel.",
            },
            {
              role: "user",
              content: `${facts}

Return JSON:
{
  "title": "short lesson title",
  "body": "three short paragraphs separated by a blank line, readable in about 5 minutes",
  "takeaway": "one sentence the student can remember",
  "videoTitle": "the exact title of one real YouTube video that teaches this idea",
  "videoChannel": "the channel that published that video"
}

Name a specific video, not a topic. The lesson should fit this situation: ${videoHint}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start === -1 || end === -1) {
        continue;
      }
      const parsed = JSON.parse(content.slice(start, end + 1)) as {
        title?: string;
        body?: string;
        takeaway?: string;
        videoTitle?: string;
        videoChannel?: string;
      };
      if (!parsed.title?.trim() || !parsed.body?.trim() || !parsed.takeaway?.trim()) {
        continue;
      }
      return {
        title: plain(parsed.title).slice(0, 80),
        body: plain(parsed.body),
        takeaway: plain(parsed.takeaway).slice(0, 240),
        videoTitle: plain(parsed.videoTitle || "").slice(0, 120),
        videoChannel: plain(parsed.videoChannel || "").slice(0, 80),
      };
    } catch {
      // Try the next model, then the saved lesson text.
    }
  }
  return null;
}

async function nameVideo(title: string, takeaway: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  for (const model of getModelQueue()) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://savestreak.org",
          "X-Title": "$aveStreak",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Return ONLY JSON. Name one real YouTube video a college student can watch. Do not return a URL or a video id. Do not give financial advice. Do not use em dashes.",
            },
            {
              role: "user",
              content: `Lesson: ${title}
Takeaway: ${takeaway}

Return JSON:
{"videoTitle":"exact title of one specific real video","videoChannel":"channel name"}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start === -1 || end === -1) {
        continue;
      }
      const parsed = JSON.parse(content.slice(start, end + 1)) as {
        videoTitle?: string;
        videoChannel?: string;
      };
      if (!parsed.videoTitle?.trim()) {
        continue;
      }
      return {
        videoTitle: plain(parsed.videoTitle).slice(0, 120),
        videoChannel: plain(parsed.videoChannel || "").slice(0, 80),
      };
    } catch {
      // Try the next model.
    }
  }
  return null;
}

async function specificVideo(lesson: LessonRecord): Promise<LessonRecord> {
  if (isWatchUrl(lesson.youtubeUrl)) {
    return lesson;
  }
  const named = await nameVideo(lesson.title, lesson.takeaway);
  const video =
    (named && (await findYoutubeVideo(named.videoTitle, named.videoChannel))) ||
    (await findYoutubeVideo(lesson.title, ""));
  if (!video) {
    return lesson;
  }
  return { ...lesson, youtubeUrl: video.url, youtubeLabel: video.label };
}

function toPublic(lesson: LessonRecord) {
  return {
    id: lesson.id,
    title: lesson.title,
    body: lesson.body,
    takeaway: lesson.takeaway,
    topics: lesson.topics,
    minutes: lesson.minutes,
    youtubeUrl: lesson.youtubeUrl,
    youtubeLabel: lesson.youtubeLabel,
  };
}

export async function recommendLessons(store: DataStore, userId: string) {
  const [expenses, statements, goals, reads, lessonRows, keeps] = await Promise.all([
    store.listExpenses(userId),
    store.listStatementTransactions(userId),
    store.listGoals(userId),
    store.listLessonReads(userId),
    store.listLessons(),
    store.listLessonSaves(userId),
  ]);

  const spending = new Map<string, number>();
  for (const expense of [...expenses, ...statements]) {
    spending.set(
      expense.category,
      (spending.get(expense.category) ?? 0) + expense.amountCents,
    );
  }
  const ranked = [...spending.entries()].sort((a, b) => b[1] - a[1]);
  const topics = ranked.slice(0, 2).map(([category]) => category);
  if (goals.length > 0) {
    topics.push("goals");
  }
  const enoughData = spending.size > 0 || goals.length > 0;
  const contextTopics = enoughData ? topics : ["beginner"];
  const contextKey = [
    contextTopics.join(","),
    goals
      .map((goal) => goal.name.trim().toLowerCase())
      .sort()
      .join(","),
  ].join("|");
  const lessonId = `ai-${userId}-${contextHash(contextKey)}`;
  const existing = lessonRows.find(
    (lesson) => lesson.id === lessonId && lesson.contextKey === contextKey,
  );

  let lesson = existing ?? null;
  if (!lesson) {
    const spendingLines =
      ranked.length === 0
        ? "No spending has been captured yet."
        : ranked
            .slice(0, 4)
            .map(
              ([category, cents]) =>
                `${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}: $${(cents / 100).toFixed(2)}`,
            )
            .join("\n");
    const goalLines =
      goals.length === 0
        ? "No savings goals yet."
        : goals
            .slice(0, 3)
            .map(
              (goal) =>
                `${goal.name}, target $${(goal.targetAmountCents / 100).toFixed(0)}`,
            )
            .join("\n");
    const videoHint = enoughData
      ? `a lesson about ${contextTopics.join(" and ")} for a student`
      : "a beginner lesson about noticing where money goes";
    const written = await writeLesson(
      `Spending so far:\n${spendingLines}\n\nSavings goals:\n${goalLines}`,
      videoHint,
    );
    const video = written
      ? (await findYoutubeVideo(written.videoTitle, written.videoChannel)) ||
        (await findYoutubeVideo(written.title, ""))
      : null;
    lesson = written
      ? {
          id: lessonId,
          title: written.title,
          body: written.body,
          takeaway: written.takeaway,
          topics: contextTopics,
          minutes: 5,
          youtubeUrl: video?.url ?? "",
          youtubeLabel: video?.label ?? "",
          contextKey,
        }
      : await fallbackLesson({ userId, contextKey, topics: contextTopics });
    await store.saveLessons([lesson]);
  }

  const prefix = `ai-${userId}-`;
  const readIds = new Set(reads.map((read) => read.lessonId));
  const keepIds = new Set(keeps.map((item) => item.lessonId));
  const pool = [
    lesson,
    ...lessonRows.filter(
      (item) =>
        item.id !== lesson.id &&
        (item.id.startsWith(prefix) || readIds.has(item.id) || keepIds.has(item.id)),
    ),
  ];
  const upgraded = await Promise.all(pool.map((item) => specificVideo(item)));
  const changed = upgraded.filter(
    (item, index) => item.youtubeUrl !== pool[index]?.youtubeUrl,
  );
  if (changed.length > 0) {
    await store.saveLessons(changed);
  }
  const current = upgraded[0] ?? lesson;
  const readTime = new Map(reads.map((read) => [read.lessonId, read.readAt]));
  const keepTime = new Map(keeps.map((item) => [item.lessonId, item.savedAt]));
  const earlier = upgraded
    .filter((item) => item.id !== current.id)
    .sort((a, b) => (readTime.get(b.id) ?? "").localeCompare(readTime.get(a.id) ?? ""));
  const savedLessons = upgraded
    .filter((item) => keepIds.has(item.id))
    .sort((a, b) => (keepTime.get(b.id) ?? "").localeCompare(keepTime.get(a.id) ?? ""));

  return {
    reason: enoughData ? "matched" : "beginner",
    lessons: [{ ...toPublic(current), saved: keepIds.has(current.id) }],
    earlier: earlier.map((item) => toPublic(item)),
    saved: savedLessons.map((item) => toPublic(item)),
  };
}

export async function setLessonSaved(
  store: DataStore,
  userId: string,
  lessonId: string,
  saved: boolean,
) {
  const lessons = await store.listLessons();
  if (!lessons.some((item) => item.id === lessonId)) {
    throw new ApiError(404, "That lesson was not found.");
  }
  await store.setLessonSaved(
    { userId, lessonId, savedAt: new Date().toISOString() },
    saved,
  );
  return { saved };
}

export async function readLesson(
  store: DataStore,
  userId: string,
  lessonId: string,
) {
  const lessons = await store.listLessons();
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    throw new ApiError(404, "That lesson was not found.");
  }
  const next = await specificVideo(lesson);
  if (next.youtubeUrl !== lesson.youtubeUrl) {
    await store.saveLessons([next]);
  }
  const readAt = new Date().toISOString();
  await store.markLessonRead({ userId, lessonId, readAt });
  const keeps = await store.listLessonSaves(userId);
  return {
    lesson: toPublic(next),
    readAt,
    saved: keeps.some((item) => item.lessonId === lessonId),
  };
}
