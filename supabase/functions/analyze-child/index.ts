import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/elephant-alpha";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  max_screen_time_minutes: number | null;
  min_sleep_minutes: number | null;
  // New fields from client
  age_months: number | null;
  gender: 'male' | 'female' | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  bmi_assessment: BmiAssessment | null;
  // Routine schedule
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
  scheduled_summary: ScheduledSummary;
}

// ──────────────────────────────────────────
// Activity Aggregation
// ──────────────────────────────────────────

function aggregateActivities(activities: Activity[]) {
  const grouped: Record<string, Activity[]> = {};
  for (const a of activities) {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  }

  const summary: Record<string, any> = {};

  // Screen time
  const screenTimeLogs = grouped["screen_time"] || [];
  if (screenTimeLogs.length > 0) {
    const totalMin = screenTimeLogs.reduce((sum, a) => sum + (a.value?.minutes || 0), 0);
    const days = new Set(screenTimeLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const leisure = screenTimeLogs.filter(a => a.value?.category === "leisure");
    const educational = screenTimeLogs.filter(a => a.value?.category === "educational");
    summary.screen_time = {
      total_minutes: totalMin,
      avg_daily_minutes: Math.round(totalMin / Math.max(days, 1)),
      log_count: screenTimeLogs.length,
      leisure_minutes: leisure.reduce((s, a) => s + (a.value?.minutes || 0), 0),
      educational_minutes: educational.reduce((s, a) => s + (a.value?.minutes || 0), 0),
    };
  }

  // Sleep
  const sleepLogs = grouped["sleep"] || [];
  if (sleepLogs.length > 0) {
    const hoursArr = sleepLogs.map(a => {
      if (a.value?.hours) return a.value.hours;
      if (a.value?.minutes) return a.value.minutes / 60;
      return 0;
    }).filter(h => h > 0);
    const avg = hoursArr.reduce((s, h) => s + h, 0) / hoursArr.length;
    const variance = hoursArr.reduce((s, h) => s + (h - avg) ** 2, 0) / hoursArr.length;
    summary.sleep = {
      avg_hours: Math.round(avg * 10) / 10,
      min_hours: Math.round(Math.min(...hoursArr) * 10) / 10,
      max_hours: Math.round(Math.max(...hoursArr) * 10) / 10,
      consistency: Math.round((1 - Math.min(Math.sqrt(variance) / avg, 1)) * 100) / 100,
      log_count: sleepLogs.length,
    };
  }

  // Nap
  const napLogs = grouped["nap"] || [];
  if (napLogs.length > 0) {
    const minsArr = napLogs.map(a => a.value?.minutes || 0).filter(m => m > 0);
    const days = new Set(napLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const totalDays = activities.length > 0
      ? Math.max(1, new Set(activities.map(a => a.recorded_at.slice(0, 10))).size)
      : 1;
    summary.nap = {
      avg_minutes: Math.round(minsArr.reduce((s, m) => s + m, 0) / minsArr.length),
      frequency: `${days}/${totalDays} days`,
      log_count: napLogs.length,
    };
  }

  // Meals
  const mealLogs = grouped["meal"] || [];
  if (mealLogs.length > 0) {
    const days = new Set(mealLogs.map(a => a.recorded_at.slice(0, 10))).size;
    const foods = new Set(mealLogs.map(a => a.value?.food || a.value?.name || "").filter(Boolean));
    summary.meals = {
      avg_per_day: Math.round((mealLogs.length / Math.max(days, 1)) * 10) / 10,
      unique_foods: foods.size,
      log_count: mealLogs.length,
    };
  }

  // Education
  const eduLogs = grouped["education"] || [];
  if (eduLogs.length > 0) {
    const totalMin = eduLogs.reduce((s, a) => s + (a.value?.minutes || 0), 0);
    const subjects = new Set(eduLogs.map(a => a.value?.subject || a.value?.name || "").filter(Boolean));
    summary.education = {
      total_minutes: totalMin,
      subjects: [...subjects],
      log_count: eduLogs.length,
    };
  }

  // Physical activity
  const physLogs = grouped["physical_activity"] || [];
  if (physLogs.length > 0) {
    const totalMin = physLogs.reduce((s, a) => s + (a.value?.minutes || 0), 0);
    const types = new Set(physLogs.map(a => a.value?.activity || a.value?.type || "").filter(Boolean));
    summary.physical_activity = {
      total_minutes: totalMin,
      types: [...types],
      log_count: physLogs.length,
    };
  }

  return summary;
}

// ──────────────────────────────────────────
// Prompt Builder
// ──────────────────────────────────────────

function buildPrompt(
  child: Child,
  summary: Record<string, any>,
  previousRecs: PreviousRecommendation[],
  scheduledSummary: ScheduledSummary
): string {
  const ageMonths = child.age_months ?? 0;
  const ageYears = Math.floor(ageMonths / 12);
  const ageMonthsRem = ageMonths % 12;
  const ageDisplay = ageMonths > 0 ? `${ageYears} years ${ageMonthsRem} months` : 'unknown';
  const gender = child.gender ?? 'unknown';

  // Age-specific developmental context
  let devContext = '';
  if (ageMonths <= 36) {
    devContext = 'TODDLER (1-3 years): Rapid brain development. Prioritize sensory play, outdoor time, and consistent routines. Screen time is highly discouraged — no more than 30 min/day of educational content with a caregiver present. Naps are essential (1-2 per day). Sleep 12-14h total.';
  } else if (ageMonths <= 72) {
    devContext = 'PRESCHOOLER (3-6 years): Language explosion, social skills developing. Encourage imaginative play, reading together, and structured physical activity. Screen time should be limited and educational. Sleep 10-13h total. Naps may decrease. Fine motor skills developing.';
  } else if (ageMonths <= 144) {
    devContext = 'SCHOOL-AGE (6-12 years): Growing independence, peer relationships matter. Encourage sports, creative activities, and reading. Screen time guidelines: no more than 2h/day recreational. Homework support important. Sleep 9-12h total. No naps typically needed.';
  }

  // BMI context
  let bmiSection = '';
  if (child.bmi_assessment) {
    const b = child.bmi_assessment;
    bmiSection = `BMI ASSESSMENT:
- BMI: ${b.bmi} | Percentile: ${b.percentile}th | Category: ${b.category} (z-score: ${b.zScore})
- ${b.label}
- IMPORTANT: For children, BMI MUST be interpreted using age- and gender-specific percentiles, NOT adult BMI standards. The WHO/CDC BMI-for-age growth charts are used.`;
  } else {
    bmiSection = 'BMI: No height/weight/gender data available. Recommend collecting during next checkup.';
  }

  // Routine schedule
  const routineLines: string[] = [];
  if (child.bedtime) routineLines.push(`Bedtime: ${child.bedtime}`);
  if (child.wake_up_time) routineLines.push(`Wake-up: ${child.wake_up_time}`);
  if (child.breakfast_time) routineLines.push(`Breakfast: ${child.breakfast_time}`);
  if (child.lunch_time) routineLines.push(`Lunch: ${child.lunch_time}`);
  if (child.snack_time) routineLines.push(`Snack: ${child.snack_time}`);
  if (child.dinner_time) routineLines.push(`Dinner: ${child.dinner_time}`);
  if (child.nap_time) routineLines.push(`Nap: ${child.nap_time}`);
  if (child.activity_time) routineLines.push(`Activity: ${child.activity_time}`);
  if (child.learn_time) routineLines.push(`Learning: ${child.learn_time}`);
  const routineStr = routineLines.length > 0 ? routineLines.join('\n') : 'No routine configured.';

  // Scheduled activity summary
  const schedLines: string[] = [];
  if (scheduledSummary.total > 0) {
    schedLines.push(`Total scheduled: ${scheduledSummary.total}`);
    schedLines.push(`Completed (logged): ${scheduledSummary.completed}`);
    schedLines.push(`Skipped: ${scheduledSummary.skipped}`);
    schedLines.push(`Missed (unlogged): ${scheduledSummary.missed}`);
    if (scheduledSummary.byType.length > 0) {
      schedLines.push('By type:');
      for (const [type, counts] of scheduledSummary.byType) {
        schedLines.push(`  ${type}: ${counts.completed} done, ${counts.skipped} skipped, ${counts.missed} missed`);
      }
    }
  }
  const schedStr = schedLines.length > 0 ? schedLines.join('\n') : 'No scheduled activities configured.';

  // Screen time/sleep settings
  const settings: string[] = [];
  if (child.max_screen_time_minutes) settings.push(`Max daily screen time: ${child.max_screen_time_minutes} minutes`);
  if (child.min_sleep_minutes) settings.push(`Min daily sleep: ${child.min_sleep_minutes} minutes (${Math.round(child.min_sleep_minutes / 60 * 10) / 10}h)`);
  const settingsStr = settings.length > 0 ? settings.join('\n') : 'No limits configured.';

  // Previous recommendations
  let previousSection = 'No previous recommendations.';
  if (previousRecs.length > 0) {
    previousSection = previousRecs.map((r, i) =>
      `[${i + 1}] (${r.created_at.slice(0, 10)}) [${r.priority}] ${r.content.slice(0, 400)}`
    ).join('\n\n');
  }

  // Activity summary period
  const periodEnd = new Date().toISOString().slice(0, 10);
  const dataPoints = Object.values(summary).reduce((sum: number, v: any) => sum + (v.log_count ?? 0), 0);
  let analysisPeriod = '28 days';
  if (dataPoints < 14) analysisPeriod = '14 days (limited data)';
  if (dataPoints < 7) analysisPeriod = '7 days (very limited data)';

  const periodStart = new Date(Date.now() - (dataPoints < 7 ? 7 : dataPoints < 14 ? 14 : 28) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return `You are a pediatric child development advisor providing evidence-based, actionable recommendations to parents. Your recommendations should be specific, practical, and age-appropriate.

═══════════════════════════════════════════
CHILD PROFILE
═══════════════════════════════════════════
Name: ${child.name}
Age: ${ageDisplay} (${ageMonths} months)
Gender: ${gender}

${bmiSection}

═══════════════════════════════════════════
DEVELOPMENTAL CONTEXT
═══════════════════════════════════════════
${devContext}

═══════════════════════════════════════════
ROUTINE SCHEDULE
═══════════════════════════════════════════
${routineStr}

═══════════════════════════════════════════
ACTIVITY SETTINGS
═══════════════════════════════════════════
${settingsStr}

═══════════════════════════════════════════
SCHEDULED ACTIVITY TRACKING (last 30 days)
═══════════════════════════════════════════
${schedStr}
NOTE: "Missed" activities mean a schedule was created but the child did not log it. This could indicate the child was distracted, the parent forgot, or the activity didn't happen. Consider this in recommendations.

═══════════════════════════════════════════
ACTIVITY SUMMARY (${periodStart} to ${periodEnd}, ${analysisPeriod})
═══════════════════════════════════════════
${JSON.stringify(summary, null, 2)}

═══════════════════════════════════════════
PREVIOUS RECOMMENDATIONS (last ${previousRecs.length})
═══════════════════════════════════════════
${previousSection}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════
1. Provide 1-3 specific, actionable recommendations based on ALL available data above.
2. Consider the child's age group, gender, BMI percentile, and developmental stage.
3. If the child has configured limits (screen time, sleep), reference whether they are being met.
4. If the child missed scheduled activities, suggest ways to improve adherence or adjust the schedule.
5. If previous recommendations exist, acknowledge them and note any improvements or continued concerns.
6. Do NOT repeat advice from previous recommendations unless the pattern has not improved.
7. If BMI data exists, reference the category (underweight/normal/overweight/obese) with age-appropriate context.
8. Each recommendation: 2-4 sentences. Be direct, specific, and practical.
9. Categorize each: screen_time, sleep, nutrition, activity, or general.
10. Priority: high (concerning pattern), medium (room for improvement), low (positive reinforcement).

Respond in this JSON format:
{
  "recommendations": [
    {
      "content": "recommendation text",
      "category": "screen_time|sleep|nutrition|activity|general",
      "priority": "high|medium|low"
    }
  ]
}`;
}

// ──────────────────────────────────────────
// Edge Function Handler
// ──────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
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
    // Parse request
    const body: RequestBody = await req.json();
    const { child_id, child, activities, previous_recommendations, scheduled_summary } = body;

    if (!child_id || !child || !activities) {
      return new Response(JSON.stringify({ error: "Missing required fields: child_id, child, activities" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Aggregate activities
    const summary = aggregateActivities(activities);

    // Build prompt with all available context
    const prompt = buildPrompt(child, summary, previous_recommendations || [], scheduled_summary || { total: 0, completed: 0, pending: 0, skipped: 0, missed: 0, byType: [] });

    // Call OpenRouter
    const openrouterRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!openrouterRes.ok) {
      const errText = await openrouterRes.text();
      console.error("OpenRouter error:", errText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const aiResponse = await openrouterRes.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || "";

    // Parse AI response — extract JSON from markdown code blocks if present
    let parsed: { recommendations: { content: string; category: string; priority: string }[] };
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || [null, aiContent];
      parsed = JSON.parse(jsonMatch[1]);
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(JSON.stringify({ error: "AI returned unparseable response" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build based_on context for audit trail
    const periodEnd = new Date().toISOString().slice(0, 10);
    const periodStart = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const basedOn = {
      period: `${periodStart} to ${periodEnd}`,
      activity_summary: summary,
      previous_rec_ids: (previous_recommendations || []).map(r => r.id),
      child_settings: {
        max_screen_time_minutes: child.max_screen_time_minutes,
        min_sleep_minutes: child.min_sleep_minutes,
      },
      bmi_category: child.bmi_assessment?.category ?? null,
      age_months: child.age_months ?? null,
      scheduled_summary: scheduled_summary || null,
      model: MODEL,
    };

    // Insert recommendations into Supabase using service role (bypasses RLS for Edge Functions)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const insertPromises = parsed.recommendations.map(rec =>
      fetch(`${supabaseUrl}/rest/v1/recommendations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          child_id,
          content: rec.content,
          category: rec.category,
          priority: rec.priority,
          based_on: basedOn,
        }),
      })
    );

    const insertResults = await Promise.all(insertPromises);
    const savedRecommendations = await Promise.all(insertResults.map(r => r.json()));

    return new Response(JSON.stringify({ recommendations: savedRecommendations.flat() }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
