import React, { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS, type Language } from "./translations";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("vdas:language");
    if (saved === "en" || saved === "ur" || saved === "roman-ur" || saved === "ar") {
      return saved as Language;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem("vdas:language", lang);
    // Also mirror to sessionStorage so other pages or tabs can pick it up if needed
    sessionStorage.setItem("vdas:language", lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    // Always keep document direction LTR to prevent layout flipping (logo/buttons swapping sides)
    document.documentElement.dir = "ltr";
    
    // Set HTML lang attribute
    document.documentElement.lang = language === "roman-ur" ? "en" : language;
  }, [language]);

  const t = (key: string): string => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS["en"];
    return translations[key] || TRANSLATIONS["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
