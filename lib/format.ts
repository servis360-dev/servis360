export function getCurrencySettings(locale: string) {
    // Dile göre para birimi ayarları
    switch (locale) {
        case 'tr':
            return { code: 'TRY', symbol: '₺' };
        case 'de':
            return { code: 'EUR', symbol: '€' };
        case 'en':
            return { code: 'USD', symbol: '$' };
        default:
            return { code: 'USD', symbol: '$' };
    }
}

export function formatMoney(amount: number | string, locale: string = 'en') {
    const value = Number(amount);
    if (isNaN(value)) return '-';

    const currency = getCurrencySettings(locale);

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    } catch (error) {
        // Fallback (Eğer locale hatası olursa varsayılan format)
        return `${currency.symbol}${value.toFixed(2)}`;
    }
}