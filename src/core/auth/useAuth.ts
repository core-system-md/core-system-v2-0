// في useAuth.ts — غير في PIN Login section:
} else if (pinCode) {
  const { data: users, error: pinError } = await supabase
    .rpc('validate_pin', {
      clinic_tenant_id: tenant.id,
      staff_pin_code: pinCode
    });

  if (pinError) {
    console.error('PIN login error:', pinError);
    throw new Error('INVALID_PIN: ' + pinError.message);
  }

  if (!users || users.length === 0) {
    throw new Error('INVALID_PIN: Incorrect PIN code');
  }

  const pinUser = users[0];
  userIdStr = pinUser.id;           // ← غيرت من user_id
  userFullName = pinUser.full_name; // ← غيرت من user_name
  userRole = pinUser.role;          // ← غيرت من user_role
  userEmail = null;

  localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
    user_id: userIdStr,
    full_name: userFullName,
    role: userRole,
    tenant_id: tenant.id,
    expiry: Date.now() + 24 * 60 * 60 * 1000,
  }));

  return { userId: userIdStr, email: userEmail, fullName: userFullName, role: userRole, tenantId: tenant.id };