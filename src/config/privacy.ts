/**
 * LGPD data-retention settings shared by the contact form, the inbox and the
 * privacy notice, so what the notice promises is what the code does.
 */

/** Days a contact-form message is kept before it is deleted automatically (30–3650, default 365). */
export function contactRetentionDays(): number {
  const value = Number(process.env.CONTACT_RETENTION_DAYS);
  return Number.isInteger(value) && value >= 30 && value <= 3650 ? value : 365;
}

/** "12 months", "90 days"… for user-facing text. */
export function describeRetention(days: number, language: 'en' | 'pt' = 'en'): string {
  if (days % 365 === 0) {
    const months = (days / 365) * 12;
    return language === 'pt' ? `${months} meses` : `${months} months`;
  }
  if (days % 30 === 0) {
    const months = days / 30;
    return language === 'pt' ? `${months} ${months === 1 ? 'mês' : 'meses'}` : `${months} month${months === 1 ? '' : 's'}`;
  }
  return language === 'pt' ? `${days} dias` : `${days} days`;
}
