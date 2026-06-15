declare const brand: unique symbol

type Brand<T, TBrand extends string> = T & { [brand]: TBrand }

export type TenantId = Brand<string, 'TenantId'>
export type UserId = Brand<string, 'UserId'>
export type PatientId = Brand<string, 'PatientId'>
export type SessionId = Brand<string, 'SessionId'>

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist'

export type SubscriptionTier = 'trial' | 'essential' | 'professional' | 'enterprise' | 'suspended'

export type MoneySubunits = number
