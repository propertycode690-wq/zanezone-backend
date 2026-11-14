import { z } from 'zod';

export const validateBirthday18Plus = (val) => {
  if (!val || String(val).trim() === '') return true;
  const s = String(val).trim().split('T')[0];
  const parts = s.split('-').map(Number);
  let birthDate;
  if (parts.length === 3 && !parts.some(n => Number.isNaN(n))) {
    birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    birthDate = new Date(val);
  }
  if (isNaN(birthDate.getTime())) return false;
  
  const today = new Date();
  if (birthDate > today) return false;

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
};

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    roleId: z.coerce.number().int().positive('Role is required'),
    tenantId: z.coerce.number().int().positive('Tenant ID is required').optional(),
    status: z.string().optional(),
    avatar: z.string().nullable().optional(),
    birthday: z.string().nullable().optional().refine(validateBirthday18Plus, {
      message: 'User must be at least 18 years old and birthday cannot be in the future',
    }),
    nibNumber: z.string().nullable().optional(),
    vacationBalance: z.coerce.number().optional(),
    employmentStatus: z.string().optional(),
    bankingInfo: z.object({
      bank: z.string().nullable().optional(),
      account: z.string().nullable().optional(),
      routing: z.string().nullable().optional(),
      method: z.string().nullable().optional(),
    }).nullable().optional(),
    hasPassport: z.boolean().optional(),
    hasLicense: z.boolean().optional(),
    hasNIB: z.boolean().optional(),
    hasResume: z.boolean().optional(),
    isSalaried: z.boolean().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    phone: z.string().nullable().optional(),
    roleId: z.coerce.number().int().positive('Role is required').optional(),
    status: z.string().optional(),
    avatar: z.string().nullable().optional(),
    plan: z.string().optional(),
    is_upgraded: z.boolean().optional(),
    concierge_member: z.boolean().optional(),
    concierge_membership_since: z.string().nullable().optional(),
    hasPassport: z.boolean().optional(),
    hasLicense: z.boolean().optional(),
    hasNIB: z.boolean().optional(),
    hasResume: z.boolean().optional(),
    hasProfilePic: z.boolean().optional(),
    hasCerts: z.boolean().optional(),
    passportUrl: z.string().nullable().optional(),
    licenseUrl: z.string().nullable().optional(),
    nibUrl: z.string().nullable().optional(),
    resumeUrl: z.string().nullable().optional(),
    certsUrl: z.string().nullable().optional(),
    birthday: z.string().nullable().optional().refine(validateBirthday18Plus, {
      message: 'User must be at least 18 years old and birthday cannot be in the future',
    }),
    nibNumber: z.string().nullable().optional(),
    vacationBalance: z.coerce.number().optional(),
    employmentStatus: z.string().optional(),
    bankingInfo: z.object({
      bank: z.string().nullable().optional(),
      account: z.string().nullable().optional(),
      routing: z.string().nullable().optional(),
      method: z.string().nullable().optional(),
    }).nullable().optional(),
    isSalaried: z.boolean().optional(),
  }),
});
