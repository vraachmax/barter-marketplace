export type SettingsSection = 'account' | 'storefront' | 'appearance' | 'notifications' | 'privacy' | 'security';

export type SettingsForm = {
  email: string;
  phone: string;
  name: string;
  avatarUrl: string;
  about: string;
  companyName: string;
  companyInfo: string;
  appTheme: 'SYSTEM' | 'LIGHT' | 'DARK';
  notificationsEnabled: boolean;
  marketingEnabled: boolean;
  showEmailPublic: boolean;
  showPhonePublic: boolean;
};

const fields: Record<SettingsSection, readonly (keyof SettingsForm)[]> = {
  account: ['email', 'phone'],
  storefront: ['name', 'avatarUrl', 'about', 'companyName', 'companyInfo'],
  appearance: ['appTheme'],
  notifications: ['notificationsEnabled', 'marketingEnabled'],
  privacy: ['showEmailPublic', 'showPhonePublic'],
  security: [],
};

/** Send only edits from the visible section. Missing contacts are not empty-string updates. */
export function buildSettingsPatch(
  section: SettingsSection,
  form: SettingsForm,
  account: { [Key in keyof SettingsForm]: SettingsForm[Key] | null },
): Partial<SettingsForm> {
  const entries = fields[section].flatMap((key) => {
    const raw = form[key];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const previous = account[key] ?? '';
    if (value === previous) return [];
    if ((key === 'email' || key === 'phone') && value === '') {
      throw new Error(key === 'email' ? 'Укажите email. Удаление контакта здесь пока недоступно.' : 'Укажите телефон. Удаление контакта здесь пока недоступно.');
    }
    return [[key, value]];
  });
  return Object.fromEntries(entries) as Partial<SettingsForm>;
}

export function autoReplyChanged(
  draft: { enabled: boolean; text: string },
  saved: { enabled: boolean; text: string } | null,
): boolean {
  return saved !== null && (draft.enabled !== saved.enabled || draft.text !== saved.text);
}
