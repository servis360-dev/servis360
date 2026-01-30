// Dosya Yolu: app/api/send-receipt/route.ts

import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = '8386296481:AAHyae1tm-j1PDEc1pPsn48w2zYpiQakQvc';
const CHAT_ID = '7571993053';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const photo = formData.get("photo");
        const caption = formData.get("caption") as string;

        if (!photo) {
            return NextResponse.json({ error: "Dosya bulunamadý" }, { status: 400 });
        }

        // Telegram'a gidecek yeni form data
        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", CHAT_ID);
        telegramFormData.append("photo", photo); // Dosyayý olduðu gibi iletiyoruz
        telegramFormData.append("caption", caption || "");
        telegramFormData.append("parse_mode", "HTML");

        // Telegram API'ye Sunucudan Ýstek Atýyoruz
        const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: "POST",
            body: telegramFormData,
        });

        const result = await telegramRes.json();

        if (!result.ok) {
            throw new Error(result.description || "Telegram API hatasý");
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("API Hatasý:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}