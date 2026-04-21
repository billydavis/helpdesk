CREATE OR REPLACE FUNCTION get_dashboard_stats(ai_agent_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_total         BIGINT;
  v_open          BIGINT;
  v_ai_resolved   BIGINT;
  v_ai_percent    INTEGER;
  v_avg_ms        BIGINT;
  v_per_day       JSONB;
BEGIN
  SELECT COUNT(*)  INTO v_total       FROM "Ticket";
  SELECT COUNT(*)  INTO v_open        FROM "Ticket" WHERE status = 'open';
  SELECT COUNT(*)  INTO v_ai_resolved FROM "Ticket"
   WHERE status = 'resolved' AND "assignedToId" = ai_agent_id;

  v_ai_percent := CASE WHEN v_total > 0
                    THEN ROUND(v_ai_resolved::NUMERIC / v_total * 100)::INTEGER
                    ELSE 0
                  END;

  SELECT ROUND(AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000))::BIGINT
    INTO v_avg_ms
    FROM "Ticket"
   WHERE status IN ('resolved', 'closed');

  SELECT jsonb_agg(
           jsonb_build_object('date', gs.day::DATE::TEXT, 'count', COALESCE(counts.cnt, 0))
           ORDER BY gs.day
         )
    INTO v_per_day
    FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day'::INTERVAL) AS gs(day)
    LEFT JOIN (
      SELECT "createdAt"::DATE AS d, COUNT(*) AS cnt
        FROM "Ticket"
       WHERE "createdAt" >= CURRENT_DATE - 29
       GROUP BY "createdAt"::DATE
    ) AS counts ON counts.d = gs.day::DATE;

  RETURN jsonb_build_object(
    'totalTickets',        v_total,
    'openTickets',         v_open,
    'aiResolvedTickets',   v_ai_resolved,
    'aiResolvedPercent',   v_ai_percent,
    'avgResolutionTimeMs', v_avg_ms,
    'ticketsPerDay',       v_per_day
  );
END;
$$;
