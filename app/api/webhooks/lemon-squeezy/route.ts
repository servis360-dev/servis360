import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// 🔥 AYARLAR: Lemon Squeezy Variant ID'leri (Senin Verdiğin Gerçek ID'ler)
const PLAN_IDS = {
    // BİREYSEL (Individual)
    INDIVIDUAL_MONTHLY: '1275947',
    INDIVIDUAL_6MONTH: '1275951',
    INDIVIDUAL_YEARLY: '1275952',

    // ESNAF (Business)
    BUSINESS_MONTHLY: '1275953',
    BUSINESS_6MONTH: '1275958',
    BUSINESS_YEARLY: '1275960',

    // KURUMSAL (Enterprise)
    CORPORATE_MONTHLY: '1275966',
    CORPORATE_6MONTH: '1275972',
    CORPORATE_YEARLY: '1275976',

    // EK PAKETLER (Add-ons)
    ADDON_BRANCH: '1275989',
    ADDON_STAFF: '1276003'
};

// 🔥 TELEGRAM GÖNDERME FONKSİYONU
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
                parse_mode: 'HTML' // Kalın/İtalik yazı için
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

        // Kullanıcı adını çekmeye çalış (Bildirim için)
        let userName = "Kullanıcı";
        try {
            const userSnap = await userRef.get();
            if (userSnap.exists) {
                userName = userSnap.data()?.fullName || "Kullanıcı";
            }
        } catch (e) { }

        // --- SENARYO A: ABONELİK OLUŞTURULDU / YENİLENDİ ---
        if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
            const variantId = String(data.attributes.variant_id);
            const renwesAt = new Date(data.attributes.renews_at);
            const price = data.attributes.total_formatted; // Örn: $9.90

            let accountType = 'individual';
            let planName = 'Bireysel';

            // Hangi Paket?
            if ([PLAN_IDS.BUSINESS_MONTHLY, PLAN_IDS.BUSINESS_6MONTH, PLAN_IDS.BUSINESS_YEARLY].includes(variantId)) {
                accountType = 'business'; // Esnaf
                planName = 'Esnaf (Pro)';
            } else if ([PLAN_IDS.CORPORATE_MONTHLY, PLAN_IDS.CORPORATE_6MONTH, PLAN_IDS.CORPORATE_YEARLY].includes(variantId)) {
                accountType = 'corporate'; // Kurumsal
                planName = 'Kurumsal (Enterprise)';
            }

            // Veritabanını Güncelle
            await userRef.update({
                accountType: accountType,
                licenseEndsAt: renwesAt,
                subscriptionStatus: 'active',
                subscriptionId: data.id,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 🔔 TELEGRAM BİLDİRİMİ
            await sendTelegramNotification(
                `🚀 <b>YENİ ABONELİK!</b>\n\n👤 <b>Müşteri:</b> ${userName}\n📦 <b>Paket:</b> ${planName}\n💰 <b>Tutar:</b> ${price}\n📅 <b>Bitiş:</b> ${renwesAt.toLocaleDateString('tr-TR')}`
            );
        }

        // --- SENARYO B: İPTAL EDİLDİ ---
        else if (eventName === 'subscription_cancelled') {
            await userRef.update({ subscriptionStatus: 'cancelled_pending' });
            await sendTelegramNotification(`⚠️ <b>ABONELİK İPTALİ</b>\n👤 ${userName} aboneliğini iptal etti (Süre bitene kadar kullanacak).`);
        }

        // --- SENARYO C: SÜRE BİTTİ ---
        else if (eventName === 'subscription_expired') {
            await userRef.update({
                subscriptionStatus: 'expired',
                licenseEndsAt: FieldValue.serverTimestamp()
            });
            await sendTelegramNotification(`❌ <b>LİSANS DOLDU</b>\n👤 ${userName} kullanıcısının süresi bitti.`);
        }

        // --- SENARYO D: EK PAKET (ŞUBE/PERSONEL) ---
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