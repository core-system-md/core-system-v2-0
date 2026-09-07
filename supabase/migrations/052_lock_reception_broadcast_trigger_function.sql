-- P52: The queue broadcast trigger function is trigger-only and must not be
-- directly invocable through the Data API.
REVOKE EXECUTE ON FUNCTION public.broadcast_pin_queue_change() FROM PUBLIC, anon, authenticated;
