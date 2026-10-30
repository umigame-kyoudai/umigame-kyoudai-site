import { ERROR_MESSAGES } from '@/lib/constants/booking';

// Date silently normalizes dates such as February 30. Compare the calendar date
// after parsing to reject nonexistent days, independently of the server timezone.
export const isValidCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// 全角数字・記号を整える。先頭の+や0は保持し、海外番号も受け付ける。
export const normalizePhoneNumber = (phone: string): string =>
  phone.normalize('NFKC').trim().replace(/[‐‑‒–—―−ー]/g, '-');

// 区切り記号を桁数に含めない。+付きは短い海外番号も許す。
export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  const normalized = typeof phone === 'string' ? normalizePhoneNumber(phone) : '';
  const digits = normalized.replace(/\D/g, '');
  const minDigits = normalized.startsWith('+') ? 7 : 10;
  if (!/^\+?[0-9() -]+$/.test(normalized) || digits.length < minDigits || digits.length > 15) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_PHONE };
  }
  return { valid: true };
};

// メールアドレスのバリデーション
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  return { valid: true };
};

// 参加日・開始時間・参加者数の検証は app/api/booking/route.ts が
// プランごとのルール（lib/booking-rules.ts / lib/plan-flags.ts）で行う。
// ここに汎用版を置くと上限4名などの古い値を誤って使う原因になるため置かない。

// 必須フィールドのバリデーション
export const validateRequired = (value: string | number): { valid: boolean; error?: string } => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  return { valid: true };
};
