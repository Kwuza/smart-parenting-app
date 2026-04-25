export type RecommendationCategory =
  | "screen_time"
  | "sleep"
  | "meal"
  | "education"
  | "physical_activity"
  | "general";

export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationInsightType = "risk" | "opportunity" | "follow_up" | "positive";
export type RecommendationTrend = "worsening" | "stable" | "improving" | null;

export interface NormalizedRecommendation {
  content: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  insight_type: RecommendationInsightType;
  trend: RecommendationTrend;
}

type CategoryAlias = RecommendationCategory | "ambiguous";

interface WeightedPattern {
  pattern: RegExp;
  weight: number;
}

interface CategoryEvidence {
  category: Exclude<RecommendationCategory, "general">;
  index: number;
  weight: number;
}

const CATEGORY_ALIASES: Record<string, CategoryAlias> = {
  screen: "screen_time",
  screens: "screen_time",
  screen_time: "screen_time",
  screentime: "screen_time",
  device: "screen_time",
  digital: "screen_time",

  sleep: "sleep",
  nap: "sleep",
  naps: "sleep",
  bedtime: "sleep",

  meal: "meal",
  meals: "meal",
  nutrition: "meal",
  nutritional: "meal",
  food: "meal",
  feeding: "meal",

  education: "education",
  educational: "education",
  learning: "education",
  learn: "education",
  school: "education",

  physical: "physical_activity",
  physical_activity: "physical_activity",
  physical_activity_time: "physical_activity",
  exercise: "physical_activity",
  movement: "physical_activity",
  motor: "physical_activity",

  activity: "ambiguous",
  activities: "ambiguous",
  active: "ambiguous",

  general: "general",
  routine: "general",
  schedule: "general",
  scheduled: "general",
};

const CATEGORY_PATTERNS: Record<Exclude<RecommendationCategory, "general">, WeightedPattern[]> = {
  screen_time: [
    { pattern: /\bscreen\s*time\b/i, weight: 7 },
    { pattern: /\b(tablet|phone|tv|television|device|devices|digital|video|videos|youtube|media)\b/i, weight: 3 },
    { pattern: /\b(game|games|gaming)\b/i, weight: 2 },
  ],
  sleep: [
    { pattern: /\bsleep(?:ing)?\b|\bslept\b/i, weight: 7 },
    { pattern: /\bbed\s*time\b|\bbedtime\b|\bwake(?:-?up)?\b|\bnight(?:ly)?\b/i, weight: 4 },
    { pattern: /\bnap(?:s|ping)?\b/i, weight: 4 },
  ],
  meal: [
    { pattern: /\bmeal(?:s)?\b|\bnutrition(?:al)?\b|\bfeeding\b/i, weight: 7 },
    { pattern: /\bfood(?:s)?\b|\bbreakfast\b|\blunch\b|\bdinner\b|\bsnack(?:s)?\b/i, weight: 4 },
    { pattern: /\bfruit(?:s)?\b|\bvegetable(?:s)?\b|\bprotein\b|\bdairy\b|\bgrain(?:s)?\b|\bwater\b/i, weight: 3 },
  ],
  education: [
    { pattern: /\beducation(?:al)?\b|\blearning\b|\blearn\b/i, weight: 7 },
    { pattern: /\bread(?:ing)?\b|\bhomework\b|\bschool\b|\balphabet\b|\bmath\b|\bscience\b|\bsubject(?:s)?\b/i, weight: 4 },
    { pattern: /\bmusic\b|\bart\b|\bwriting\b|\bletter(?:s)?\b|\bnumber(?:s)?\b/i, weight: 3 },
  ],
  physical_activity: [
    { pattern: /\bphysical\s+activit(?:y|ies)\b/i, weight: 8 },
    { pattern: /\bactive\s+play\b|\boutdoor\s+play\b|\bplayground\b/i, weight: 5 },
    { pattern: /\bexercise\b|\bsport(?:s)?\b|\brunning\b|\bswimming\b|\bcycling\b|\bdancing\b/i, weight: 5 },
    { pattern: /\btummy\s+time\b|\bwalking\s+practice\b|\bmotor\b|\bcoordination\b|\bmovement\b/i, weight: 4 },
  ],
};

const CATEGORY_PRECEDENCE: Exclude<RecommendationCategory, "general">[] = [
  "screen_time",
  "sleep",
  "meal",
  "education",
  "physical_activity",
];

const VALID_PRIORITIES: RecommendationPriority[] = ["high", "medium", "low"];
const VALID_INSIGHT_TYPES: RecommendationInsightType[] = ["risk", "opportunity", "follow_up", "positive"];
const VALID_TRENDS: Exclude<RecommendationTrend, null>[] = ["worsening", "stable", "improving"];

function normalizeKey(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s-]+/g, "_")
    : "";
}

function findFirstCategoryEvidence(content: string): CategoryEvidence | null {
  let best: CategoryEvidence | null = null;

  for (const category of CATEGORY_PRECEDENCE) {
    for (const { pattern, weight } of CATEGORY_PATTERNS[category]) {
      const match = content.match(pattern);
      if (match?.index === undefined) {
        continue;
      }

      if (
        best === null ||
        match.index < best.index ||
        (match.index === best.index && weight > best.weight)
      ) {
        best = { category, index: match.index, weight };
      }
    }
  }

  return best;
}

function splitEvidenceSegments(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+|[\r\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function inferCategory(content: string): RecommendationCategory {
  for (const segment of splitEvidenceSegments(content)) {
    const evidence = findFirstCategoryEvidence(segment);
    if (evidence !== null) {
      return evidence.category;
    }
  }

  return findFirstCategoryEvidence(content)?.category ?? "general";
}

export function normalizeRecommendationCategory(
  rawCategory: unknown,
  content: string
): RecommendationCategory {
  const normalizedKey = normalizeKey(rawCategory);
  const alias = CATEGORY_ALIASES[normalizedKey];
  const inferred = inferCategory(content);

  if (!alias || alias === "ambiguous") {
    return inferred;
  }

  if (alias === "general") {
    return inferred === "general" ? "general" : inferred;
  }

  if (inferred !== "general" && inferred !== alias) {
    return inferred;
  }

  return alias;
}

function normalizePriority(value: unknown): RecommendationPriority {
  const key = normalizeKey(value);
  return VALID_PRIORITIES.includes(key as RecommendationPriority)
    ? (key as RecommendationPriority)
    : "medium";
}

function normalizeInsightType(value: unknown, priority: RecommendationPriority): RecommendationInsightType {
  const key = normalizeKey(value);
  if (VALID_INSIGHT_TYPES.includes(key as RecommendationInsightType)) {
    return key as RecommendationInsightType;
  }
  return priority === "high" ? "risk" : priority === "low" ? "positive" : "opportunity";
}

function normalizeTrend(value: unknown): RecommendationTrend {
  const key = normalizeKey(value);
  if (key === "" || key === "null" || key === "none") {
    return null;
  }
  return VALID_TRENDS.includes(key as Exclude<RecommendationTrend, null>)
    ? (key as Exclude<RecommendationTrend, null>)
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeRecommendation(raw: unknown): NormalizedRecommendation | null {
  const rec = asRecord(raw);
  if (!rec || typeof rec.content !== "string") {
    return null;
  }

  const content = rec.content.trim();
  if (!content) {
    return null;
  }

  const priority = normalizePriority(rec.priority);

  return {
    content,
    category: normalizeRecommendationCategory(rec.category, content),
    priority,
    insight_type: normalizeInsightType(rec.insight_type, priority),
    trend: normalizeTrend(rec.trend),
  };
}

export function normalizeRecommendations(rawRecommendations: unknown): NormalizedRecommendation[] {
  if (!Array.isArray(rawRecommendations)) {
    return [];
  }

  return rawRecommendations
    .map((raw) => normalizeRecommendation(raw))
    .filter((rec): rec is NormalizedRecommendation => rec !== null)
    .slice(0, 3);
}
