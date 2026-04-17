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

interface RequestBody {
  child_id: string;
  child: Child;
  activities: Activity[];
  previous_recommendations: PreviousRecommendation[];
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

function buildPrompt(child: Child, summary: Record<string, any>, previousRecs: PreviousRecommendation[]): string {
  const age = child.date_of_birth
    ? Math.round((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10
    : "unknown";

  const settings: string[] = [];
  if (child.max_screen_time_minutes) settings.push(`Max daily screen time: ${child.max_screen_time_minutes} minutes`);
  if (child.min_sleep_minutes) settings.push(`Min daily sleep: ${child.min_sleep_minutes} minutes (${Math.round(child.min_sleep_minutes / 60 * 10) / 10}h)`);
  const settingsStr = settings.length > 0 ? settings.join("\n") : "No limits configured.";

  let previousSection = "No previous recommendations.";
  if (previousRecs.length > 0) {
    previousSection = previousRecs.map((r, i) =>
      `[${i + 1}] (${r.created_at.slice(0, 10)}) [${r.priority}] ${r.content.slice(0, 300)}`
    ).join("\n\n");
  }

  const periodEnd = new Date().toISOString().slice(0, 10);
  const periodStart = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return `You are a child development advisor providing evidence-based, actionable recommendations to parents.

CHILD PROFILE:
- Name: ${child.name}
- Age: ${age} years old
- Settings: ${settingsStr}

ACTIVITY SUMMARY (${periodStart} to ${periodEnd}, 4 weeks):
${JSON.stringify(summary, null, 2)}

PREVIOUS RECOMMENDATIONS:
${previousSection}

INSTRUCTIONS:
- Provide 1-3 specific, actionable recommendations based on the activity data.
- If the child has configured limits (screen time, sleep), reference whether they are being met.
- If previous recommendations exist, acknowledge them and note any improvements or continued concerns.
- Categorize each recommendation: screen_time, sleep, nutrition, activity, or general.
- Assign priority: high (concerning pattern), medium (room for improvement), low (positive reinforcement).
- Keep each recommendation to 2-4 sentences. Be direct and specific.
- Do not repeat advice from previous recommendations unless the pattern has not improved.

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
    const { child_id, child, activities, previous_recommendations } = body;

    if (!child_id || !child || !activities) {
      return new Response(JSON.stringify({ error: "Missing required fields: child_id, child, activities" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Aggregate activities
    const summary = aggregateActivities(activities);

    // Build prompt
    const prompt = buildPrompt(child, summary, previous_recommendations || []);

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
        max_tokens: 1024,
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
