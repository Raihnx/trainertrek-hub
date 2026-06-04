CREATE OR REPLACE FUNCTION public.enforce_attendance_same_day()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Freeze can be scheduled for today or future dates (advance freezing).
  -- Present/Absent must be marked on the same day only.
  IF NEW.status = 'freeze' THEN
    IF NEW.date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Freeze cannot be set on past dates (today: %)', CURRENT_DATE;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Present/Absent can only be marked on the same day (today: %)', CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$function$;