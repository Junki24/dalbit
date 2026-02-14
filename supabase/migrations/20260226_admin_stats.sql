-- Admin dashboard stats RPC function
-- Only callable by junki7051@gmail.com

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email TEXT := 'junki7051@gmail.com';
  caller_email TEXT;
  result JSON;
BEGIN
  -- Check admin
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR caller_email != admin_email THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_24h', (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '24 hours'),
    'active_7d', (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '7 days'),
    'gender_stats', COALESCE(
      (SELECT json_agg(row_to_json(g)) FROM (
        SELECT gender, COUNT(*) as count FROM user_settings GROUP BY gender
      ) g),
      '[]'::json
    ),
    'users', COALESCE(
      (SELECT json_agg(row_to_json(t)) FROM (
        SELECT
          u.email,
          u.created_at as signup_date,
          u.last_sign_in_at as last_login,
          COALESCE(us.gender, 'unknown') as gender,
          COALESCE(us.display_name, '') as display_name,
          (SELECT COUNT(*) FROM periods p WHERE p.user_id = u.id AND p.deleted_at IS NULL) as period_count,
          (SELECT COUNT(*) FROM symptoms s WHERE s.user_id = u.id) as symptom_count,
          (SELECT COUNT(*) FROM intimacy_records ir WHERE ir.user_id = u.id) as intimacy_count,
          (SELECT COUNT(*) FROM medication_intakes mi WHERE mi.user_id = u.id) as med_count,
          COALESCE(us.health_data_consent, false) as consented,
          COALESCE(us.average_cycle_length, 0) as avg_cycle,
          COALESCE(us.average_period_length, 0) as avg_period
        FROM auth.users u
        LEFT JOIN user_settings us ON us.user_id = u.id
        ORDER BY u.last_sign_in_at DESC NULLS LAST
      ) t),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;
