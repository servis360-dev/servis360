// Dosya Yolu: app/api/send-receipt/route.ts

// Dosya: app/api/send-receipt/route.ts

import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = '8386296481:AAHyae1tm-j1PDEc1pPsn48w2zYpiQakQvc';
const CHAT_ID = '7571993053';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("photo"); // Frontend'den "photo" adıyla geliyor
        const caption = formData.get("caption") as string;

        if (!file) {
            return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
        }

        // Telegram'a gidecek yeni form data
        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", CHAT_ID);
        // DİKKAT: Telegram'da dosya yollarken key 'document' olmalı
        telegramFormData.append("document", file);
        telegramFormData.append("caption", caption || "");
        telegramFormData.append("parse_mode", "HTML");

        // ARTIK sendPhoto DEĞİL, sendDocument KULLANIYORUZ
        const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
            method: "POST",
            body: telegramFormData,
        });

        const result = await telegramRes.json();

        if (!result.ok) {
            console.error("Telegram API Hatası:", result);
            throw new Error(result.description || "Telegram API hatası");
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Sunucu Hatası:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}