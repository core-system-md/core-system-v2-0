-- P101: Remove direct authenticated execution of an unused SECURITY DEFINER
-- user-lookup RPC. No function body or signature change.
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM authenticated;
