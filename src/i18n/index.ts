import { create } from 'zustand';
import { SupportedLanguage, TRANSLATIONS } from './translations';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LANGUAGE_STORAGE_KEY = 'vanuatu_transport_lang';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: keyof typeof TRANSLATIONS.bi, params?: Record<string, string | number>) => string;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'bi', // Bislama is the default national language

  setLanguage: async (lang: SupportedLanguage) => {
    set({ language: lang });
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } else {
        await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, lang);
      }
    } catch {
      // Storage failure non-fatal
    }
  },

  t: (key, params) => {
    const currentLang = get().language;
    const langDict = TRANSLATIONS[currentLang] || TRANSLATIONS.bi;
    let text = (langDict as any)[key] || (TRANSLATIONS.en as any)[key] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
      });
    }

    return text;
  },
}));

// Initialize language from storage on boot
void (async () => {
  try {
    let savedLang: string | null = null;
    if (Platform.OS === 'web') {
      savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } else {
      savedLang = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    }
    if (savedLang === 'bi' || savedLang === 'en' || savedLang === 'fr') {
      useLanguageStore.setState({ language: savedLang });
    }
  } catch {
    // Keep default Bislama
  }
})();
