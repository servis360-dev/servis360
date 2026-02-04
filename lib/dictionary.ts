import 'server-only';

// Sözlüklerin nerede olduğunu tanımlıyoruz
// Not: Dosya yolları "../dictionaries/..." şeklinde olmalı
const dictionaries: any = {
    en: () => import('../dictionaries/en.json').then((module) => module.default),
    tr: () => import('../dictionaries/tr.json').then((module) => module.default),
    de: () => import('../dictionaries/de.json').then((module) => module.default),
};

// Dili alıp ilgili dosyayı döndüren fonksiyon
export const getDictionary = async (locale: string) => {
    // Eğer gelen dil listede yoksa (örn: fr), varsayılan olarak İngilizce (en) getir
    if (!dictionaries[locale]) {
        return dictionaries.en();
    }
    return dictionaries[locale]();
};