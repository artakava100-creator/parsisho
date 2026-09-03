import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'ایمیل الزامی است')
  .email('آدرس ایمیل نامعتبر است')
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
  .max(100, 'رمز عبور نباید بیش از ۱۰۰ کاراکتر باشد');

export const displayNameSchema = z
  .string()
  .min(3, 'نام نمایشی باید حداقل ۳ کاراکتر باشد')
  .max(50, 'نام نمایشی نباید بیش از ۵۰ کاراکتر باشد')
  .transform((v) => v.trim());

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'رمز عبور و تکرار آن یکسان نیستند',
  path: ['confirmPassword'],
});

export const phoneNumberSchema = z
  .string()
  .regex(/^09\d{9}$/, 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم داشته باشد')
  .nullable()
  .optional();

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  avatarUrl: z.string().url('آدرس تصویر نامعتبر است').nullable().optional(),
  city: z.string().max(100, 'نام شهر نباید بیش از ۱۰۰ کاراکتر باشد').nullable().optional(),
  phoneNumber: phoneNumberSchema,
});

export const bidSchema = z.object({
  amount: z
    .number({ message: 'مقدار پیشنهاد الزامی است' })
    .positive('مقدار پیشنهاد باید بیشتر از صفر باشد')
    .int('مقدار پیشنهاد باید عدد صحیح باشد'),
});

export type SignInForm = z.infer<typeof signInSchema>;
export type SignUpForm = z.infer<typeof signUpSchema>;
export type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;
export type BidForm = z.infer<typeof bidSchema>;
