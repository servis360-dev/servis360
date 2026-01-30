// Bu dosyayý lib/telegram.ts olarak kaydet

const BOT_TOKEN = '8386296481:AAHyae1tm-j1PDEc1pPsn48w2zYpiQakQvc';
const CHAT_ID = '7571993053';

// Sadece Mesaj Atar
export const sendTelegramMessage = async (text: string) => {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error("Telegram mesaj hatasý:", error);
    }
};

// Fotoðraf (Dekont) ve Mesaj Atar
export const sendTelegramPhoto = async (file: File, caption: string) => {
    try {
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', file);
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
        await fetch(url, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error("Telegram fotoðraf hatasý:", error);
    }
};