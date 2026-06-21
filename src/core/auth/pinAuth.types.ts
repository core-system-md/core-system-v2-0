// Types extracted from PinAuthProvider.tsx (TODO: re-enable when verify_pin_hash RPC exists)
export interface PinVerifyParams {
  pinCode: string;
  kioskRole: KioskRole;
}

export interface EmployeeCodeVerifyParams {
  employeeCode: string;
  kioskRole: KioskRole;
}

export type KioskRole = 'reception' | 'doctor' | 'admin';

export interface PinValidationResult {
  success: boolean;
  user?: {
    id: string;
    full_name: string;
    role: string;
  };
  error?: string;
}

export type PinErrorCode = 
  | 'INVALID_PIN'
  | 'USER_NOT_FOUND'
  | 'USER_INACTIVE'
  | 'RATE_LIMITED'
  | 'VERIFICATION_FAILED';
