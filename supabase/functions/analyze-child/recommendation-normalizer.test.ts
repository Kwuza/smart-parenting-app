// @ts-nocheck: Deno test file uses jsr: imports and Deno globals outside the Expo app tsconfig.
import { assertEquals } from "jsr:@std/assert@1";
import { normalizeRecommendation, normalizeRecommendationCategory } from "./recommendation-normalizer.ts";

Deno.test("ambiguous activity category follows cited screen-time data instead of physical activity", () => {
  const rec = normalizeRecommendation({
    content:
      "Screen time averaged 145 min/day over 14 logged days — 25 min over the 120 min limit. Replace the Saturday tablet block with outdoor play to bring the weekend average down.",
    category: "activity",
    priority: "medium",
    insight_type: "risk",
    trend: "worsening",
  });

  assertEquals(rec?.category, "screen_time");
});

Deno.test("replacement physical activity suggestion does not override primary screen-time evidence", () => {
  const rec = normalizeRecommendation({
    content:
      "Screen time averaged 135 min/day over 10 logged days. Add a 20-minute physical activity block before dinner to reduce the excess minutes.",
    category: "activity",
    priority: "medium",
    insight_type: "risk",
    trend: "worsening",
  });

  assertEquals(rec?.category, "screen_time");
});

Deno.test("same-sentence physical suggestion does not override earlier screen-time evidence", () => {
  assertEquals(
    normalizeRecommendationCategory(
      "activity",
      "Screen time averaged 135 min/day over 10 logged days — add a physical activity block before dinner to reduce the excess minutes."
    ),
    "screen_time"
  );
});

Deno.test("replacement education suggestion does not override low-weight screen evidence", () => {
  assertEquals(
    normalizeRecommendationCategory(
      "education",
      "TV averaged 80 minutes/day over 7 logged days. Replace one video with reading time."
    ),
    "screen_time"
  );
});

Deno.test("app reminder wording in scheduled routines is not screen-time evidence", () => {
  assertEquals(
    normalizeRecommendationCategory(
      "activity",
      "There were 3 missed scheduled activities this week. Use the app reminders 15 minutes earlier and log the outcome."
    ),
    "general"
  );
});

Deno.test("generic scheduled activities are not treated as physical activity", () => {
  assertEquals(
    normalizeRecommendationCategory(
      "activity",
      "There were 3 missed scheduled activities this week. Move the reminders 15 minutes earlier and log the outcome after each routine."
    ),
    "general"
  );
});

Deno.test("nutrition aliases are normalized to the meal category used by the app", () => {
  const rec = normalizeRecommendation({
    content:
      "Meals averaged 1.6 per day over 5 logged days, with only 2 unique foods. Add a fruit or protein option at lunch to improve variety.",
    category: "nutrition",
    priority: "medium",
    insight_type: "opportunity",
    trend: null,
  });

  assertEquals(rec?.category, "meal");
});

Deno.test("physical activity is used only when physical movement evidence is explicit", () => {
  const rec = normalizeRecommendation({
    content:
      "Physical activity averaged 18 min/day over 4 logged days. Add a 15-minute playground or dancing session after snack time to build consistency.",
    category: "activity",
    priority: "medium",
    insight_type: "opportunity",
    trend: "stable",
  });

  assertEquals(rec?.category, "physical_activity");
});

Deno.test("mislabelled physical activity is overridden when sleep data is the primary evidence", () => {
  const rec = normalizeRecommendation({
    content:
      "Sleep averaged 8.2h/night over 6 logged nights — 1.8h below the 10h target. Move bedtime 20 minutes earlier for the next week and re-check the average.",
    category: "physical_activity",
    priority: "high",
    insight_type: "risk",
    trend: "worsening",
  });

  assertEquals(rec?.category, "sleep");
});
