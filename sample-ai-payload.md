curl -X POST "https://ttsoviuqkumlmdikqhjt.supabase.co/functions/v1/analyze-child" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0c292aXVxa3VtbG1kaWtxaGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTkzNzIsImV4cCI6MjA5MTM5NTM3Mn0.IIcIdjLJ1H2eSzrevmVjC_mtj19YTUciGa18xOby6SE" \
  -d '{
    "child_id": "eef02e16-6167-4bf7-af0f-f9f5fed5935e",
    "child": {
      "id": "eef02e16-6167-4bf7-af0f-f9f5fed5935e",
      "name": "Test Child",
      "date_of_birth": "2020-01-15",
      "max_screen_time_minutes": 120,
      "min_sleep_minutes": 540
    },
    "activities": [
      {"type": "sleep", "value": {"hours": 8}, "recorded_at": "2026-04-13T22:00:00Z"},
      {"type": "sleep", "value": {"hours": 7.5}, "recorded_at": "2026-04-12T22:00:00Z"},
      {"type": "screen_time", "value": {"minutes": 150, "category": "leisure"}, "recorded_at": "2026-04-13T15:00:00Z"},
      {"type": "meal", "value": {"food": "rice"}, "recorded_at": "2026-04-13T12:00:00Z"}
    ],
    "previous_recommendations": []
  }'