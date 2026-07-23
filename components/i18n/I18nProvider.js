"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { DEFAULT_LOCALE, getMessages, getTextDirection, translate } from "@/lib/i18n";

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  messages: getMessages(DEFAULT_LOCALE),
  t: (key, values) => translate(DEFAULT_LOCALE, key, values),
});

export function I18nProvider({ children, locale }) {
  const dir = getTextDirection(locale);
  const value = useMemo(
    () => ({
      locale,
      dir,
      messages: getMessages(locale),
      t: (key, values) => translate(locale, key, values),
    }),
    [dir, locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [dir, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
