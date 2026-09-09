export const E2E_PREFIX = 'E2E-PT-';

export const E2E_PATIENTS = [
  { n: 1, id: '00000000-0000-4000-8000-000000000001', full_name: 'E2E Patient 01', gender: 'male', age: 29, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 2, id: '00000000-0000-4000-8000-000000000002', full_name: 'E2E Patient 02', gender: 'female', age: 42, allergies: null, urgency: 'normal', visit: 'returning' },
  { n: 3, id: '00000000-0000-4000-8000-000000000003', full_name: 'E2E Patient 03', gender: 'male', age: 35, allergies: 'Penicillin', urgency: 'normal', visit: 'new' },
  { n: 4, id: '00000000-0000-4000-8000-000000000004', full_name: 'E2E Patient 04', gender: 'female', age: 58, allergies: 'Penicillin; NSAIDs; Latex', urgency: 'high', visit: 'new' },
  { n: 5, id: '00000000-0000-4000-8000-000000000005', full_name: 'E2E Patient 05', gender: 'male', age: 67, allergies: null, urgency: 'high', visit: 'new' },
  { n: 6, id: '00000000-0000-4000-8000-000000000006', full_name: 'E2E Patient 06', gender: 'female', age: 23, allergies: null, urgency: 'low', visit: 'new' },
  { n: 7, id: '00000000-0000-4000-8000-000000000007', full_name: 'E2E Patient 07', gender: 'male', age: 31, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 8, id: '00000000-0000-4000-8000-000000000008', full_name: 'E2E Patient 08', gender: 'female', age: 37, allergies: null, urgency: 'normal', visit: 'returning' },
  { n: 9, id: '00000000-0000-4000-8000-000000000009', full_name: 'E2E Patient 09', gender: 'male', age: 44, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 10, id: '00000000-0000-4000-8000-000000000010', full_name: 'E2E Patient 10', gender: 'female', age: 52, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 11, id: '00000000-0000-4000-8000-000000000011', full_name: 'E2E Patient 11', gender: 'male', age: 46, allergies: null, urgency: 'normal', visit: 'returning' },
  { n: 12, id: '00000000-0000-4000-8000-000000000012', full_name: 'E2E Patient 12', gender: 'female', age: 40, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 13, id: '00000000-0000-4000-8000-000000000013', full_name: 'E2E Patient 13', gender: 'male', age: 61, allergies: null, urgency: 'high', visit: 'new' },
  { n: 14, id: '00000000-0000-4000-8000-000000000014', full_name: 'E2E Patient 14', gender: 'female', age: 33, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 15, id: '00000000-0000-4000-8000-000000000015', full_name: 'E2E Patient 15', gender: 'male', age: 49, allergies: null, urgency: 'normal', visit: 'returning' },
  { n: 16, id: '00000000-0000-4000-8000-000000000016', full_name: 'E2E Patient 16', gender: 'female', age: 55, allergies: 'Penicillin', urgency: 'normal', visit: 'new' },
  { n: 17, id: '00000000-0000-4000-8000-000000000017', full_name: 'E2E Patient 17', gender: 'male', age: 27, allergies: null, urgency: 'low', visit: 'new' },
  { n: 18, id: '00000000-0000-4000-8000-000000000018', full_name: 'E2E Patient 18', gender: 'female', age: 64, allergies: null, urgency: 'normal', visit: 'returning' },
  { n: 19, id: '00000000-0000-4000-8000-000000000019', full_name: 'E2E Patient 19', gender: 'male', age: 38, allergies: null, urgency: 'normal', visit: 'new' },
  { n: 20, id: '00000000-0000-4000-8000-000000000020', full_name: 'E2E Patient 20', gender: 'female', age: 51, allergies: null, urgency: 'normal', visit: 'new' },
].map((patient) => ({
  ...patient,
  mrn: `${E2E_PREFIX}${String(patient.n).padStart(3, '0')}`,
  phone: `0790000${String(patient.n).padStart(3, '0')}`,
  date_of_birth: `${new Date().getUTCFullYear() - patient.age}-01-15`,
}));

export const E2E_SESSION_IDS = E2E_PATIENTS.map((patient) => `10000000-0000-4000-8000-${String(patient.n).padStart(12, '0')}`);
