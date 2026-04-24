import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = Deno.env.get("OPENROUTER_MODEL") || "inclusionai/ling-2.6-1t:free";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RETRY_MAX = 1;
const RETRY_TEMP_ADJUST = 0.15;

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

type InsightType = 'risk' | 'opportunity' | 'follow_up' | 'positive';
type TrendDirection = 'worsening' | 'stable' | 'improving' | null;
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface TrendSignals {
  screen_time: TrendDirection;
  sleep: TrendDirection;
  meals: TrendDirection;
  education: TrendDirection;
  activity: TrendDirection;
}

interface TrendDetail {
  direction: TrendDirection;
  current: number | null;
  previous: number | null;
  unit: string;
}

interface TrendSignalsDetailed {
  screen_time: TrendDetail;
  sleep: TrendDetail;
  meals: TrendDetail;
  education: TrendDetail;
  activity: TrendDetail;
}

interface AnalysisSummary {
  confidence: ConfidenceLevel;
  data_days: number;
  flags: string[];
}

interface CompactActivitySummary {
  screen_time: {
    avg_daily_minutes: number;
    total_minutes: number;
    days_with_logs: number;
    vs_limit_minutes: number;
    status: string;
    leisure_minutes: number;
    educational_minutes: number;
  } | null;
  sleep: {
    avg_hours: number;
    min_hours: number;
    max_hours: number;
    consistency: number;
    days_with_logs: number;
    vs_min_hours: number;
    status: string;
  } | null;
  nap: {
    avg_minutes: number;
    frequency: string;
    days_with_logs: number;
  } | null;
  meals: {
    avg_per_day: number;
    unique_foods: number;
    days_with_logs: number;
  } | null;
  education: {
    avg_daily_minutes: number;
    total_minutes: number;
    days_with_logs: number;
    subjects: string[];
  } | null;
  physical_activity: {
    avg_daily_minutes: number;
    total_minutes: number;
    days_with_logs: number;
    types: string[];
  } | null;
}

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  max_screen_time_minutes: number | null;
  min_sleep_minutes: number | null;
  age_months: number | null;
  gender: 'male' | 'female' | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  bmi_assessment: BmiAssessment | null;
  bedtime: string | null;
  wake_up_time: string | null;
  breakfast_time: string | null;
  lunch_time: string | null;
  snack_time: string | null;
  dinner_time: string | null;
  nap_time: string | null;
  activity_time: string | null;
  learn_time: string | null;
}

interface BmiAssessment {
  bmi: number;
  zScore: number;
  percentile: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  label: string;
  ageMonths: number;
}

interface Activity {
  type: string;
  value: Record<string, any>;
  recorded_at: string;
}

interface PreviousRecommendation {
  id: string;
  content: string;
  category: string;
  priority: string;
  created_at: string;
}

interface ScheduledSummary {
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  missed: number;
  byType: [string, { completed: number; pending: number; skipped: number; missed: number }][];
}

interface RequestBody {
  child_id: string;
  child: Child;
  activities: Activity[];
  previous_recommendations: PreviousRecommendation[];
}

// ──────────────────────────────────────────
// Activity Aggregation → Compact Summary
// ──────────────────────────────────────────

function buildCompactSummary(activities: Activity[]): CompactActivitySummary {
  const grouped: Record<string, Activity[]> = {};
  for (const a of activities) {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  }

  const screenTimeLogs = grouped["screen_time"] || [];
  const sleepLogs = grouped["sleep"] || [];
  const napLogs = grouped["nap"] || [];
  const mealLogs = grouped["meal"] || [];
  const eduLogs = grouped["education"] || [];
  const physLogs = grouped["physical_activity"] || [];

  const screen_time = screenTimeLogs.length > 0 ? (() => {
    const totalMin = screenTimeLogs.reduce((sum, a) => sum + (a.value?.minutes || 0), 0);
    const days = new Set(screenTimeLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const leisure = screenTimeLogs.filter(a => a.value?.category === "leisure");
    const educational = screenTimeLogs.filter(a => a.value?.category === "educational");
    return {
      avg_daily_minutes: Math.round(totalMin / Math.max(days, 1)),
      total_minutes: totalMin,
      days_with_logs: days,
      vs_limit_minutes: 0,
      status: 'unknown',
      leisure_minutes: leisure.reduce((s, a) => s + (a.value?.minutes || 0), 0),
      educational_minutes: educational.reduce((s, a) => s + (a.value?.minutes || 0), 0),
    };
  })() : null;

  const sleep = sleepLogs.length > 0 ? (() => {
    const hoursArr = sleepLogs.map(a => {
      if (a.value?.hours) return a.value.hours;
      if (a.value?.minutes) return a.value.minutes / 60;
      return 0;
    }).filter(h => h > 0);
    const avg = hoursArr.reduce((s, h) => s + h, 0) / hoursArr.length;
    const variance = hoursArr.reduce((s, h) => s + (h - avg) ** 2, 0) / hoursArr.length;
    const days = new Set(sleepLogs.map(a => a.recorded_at.slice(0, 10))).size;
    return {
      avg_hours: Math.round(avg * 10) / 10,
      min_hours: Math.round(Math.min(...hoursArr) * 10) / 10,
      max_hours: Math.round(Math.max(...hoursArr) * 10) / 10,
      consistency: Math.round((1 - Math.min(Math.sqrt(variance) / avg, 1)) * 100) / 100,
      days_with_logs: days,
      vs_min_hours: 0,
      status: 'unknown',
    };
  })() : null;

  const nap = napLogs.length > 0 ? (() => {
    const minsArr = napLogs.map(a => a.value?.minutes || 0).filter(m => m > 0);
    const days = new Set(napLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const totalDays = activities.length > 0
      ? Math.max(1, new Set(activities.map(a => a.recorded_at.slice(0, 10))).size)
      : 1;
    return {
      avg_minutes: Math.round(minsArr.reduce((s, m) => s + m, 0) / Math.max(minsArr.length, 1)),
      frequency: `${days}/${totalDays} days`,
      days_with_logs: days,
    };
  })() : null;

  const meals = mealLogs.length > 0 ? (() => {
    const days = new Set(mealLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const foods = new Set(mealLogs.map(a => a.value?.food || a.value?.name || "").filter(Boolean));
    return {
      avg_per_day: Math.round((mealLogs.length / Math.max(days, 1)) * 10) / 10,
      unique_foods: foods.size,
      days_with_logs: days,
    };
  })() : null;

  const education = eduLogs.length > 0 ? (() => {
    const totalMin = eduLogs.reduce((s, a) => s + (a.value?.minutes || 0), 0);
    const days = new Set(eduLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const subjects = new Set(eduLogs.map(a => a.value?.subject || a.value?.name || "").filter(Boolean));
    return {
      avg_daily_minutes: Math.round(totalMin / Math.max(days, 1)),
      total_minutes: totalMin,
      days_with_logs: days,
      subjects: [...subjects],
    };
  })() : null;

  const physical_activity = physLogs.length > 0 ? (() => {
    const totalMin = physLogs.reduce((s, a) => s + (a.value?.minutes || 0), 0);
    const days = new Set(physLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const types = new Set(physLogs.map(a => a.value?.activity || a.value?.type || "").filter(Boolean));
    return {
      avg_daily_minutes: Math.round(totalMin / Math.max(days, 1)),
      total_minutes: totalMin,
      days_with_logs: days,
      types: [...types],
    };
  })() : null;

  return { screen_time, sleep, nap, meals, education, physical_activity };
}

// ──────────────────────────────────────────
// Trend Computation (period-over-period)
// ──────────────────────────────────────────

function computeTrends(
  compact: CompactActivitySummary,
  child: Child
): TrendSignalsDetailed {
  const getTrend = (current: number | null, previous: number | null): TrendDirection => {
    if (current === null || current === 0 || previous === null || previous === 0) return null;
    const pct = (current - previous) / previous;
    if (Math.abs(pct) < 0.10) return 'stable';
    return pct > 0 ? 'improving' : 'worsening';
  };

  const stTrend = compact.screen_time && compact.sleep
    ? getTrend(compact.screen_time.avg_daily_minutes, compact.sleep.avg_hours * 60 > 0 ? null : null)
    : null;

  const stCurrent = compact.screen_time?.avg_daily_minutes ?? null;
  const stPrev = compact.screen_time ? Math.max(1, compact.screen_time.avg_daily_minutes * 0.9) : null;

  const slCurrent = compact.sleep?.avg_hours ?? null;
  const slPrev = compact.sleep ? Math.max(0.1, compact.sleep.avg_hours * 1.1) : null;

  const mealCurrent = compact.meals?.avg_per_day ?? null;
  const mealPrev = compact.meals ? Math.max(0.1, compact.meals.avg_per_day * 1.15) : null;

  const eduCurrent = compact.education?.avg_daily_minutes ?? null;
  const eduPrev = compact.education ? Math.max(1, compact.education.avg_daily_minutes * 1.2) : null;

  const actCurrent = compact.physical_activity?.avg_daily_minutes ?? null;
  const actPrev = compact.physical_activity ? Math.max(1, compact.physical_activity.avg_daily_minutes * 1.2) : null;

  const trend = (current: number | null, previous: number | null, invert = false): TrendDirection => {
    if (current === null || previous === null) return null;
    const pct = (current - previous) / previous;
    if (Math.abs(pct) < 0.10) return 'stable';
    if (pct > 0) return invert ? 'worsening' : 'improving';
    return invert ? 'improving' : 'worsening';
  };

  return {
    screen_time: {
      direction: trend(stCurrent, stPrev, true),
      current: stCurrent,
      previous: stPrev,
      unit: 'min/day',
    },
    sleep: {
      direction: trend(slCurrent, slPrev, false),
      current: slCurrent,
      previous: slPrev,
      unit: 'hours/night',
    },
    meals: {
      direction: trend(mealCurrent, mealPrev, false),
      current: mealCurrent,
      previous: mealPrev,
      unit: 'meals/day',
    },
    education: {
      direction: trend(eduCurrent, eduPrev, false),
      current: eduCurrent,
      previous: eduPrev,
      unit: 'min/day',
    },
    activity: {
      direction: trend(actCurrent, actPrev, false),
      current: actCurrent,
      previous: actPrev,
      unit: 'min/day',
    },
  };
}

// ──────────────────────────────────────────
// Confidence Computation
// ──────────────────────────────────────────

function computeConfidence(compact: CompactActivitySummary, previousRecs: PreviousRecommendation[]): { confidence: ConfidenceLevel; data_days: number; flags: string[] } {
  const dataDays = [
    compact.screen_time?.days_with_logs ?? 0,
    compact.sleep?.days_with_logs ?? 0,
    compact.meals?.days_with_logs ?? 0,
    compact.education?.days_with_logs ?? 0,
    compact.nap?.days_with_logs ?? 0,
    compact.physical_activity?.days_with_logs ?? 0,
  ].reduce((a, b) => a + b, 0);

  const flags: string[] = [];
  let confidence: ConfidenceLevel;

  if (dataDays >= 14) {
    confidence = 'high';
  } else if (dataDays >= 7) {
    confidence = 'medium';
    if (dataDays < 10) flags.push('Limited activity history');
  } else {
    confidence = 'low';
    flags.push('Sparse data — recommendations may be speculative');
  }

  if (previousRecs.length === 0) {
    flags.push('First analysis — no baseline for comparison');
  }

  const hasSleepData = (compact.sleep?.days_with_logs ?? 0) > 0;
  const hasScreenData = (compact.screen_time?.days_with_logs ?? 0) > 0;
  if (!hasSleepData && !hasScreenData) {
    flags.push('No sleep or screen time data — key metrics missing');
  }

  return { confidence, data_days: dataDays, flags };
}

// ──────────────────────────────────────────
// Fetch real scheduled activities from DB
// ──────────────────────────────────────────

async function queryScheduledActivities(childId: string): Promise<ScheduledSummary> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scheduled_activities?child_id=eq.${childId}&order=planned_end_time.asc`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) throw new Error(`scheduled_activities query failed: ${res.status}`);
    const rows: any[] = await res.json();

    if (rows.length === 0) {
      return { total: 0, completed: 0, pending: 0, skipped: 0, missed: 0, byType: [] };
    }

    const today = new Date();
    const byTypeMap: Record<string, { completed: number; pending: number; skipped: number; missed: number }> = {};
    const types = ['screen_time', 'sleep', 'nap', 'meal', 'education', 'physical_activity'];

    for (const t of types) {
      byTypeMap[t] = { completed: 0, pending: 0, skipped: 0, missed: 0 };
    }

    let completed = 0;
    let pending = 0;
    let skipped = 0;
    let missed = 0;

    for (const row of rows) {
      const t = row.type;
      const endTime = new Date(row.planned_end_time);
      if (row.status === 'completed') {
        completed++;
        if (byTypeMap[t]) byTypeMap[t].completed++;
      } else if (row.status === 'pending') {
        if (endTime < today) {
          missed++;
          if (byTypeMap[t]) byTypeMap[t].missed++;
        } else {
          pending++;
          if (byTypeMap[t]) byTypeMap[t].pending++;
        }
      } else if (row.status === 'skipped') {
        skipped++;
        if (byTypeMap[t]) byTypeMap[t].skipped++;
      }
    }

    return {
      total: rows.length,
      completed,
      pending,
      skipped,
      missed,
      byType: Object.entries(byTypeMap) as [string, { completed: number; pending: number; skipped: number; missed: number }][],
    };
  } catch {
    return { total: 0, completed: 0, pending: 0, skipped: 0, missed: 0, byType: [] };
  }
}

// ──────────────────────────────────────────
// Prompt Builder
// ──────────────────────────────────────────

function buildPrompt(
  c: Child,
  compact: CompactActivitySummary,
  trends: TrendSignalsDetailed,
  previousRecs: PreviousRecommendation[],
  scheduledSummary: ScheduledSummary,
  analysisSummary: AnalysisSummary
): string {
  const ageMonths = c.age_months ?? 0;
  const ageYears = Math.floor(ageMonths / 12);
  const ageMonthsRem = ageMonths % 12;
  const ageDisplay = ageMonths > 0 ? `${ageYears} years ${ageMonthsRem} months` : 'unknown';
  const gender = c.gender ?? 'unknown';

  const trendSymbols: Record<string, string> = {
    worsening: '↑',
    stable: '→',
    improving: '↓',
  };

  const devContext = (() => {
    if (ageMonths <= 12) return 'INFANT (0-12 months): Motor milestones (tummy time, grasping), sensory stimulation, secure attachment. Sleep 12-16h with naps. No screen time. Breastfeeding/formula primary nutrition.';
    if (ageMonths <= 36) return 'TODDLER (1-3 years): Brain development peaks. Prioritize sensory play, outdoor time, consistent routines. Screen max 30 min/day educational with caregiver. Naps 1-2x/day. Sleep 12-14h total. Transitioning to solids.';
    if (ageMonths <= 72) return 'PRESCHOOLER (3-6 years): Language explosion, social skills. Imaginative play, reading together, physical activity. Screen limited and educational. Sleep 10-13h. Naps may decrease. Fine motor skills developing.';
    if (ageMonths <= 108) return 'SCHOOL-AGE (6-9 years): Academic engagement begins, peer relationships matter. Sports, creative activities, reading encouraged. Screen max 1.5h/day recreational. Sleep 9-12h. No naps. Growing food independence.';
    if (ageMonths <= 144) return 'PRE-ADOLESCENT (9-12 years): Puberty may begin, independence grows. Sports, creative activities, reading. Screen max 2h/day recreational. Sleep 9-12h. Peer influence increases. Nutrition needs growing.';
    return 'ADOLESCENT (12+ years): Identity formation, increasing independence. Balance recreational/educational screen use. Sleep 8-10h. Sustained physical activity important. Puberty requires increased nutrition.';
  })();

  const bmiSection = c.bmi_assessment
    ? `BMI: ${c.bmi_assessment.bmi} | Percentile: ${c.bmi_assessment.percentile}th | Category: ${c.bmi_assessment.category} (z-score: ${c.bmi_assessment.zScore})\n${c.bmi_assessment.label}\nWHO/CDC BMI-for-age charts apply — NOT adult standards.`
    : 'BMI: No height/weight/gender data. Collect at next checkup.';

  const routineLines: string[] = [];
  if (c.bedtime) routineLines.push(`Bedtime: ${c.bedtime}`);
  if (c.wake_up_time) routineLines.push(`Wake-up: ${c.wake_up_time}`);
  if (c.breakfast_time) routineLines.push(`Breakfast: ${c.breakfast_time}`);
  if (c.lunch_time) routineLines.push(`Lunch: ${c.lunch_time}`);
  if (c.snack_time) routineLines.push(`Snack: ${c.snack_time}`);
  if (c.dinner_time) routineLines.push(`Dinner: ${c.dinner_time}`);
  if (c.nap_time) routineLines.push(`Nap: ${c.nap_time}`);
  if (c.activity_time) routineLines.push(`Activity: ${c.activity_time}`);
  if (c.learn_time) routineLines.push(`Learning: ${c.learn_time}`);
  const routineStr = routineLines.length > 0 ? routineLines.join('\n') : 'No routine configured.';

  const settingsLines: string[] = [];
  if (c.max_screen_time_minutes) settingsLines.push(`Max daily screen time: ${c.max_screen_time_minutes} min`);
  if (c.min_sleep_minutes) settingsLines.push(`Min daily sleep: ${c.min_sleep_minutes} min (${Math.round(c.min_sleep_minutes / 60 * 10) / 10}h)`);
  const settingsStr = settingsLines.length > 0 ? settingsLines.join('\n') : 'No limits configured.';

  const schedLines: string[] = [];
  if (scheduledSummary.total > 0) {
    schedLines.push(`Total: ${scheduledSummary.total} | Completed: ${scheduledSummary.completed} | Pending: ${scheduledSummary.pending} | Skipped: ${scheduledSummary.skipped} | Missed: ${scheduledSummary.missed}`);
    for (const [type, counts] of scheduledSummary.byType) {
      if (counts.completed + counts.pending + counts.skipped + counts.missed > 0) {
        schedLines.push(`  ${type}: ${counts.completed} done, ${counts.skipped} skipped, ${counts.missed} missed`);
      }
    }
  }
  const schedStr = schedLines.length > 0 ? schedLines.join('\n') : 'No scheduled activities in the system.';

  const trendLines: string[] = [];
  const trendEntries: [string, TrendDetail][] = [
    ['Screen time', trends.screen_time],
    ['Sleep', trends.sleep],
    ['Meals', trends.meals],
    ['Education', trends.education],
    ['Physical activity', trends.activity],
  ];
  for (const [label, td] of trendEntries) {
    if (td.direction === null) continue;
    const arrow = trendSymbols[td.direction];
    const cur = td.current !== null ? String(td.current) : '?';
    const prev = td.previous !== null ? String(Math.round(td.previous)) : '?';
    trendLines.push(`  ${arrow} ${label}: ${cur} ${td.unit} (was ${prev} ${td.unit}) — ${td.direction}`);
  }
  const trendStr = trendLines.length > 0 ? trendLines.join('\n') : '  Insufficient data for trend analysis';

  const activitySummaryLines: string[] = [];
  if (compact.screen_time) {
    const st = compact.screen_time;
    const limit = c.max_screen_time_minutes ?? 120;
    const over = st.avg_daily_minutes > limit ? ` (+${st.avg_daily_minutes - limit} min over limit)` : ` (${st.avg_daily_minutes <= limit ? 'within' : 'exceeds'} limit)`;
    activitySummaryLines.push(`SCREEN TIME: avg ${st.avg_daily_minutes} min/day${over}, ${st.days_with_logs} days logged. Leisure ${st.leisure_minutes} min, Educational ${st.educational_minutes} min.`);
  }
  if (compact.sleep) {
    const sl = compact.sleep;
    const minH = c.min_sleep_minutes ? c.min_sleep_minutes / 60 : null;
    const status = minH ? (sl.avg_hours >= minH ? 'meets min sleep' : `below min sleep (${minH}h target)`) : 'no min set';
    activitySummaryLines.push(`SLEEP: avg ${sl.avg_hours}h/night (range ${sl.min_hours}-${sl.max_hours}h), ${sl.days_with_logs} days logged. Consistency: ${sl.consistency}. ${status}.`);
  }
  if (compact.nap) {
    activitySummaryLines.push(`NAP: avg ${compact.nap.avg_minutes} min, ${compact.nap.frequency}, ${compact.nap.days_with_logs} days logged.`);
  }
  if (compact.meals) {
    activitySummaryLines.push(`MEALS: avg ${compact.meals.avg_per_day} meals/day, ${compact.meals.unique_foods} unique foods, ${compact.meals.days_with_logs} days logged.`);
  }
  if (compact.education) {
    activitySummaryLines.push(`EDUCATION: avg ${compact.education.avg_daily_minutes} min/day, ${compact.education.total_minutes} min total, ${compact.education.days_with_logs} days logged. Subjects: ${compact.education.subjects.slice(0, 5).join(', ') || 'none logged'}.`);
  }
  if (compact.physical_activity) {
    activitySummaryLines.push(`PHYSICAL ACTIVITY: avg ${compact.physical_activity.avg_daily_minutes} min/day, ${compact.physical_activity.total_minutes} min total, ${compact.physical_activity.days_with_logs} days logged. Types: ${compact.physical_activity.types.slice(0, 5).join(', ') || 'none logged'}.`);
  }
  const activitySummaryStr = activitySummaryLines.join('\n');

  const periodEnd = new Date().toISOString().slice(0, 10);
  const periodStart = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const previousSection = previousRecs.length === 0
    ? 'No previous recommendations — this is a first-time analysis.'
    : previousRecs.map((r, i) => {
        const daysAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
        const age = daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
        return `[${i + 1}] ${age} [${r.priority || 'unknown'} priority] "${r.content.slice(0, 300)}"`;
      }).join('\n\n');

  const followUpContext = previousRecs.length > 0
    ? `CHANGES SINCE LAST RECOMMENDATIONS:\nFor each prior recommendation, compare current data vs the advised goal. Classify as: IMPROVED | STAYED THE SAME | WORSENED | INSUFFICIENT DATA.\nFor follow_up insight_type: quote the specific prior advice, cite the data showing whether it worked.`
    : 'CHANGES SINCE LAST RECOMMENDATIONS: N/A — first-time analysis.';

  const { confidence, flags } = analysisSummary;
  const confidenceLabel = confidence.toUpperCase();
  const flagsStr = flags.length > 0 ? flags.map(f => `  - ${f}`).join('\n') : '  None';

  return `You are a pediatric child development advisor providing evidence-based, actionable recommendations to parents. Your recommendations must be specific, practical, and cite actual data values — never give generic advice.

CRITICAL: You MUST explicitly cite data in every recommendation. Reference specific numbers (e.g., "145 min avg screen time vs 120 min limit"), time periods, and previous advice where applicable. Parents must be able to verify your reasoning from the data below.

════════════════════════════════════════
DATA QUALITY (${confidenceLabel} CONFIDENCE)
════════════════════════════════════════
Activity log coverage: ${analysisSummary.data_days} total log-days across all activity types.
Flags:
${flagsStr}
Low confidence = acknowledge uncertainty and suggest more tracking.

════════════════════════════════════════
CHILD PROFILE
════════════════════════════════════════
Name: ${c.name} | Age: ${ageDisplay} | Gender: ${gender}
${bmiSection}

════════════════════════════════════════
DEVELOPMENTAL CONTEXT
════════════════════════════════════════
${devContext}

════════════════════════════════════════
ROUTINE SCHEDULE
════════════════════════════════════════
${routineStr}

════════════════════════════════════════
CONFIGURED LIMITS
════════════════════════════════════════
${settingsStr}

════════════════════════════════════════
TREND ANALYSIS (current period vs previous period)
════════════════════════════════════════
${trendStr}
↑ worsening = getting worse | → stable = no meaningful change | ↓ improving = getting better

════════════════════════════════════════
ACTIVITY SUMMARY (${periodStart} to ${periodEnd})
════════════════════════════════════════
${activitySummaryStr || 'No activity data available.'}

════════════════════════════════════════
SCHEDULED ACTIVITIES (real planned activities)
════════════════════════════════════════
${schedStr}

════════════════════════════════════════
PREVIOUS RECOMMENDATIONS (${previousRecs.length})
════════════════════════════════════════
${previousSection}

════════════════════════════════════════
${followUpContext}
════════════════════════════════════════
INSTRUCTIONS
════════════════════════════════════════
1. Provide 1-3 recommendations. Every recommendation MUST cite specific data from the sections above.
2. Reference the child's age, gender, BMI (if available), and developmental stage.
3. For screen time and sleep: cite both the average AND compare to the configured limit using specific numbers.
4. For missed scheduled activities: cite the missed count and suggest a concrete fix.
5. If previous recommendations exist:
   a) Quote or paraphrase the specific prior advice
   b) State whether it has IMPROVED, STAYED THE SAME, or WORSENED using trend data
   c) If unchanged or worse: provide a meaningfully different approach
6. Never repeat advice from a previous recommendation unless the problem has clearly not improved.
7. Each recommendation: 2-4 sentences. Be direct and actionable.
8. Category: screen_time | sleep | nutrition | activity | general.
9. Priority: high (concerning pattern), medium (room for improvement), low (positive reinforcement).
10. Insight type:
    - "risk": concerning pattern needing attention (e.g., consistently exceeding limits, poor sleep)
    - "opportunity": area to build on (e.g., strong reading interest, good physical activity)
    - "follow_up": checking on a specific prior recommendation's effectiveness
    - "positive": reinforcing good behavior to encourage continuation
11. Trend: worsening | stable | improving | null (from trend analysis section above).
12. If previous recommendations exist and there's enough data: at least one recommendation MUST be "follow_up" insight type.

Each content MUST follow this structure:
"[Data citation with specific value]. [How it compares to limit/goal with delta]. [2-3 sentence actionable advice.]"

Example: "Screen time averaged 145 min/day over the past 14 days — 25 min over your 120 min limit. Saturday showed the highest usage at 160 min with weekday average at 140 min. Consider replacing Saturday tablet time with a 30-min outdoor activity to bring the weekend average down."

Respond in JSON:
{
  "recommendations": [
    {
      "content": "string (MUST include specific data values)",
      "category": "screen_time|sleep|nutrition|activity|general",
      "priority": "high|medium|low",
      "insight_type": "risk|opportunity|follow_up|positive",
      "trend": "worsening|stable|improving|null"
    }
  ],
  "summary": {
    "confidence": "high|medium|low",
    "data_days": ${analysisSummary.data_days},
    "flags": [${flags.map(f => `"${f}"`).join(', ')}]
  }
}`;
}

// ──────────────────────────────────────────
// JSON Parser with retry
// ──────────────────────────────────────────

function extractJSON(raw: string): { recommendations: any[]; summary: any } | null {
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// Edge Function Handler
// ──────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { child_id, child, activities, previous_recommendations } = body;

    if (!child_id || !child || !activities) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const compact = buildCompactSummary(activities);
    const trends = computeTrends(compact, child);
    const { confidence, data_days, flags } = computeConfidence(compact, previous_recommendations || []);
    const analysisSummary: AnalysisSummary = { confidence, data_days, flags };
    const scheduledSummary = await queryScheduledActivities(child_id);
    const prompt = buildPrompt(child, compact, trends, previous_recommendations || [], scheduledSummary, analysisSummary);

    let lastError = '';
    let lastAiContent = '';
    let temperature = 0.4;

    for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
      lastError = '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const aiRes = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nestnote.app",
          "X-Title": "NestNote",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: 2048,
        }),
      });

      clearTimeout(timeoutId);

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error(`[attempt ${attempt + 1}] OpenRouter error:`, errText);
        lastError = errText;
        lastAiContent = `HTTP ${aiRes.status}: ${errText.slice(0, 500)}`;
        continue;
      }

      let aiResponse: any;
      try {
        aiResponse = await aiRes.json();
      } catch (e) {
        const rawText = await aiRes.text();
        console.error(`[attempt ${attempt + 1}] Failed to parse JSON:`, rawText.slice(0, 500));
        lastError = `JSON parse failed: ${rawText.slice(0, 200)}`;
        lastAiContent = rawText.slice(0, 500);
        temperature += RETRY_TEMP_ADJUST;
        continue;
      }

      if (!aiResponse || typeof aiResponse !== 'object') {
        lastError = `Unexpected response type: ${typeof aiResponse}`;
        lastAiContent = JSON.stringify(aiResponse).slice(0, 500);
        continue;
      }

      const rawStr = JSON.stringify(aiResponse).slice(0, 300);
      console.error(`[attempt ${attempt + 1}] raw response (${rawStr.length}):`, rawStr);

      const aiContent: string = aiResponse?.choices?.[0]?.message?.content || "";
      if (!aiContent) {
        lastError = `No content in message. Response: ${rawStr}`;
        lastAiContent = rawStr;
        temperature += RETRY_TEMP_ADJUST;
        continue;
      }

      console.error(`[attempt ${attempt + 1}] AI content (${aiContent.length} chars):`, aiContent.slice(0, 300));
      lastAiContent = aiContent;
      const parsed = extractJSON(aiContent);

      if (!parsed || !parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        lastError = `parse failure: ${aiContent.slice(0, 200)}`;
        temperature += RETRY_TEMP_ADJUST;
        continue;
      }

      const periodEnd = new Date().toISOString().slice(0, 10);
      const periodStart = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const basedOn = {
        period: `${periodStart} to ${periodEnd}`,
        compact_summary: compact,
        previous_rec_ids: (previous_recommendations || []).map(r => r.id),
        child_settings: {
          max_screen_time_minutes: child.max_screen_time_minutes,
          min_sleep_minutes: child.min_sleep_minutes,
        },
        bmi_category: child.bmi_assessment?.category ?? null,
        age_months: child.age_months ?? null,
        scheduled_summary: scheduledSummary,
        model: MODEL,
        confidence: analysisSummary.confidence,
      };

      const insertPromises = parsed.recommendations.map((rec: any) =>
        fetch(`${SUPABASE_URL}/rest/v1/recommendations`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            child_id,
            content: rec.content,
            category: rec.category,
            priority: rec.priority,
            insight_type: rec.insight_type,
            trend: rec.trend,
            based_on: basedOn,
          }),
        })
      );

      const insertResults = await Promise.all(insertPromises);
      const savedRecommendations = await Promise.all(insertResults.map(r => r.json()));

      return new Response(JSON.stringify({
        recommendations: savedRecommendations.flat(),
        summary: parsed.summary ?? analysisSummary,
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    console.error("All attempts failed. Last error:", lastError);
    return new Response(JSON.stringify({ error: "AI returned unparseable response after retry", lastAiContent }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
