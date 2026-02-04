import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// 🔥 AYARLAR: Lemon Squeezy Variant ID'leri
const PLAN_IDS = {
    // BİREYSEL
    INDIVIDUAL_MONTHLY: '1276140',
    INDIVIDUAL_6MONTH: '1276141',
    INDIVIDUAL_YEARLY: '1276142',

    // ESNAF
    BUSINESS_MONTHLY: '1276155',
    BUSINESS_6MONTH: '1276152',
    BUSINESS_YEARLY: '1276153',

    // KURUMSAL
    CORPORATE_MONTHLY: '1276158',
    CORPORATE_6MONTH: '1276165',
    CORPORATE_YEARLY: '1276166',

    // EK PAKETLER
    ADDON_BRANCH: '1275989',
    ADDON_STAFF: '1276003'
};

// ⏳ SÜRE TANIMLARI (Gün Cinsinden)
const DURATION_MAP: any = {
    // Bireysel
    [PLAN_IDS.INDIVIDUAL_MONTHLY]: 30,
    [PLAN_IDS.INDIVIDUAL_6MONTH]: 180,
    [PLAN_IDS.INDIVIDUAL_YEARLY]: 365,
    // Esnaf
    [PLAN_IDS.BUSINESS_MONTHLY]: 30,
    [PLAN_IDS.BUSINESS_6MONTH]: 180,
    [PLAN_IDS.BUSINESS_YEARLY]: 365,
    // Kurumsal
    [PLAN_IDS.CORPORATE_MONTHLY]: 30,
    [PLAN_IDS.CORPORATE_6MONTH]: 180,
    [PLAN_IDS.CORPORATE_YEARLY]: 365,
};

// 🔔 TELEGRAM GÖNDERME
async function sendTelegramNotification(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) return;

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error("Telegram Gönderim Hatası:", error);
    }
}

export async function POST(req: Request) {
    try {
        // 1. GÜVENLİK (İmza Doğrulama)
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
        const hmac = crypto.createHmac('sha256', secret || '');
        const rawBody = await req.text();
        const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
        const signature = Buffer.from(req.headers.get('x-signature') || '', 'utf8');

        if (!crypto.timingSafeEqual(digest, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        const data = payload.data;
        const customData = payload.meta.custom_data || {};
        const userId = customData.user_id;

        if (!userId) {
            return NextResponse.json({ message: 'No user_id provided' }, { status: 200 });
        }

        const userRef = db.collection('artifacts').doc('servis-360-live').collection('users').doc(userId).collection('users').doc('profile');

        // Kullanıcı Verisini Çek
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const userName = userData?.fullName || "Kullanıcı";

        // --- SENARYO A: ABONELİK (Satın Alma / Yenileme) ---
        if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
            const variantId = String(data.attributes.variant_id);
            const price = data.attributes.total_formatted;

            // 1. Kaç Gün Eklenecek?
            const daysToAdd = DURATION_MAP[variantId] || 30; // Bulamazsa 30 gün ver

            // 2. Mevcut Bitiş Tarihini Bul
            let currentEndsAt = new Date(); // Varsayılan: Bugün
            if (userData?.licenseEndsAt) {
                // Firebase Timestamp ise Date'e çevir
                currentEndsAt = userData.licenseEndsAt.toDate();
            }

            // 3. SÜRE HESAPLAMA MANTIĞI (STACKING)
            // Eğer mevcut süre geçmişte kaldıysa (bitmişse), Bugünden başlat + ekle
            // Eğer mevcut süre gelecekteyse (devam ediyorsa), Mevcut sürenin üstüne ekle

            let newEndsAt = new Date();
            const now = new Date();

            if (currentEndsAt > now) {
                // Süresi var, üstüne ekle (Örn: 2026 -> 2027 olsun)
                newEndsAt = new Date(currentEndsAt.setDate(currentEndsAt.getDate() + daysToAdd));
            } else {
                // Süresi bitmiş veya yeni başlıyor, bugüne ekle
                newEndsAt = new Date(now.setDate(now.getDate() + daysToAdd));
            }

            // 4. PAKET TÜRÜ KORUMASI (Admin Kuralı)
            // Siteden alımlarda accountType DEĞİŞTİRİLMEZ. Sadece süre uzatılır.
            // Eğer kullanıcının hiç accountType'ı yoksa (yeni üye), satın aldığı paketi ata.
            let accountTypeToSave = userData?.accountType;

            if (!accountTypeToSave) {
                // Yeni üye ise ilk paketini belirle
                if ([PLAN_IDS.BUSINESS_MONTHLY, PLAN_IDS.BUSINESS_6MONTH, PLAN_IDS.BUSINESS_YEARLY].includes(variantId)) {
                    accountTypeToSave = 'business';
                } else if ([PLAN_IDS.CORPORATE_MONTHLY, PLAN_IDS.CORPORATE_6MONTH, PLAN_IDS.CORPORATE_YEARLY].includes(variantId)) {
                    accountTypeToSave = 'corporate';
                } else {
                    accountTypeToSave = 'individual';
                }
            }

            // Veritabanını Güncelle
            await userRef.update({
                accountType: accountTypeToSave, // Mevcut türü korur
                licenseEndsAt: newEndsAt,       // Yeni hesaplanan tarihi yazar
                subscriptionStatus: 'active',
                subscriptionId: data.id,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 🔔 TELEGRAM BİLDİRİMİ
            await sendTelegramNotification(
                `✅ <b>SÜRE UZATILDI!</b>\n\n👤 <b>Müşteri:</b> ${userName}\n⏳ <b>Eklenen Süre:</b> ${daysToAdd} Gün\n📅 <b>Yeni Bitiş:</b> ${newEndsAt.toLocaleDateString('tr-TR')}\n💰 <b>Tutar:</b> ${price}`
            );
        }

        // --- SENARYO B: EK PAKET (ŞUBE/PERSONEL) ---
        else if (eventName === 'order_created') {
            const firstItemId = String(data.attributes.first_order_item.variant_id);
            const price = data.attributes.total_formatted;

            if (firstItemId === PLAN_IDS.ADDON_BRANCH) {
                await userRef.update({ customBranchLimit: FieldValue.increment(1) });
                await sendTelegramNotification(`🏢 <b>EK ŞUBE SATILDI!</b>\n👤 ${userName} +1 Şube aldı.\n💰 ${price}`);
            }

            if (firstItemId === PLAN_IDS.ADDON_STAFF) {
                await userRef.update({ customStaffLimit: FieldValue.increment(5) });
                await sendTelegramNotification(`👥 <b>EK PERSONEL SATILDI!</b>\n👤 ${userName} +5 Personel aldı.\n💰 ${price}`);
            }
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}