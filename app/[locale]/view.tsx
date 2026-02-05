'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    CheckCircle2,
    ArrowRight,
    Zap,
    BarChart3,
    Smartphone,
    Globe,
    Menu,
    X,
    Briefcase,
    Wrench,
    Scissors,
    Car,
    ShoppingBag,
    MessageCircle,
    MapPin,
    Phone
} from 'lucide-react';

export default function HomeView({ dict, locale }: { dict: any, locale: string }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Varsayılan Değerler
    const [contactInfo, setContactInfo] = useState({
        whatsapp: '905555555555',
        address: 'Teknopark İstanbul, Pendik/İstanbul',
        phoneDisplay: '+90 850 123 45 67'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Firebase'den veriyi çekiyoruz
                const docRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'contact');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // KONSOL KONTROLÜ (Geliştirici aracında F12 -> Console sekmesinde görebilirsin)
                    console.log("Firebase'den Gelen Veri:", data);
                    console.log("Mevcut Dil (Locale):", locale);

                    // Yardımcı Fonksiyon: Numarayı temizle ve ülke kodu ekle
                    const formatPhone = (phone: string, prefix: string) => {
                        if (!phone) return '';
                        let clean = phone.replace(/[^0-9]/g, ''); // Sadece rakamları al
                        // Eğer başında 0 varsa sil (0530 -> 530)
                        if (clean.startsWith('0')) clean = clean.substring(1);
                        // Eğer ülke kodu ekli değilse ekle (530 -> 90530)
                        if (!clean.startsWith(prefix)) clean = prefix + clean;
                        return clean;
                    };

                    // 🌍 BÖLGESEL MANTIK (Lokalizasyon)
                    if (locale === 'tr') {
                        // --- TÜRKİYE SENARYOSU ---
                        console.log(">> TR Modu Aktif");
                        setContactInfo({
                            // Admin panelinden 'whatsappTR' alanını oku, yoksa varsayılanı kullan
                            whatsapp: formatPhone(data.whatsappTR || '905555555555', '90'),
                            address: data.addressTR || 'Teknopark İstanbul, Pendik/İstanbul',
                            phoneDisplay: data.whatsappTR ? `+90 ${data.whatsappTR}` : '+90 850 123 45 67'
                        });
                    } else {
                        // --- GLOBAL / ALMANYA SENARYOSU ---
                        console.log(">> GLOBAL Modu Aktif");
                        setContactInfo({
                            // Admin panelinden 'whatsappDE' alanını oku, yoksa varsayılanı kullan
                            whatsapp: formatPhone(data.whatsappDE || '4915112345678', '49'),
                            address: data.addressDE || 'Friedrichstraße 123, 10117 Berlin, Germany',
                            phoneDisplay: data.whatsappDE ? `+49 ${data.whatsappDE}` : '+49 151 1234 5678'
                        });
                    }
                } else {
                    console.log("Veri tabanı dokümanı bulunamadı!");
                }
            } catch (error) {
                console.error("İletişim bilgisi çekilemedi", error);
            }
        };

        fetchSettings();
    }, [locale]); // Locale değişirse tekrar çalış

    const features = [
        {
            title: dict.landing.features.f1_title,
            desc: dict.landing.features.f1_desc,
            icon: Wrench,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: dict.landing.features.f2_title,
            desc: dict.landing.features.f2_desc,
            icon: ShoppingBag,
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        },
        {
            title: dict.landing.features.f3_title,
            desc: dict.landing.features.f3_desc,
            icon: BarChart3,
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: dict.landing.features.f4_title,
            desc: dict.landing.features.f4_desc,
            icon: Globe,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    const sectors = [
        { name: dict.landing.sectors.s1, icon: Smartphone },
        { name: dict.landing.sectors.s2, icon: Scissors },
        { name: dict.landing.sectors.s3, icon: Car },
        { name: dict.landing.sectors.s4, icon: ShoppingBag },
        { name: dict.landing.sectors.s5, icon: Briefcase },
    ];

    const faqs = [
        { q: dict.landing.faq.q1, a: dict.landing.faq.a1 },
        { q: dict.landing.faq.q2, a: dict.landing.faq.a2 },
        { q: dict.landing.faq.q3, a: dict.landing.faq.a3 },
        { q: dict.landing.faq.q4, a: dict.landing.faq.a4 }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 relative">

            {/* 🔥 WHATSAPP DESTEK BUTONU */}
            <a
                href={`https://wa.me/${contactInfo.whatsapp}?text=Merhaba, Servis360...`}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 group flex items-center justify-center p-4 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg shadow-green-600/30 transition-all hover:scale-110 hover:-translate-y-1 animate-in fade-in zoom-in duration-500"
            >
                <MessageCircle className="w-8 h-8 fill-current" />
                <span className="absolute right-full mr-4 bg-white text-slate-900 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hidden md:block">
                    {dict.landing.footer.support_btn}
                </span>
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-slate-950"></span>
                </span>
            </a>

            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 left-0 w-full z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">Servis360</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium hover:text-blue-400 transition-colors">{dict.landing.nav.features}</a>
                        <a href="#sectors" className="text-sm font-medium hover:text-blue-400 transition-colors">{dict.landing.nav.sectors}</a>
                        <a href="#pricing" className="text-sm font-medium hover:text-blue-400 transition-colors">{dict.landing.nav.pricing}</a>
                        <a href="#faq" className="text-sm font-medium hover:text-blue-400 transition-colors">{dict.landing.nav.faq}</a>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link href={`/${locale}/login`} className="text-sm font-bold hover:text-white transition-colors">{dict.landing.nav.login}</Link>
                        <Link href={`/${locale}/register`} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:scale-105">
                            {dict.landing.nav.register}
                        </Link>
                    </div>

                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="md:hidden bg-slate-900 border-b border-slate-800 p-6 space-y-4 animate-in slide-in-from-top-5">
                        <a href="#features" className="block text-sm font-medium hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{dict.landing.nav.features}</a>
                        <a href="#sectors" className="block text-sm font-medium hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{dict.landing.nav.sectors}</a>
                        <a href="#pricing" className="block text-sm font-medium hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{dict.landing.nav.pricing}</a>
                        <Link href={`/${locale}/login`} className="block text-sm font-bold text-white bg-slate-800 p-3 rounded-lg text-center">{dict.landing.nav.login}</Link>
                        <Link href={`/${locale}/register`} className="block text-sm font-bold text-white bg-blue-600 p-3 rounded-lg text-center">{dict.landing.nav.register}</Link>
                    </div>
                )}
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 opacity-50"></div>

                <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        {dict.landing.hero.badge}
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {dict.landing.hero.title_start} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">{dict.landing.hero.title_highlight}</span> <br className="hidden md:block" />
                        {dict.landing.hero.title_end}
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        {dict.landing.hero.desc}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <Link href={`/${locale}/register`} className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/20 hover:scale-105 flex items-center justify-center gap-2">
                            {dict.landing.hero.btn_start} <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link href={`/${locale}/login`} className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 hover:border-slate-600">
                            {dict.landing.hero.btn_login}
                        </Link>
                    </div>

                    <div className="mt-6 flex justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                        <a
                            href={`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(dict.landing.hero.whatsapp_msg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 px-5 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:text-green-300 transition-all cursor-pointer"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-semibold tracking-wide">
                                {dict.landing.hero.contact_sales}
                            </span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>

                    <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-slate-500 text-sm font-medium animate-in fade-in duration-1000 delay-500">
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {dict.landing.hero.f1}</span>
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {dict.landing.hero.f2}</span>
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {dict.landing.hero.f3}</span>
                    </div>
                </div>
            </header>

            {/* --- FEATURES SECTION --- */}
            <section id="features" className="py-20 bg-slate-900 border-y border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{dict.landing.features.title}</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">{dict.landing.features.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-slate-950 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${f.bg} ${f.color} group-hover:scale-110 transition-transform`}>
                                    <f.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- SECTORS SECTION --- */}
            <section id="sectors" className="py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-900/5 -skew-y-3 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 relative">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="md:w-1/2">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{dict.landing.sectors.title}</h2>
                            <p className="text-slate-400 text-lg mb-8">
                                {dict.landing.sectors.desc}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {sectors.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
                                        <s.icon className="w-5 h-5 text-blue-400" />
                                        <span className="font-bold text-slate-200">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:w-1/2">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-30"></div>
                                <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span className="ml-auto text-xs text-slate-500">{dict.landing.sectors.preview}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1 h-24 bg-slate-800 rounded-xl animate-pulse"></div>
                                            <div className="flex-1 h-24 bg-slate-800 rounded-xl animate-pulse delay-75"></div>
                                        </div>
                                        <div className="h-40 bg-slate-800 rounded-xl animate-pulse delay-150"></div>
                                        <div className="h-12 bg-slate-800 rounded-xl animate-pulse delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRICING SECTION --- */}
            <section id="pricing" className="py-20 bg-slate-900 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{dict.landing.pricing.title}</h2>
                        <p className="text-slate-400">{dict.landing.pricing.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* AYLIK */}
                        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
                            <h3 className="text-lg font-bold text-slate-300 mb-2">{dict.landing.pricing.monthly_title}</h3>
                            <div className="text-3xl font-bold text-white mb-6">{dict.landing.pricing.monthly_price} <span className="text-sm font-normal text-slate-500">{dict.landing.pricing.monthly_unit}</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_all}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_unlimited_jobs}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_support}</li>
                            </ul>
                            <Link href={`/${locale}/register`} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-center transition-colors">{dict.landing.pricing.monthly_btn}</Link>
                        </div>

                        {/* YILLIK */}
                        <div className="bg-slate-950 p-8 rounded-3xl border border-blue-500/50 shadow-2xl shadow-blue-900/20 relative flex flex-col transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">{dict.landing.pricing.yearly_badge}</div>
                            <h3 className="text-lg font-bold text-white mb-2">{dict.landing.pricing.yearly_title}</h3>
                            <div className="text-3xl font-bold text-white mb-6">{dict.landing.pricing.yearly_price} <span className="text-sm font-normal text-slate-500">{dict.landing.pricing.yearly_unit}</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-white font-medium"><CheckCircle2 className="w-4 h-4 text-green-500" /> {dict.landing.pricing.f_free_months}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_prio_support}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_all}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_multi_branch}</li>
                            </ul>
                            <Link href={`/${locale}/register`} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-center transition-colors shadow-lg">{dict.landing.pricing.yearly_btn}</Link>
                        </div>

                        {/* KURUMSAL */}
                        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
                            <h3 className="text-lg font-bold text-slate-300 mb-2">{dict.landing.pricing.corp_title}</h3>
                            <div className="text-3xl font-bold text-white mb-6">{dict.landing.pricing.corp_price}</div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_unlimited_branch}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_integration}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {dict.landing.pricing.f_manager}</li>
                            </ul>
                            <Link href={`/${locale}/register`} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-center transition-colors">{dict.landing.pricing.corp_btn}</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQ SECTION --- */}
            <section id="faq" className="py-20">
                <div className="max-w-3xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">{dict.landing.faq.title}</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
                                <h3 className="font-bold text-white mb-2 text-lg">{faq.q}</h3>
                                <p className="text-slate-400 leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CTA & FOOTER --- */}
            <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/20 rounded-3xl p-12 text-center mb-20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-6">{dict.landing.footer.cta_title}</h2>
                        <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">{dict.landing.footer.cta_desc}</p>
                        <Link href={`/${locale}/register`} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                            {dict.landing.footer.cta_btn} <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 border-t border-slate-900 pt-10">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-2xl font-bold text-white tracking-tight">Servis360</span>
                            </div>
                            <p className="text-slate-500 text-sm max-w-xs">
                                {dict.landing.footer.desc}
                            </p>
                        </div>

                        {/* 🔥 GÜVEN VEREN İLETİŞİM ALANI */}
                        <div className="col-span-1 md:col-span-2 flex flex-col items-start md:items-end">
                            <h4 className="text-white font-bold mb-4">{dict.landing.footer.contact_title}</h4>
                            <div className="space-y-3 text-right">
                                <div className="flex items-center gap-2 text-slate-400 text-sm justify-end">
                                    <span>{contactInfo.address}</span>
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm justify-end">
                                    <span>{contactInfo.phoneDisplay}</span>
                                    <Phone className="w-4 h-4 text-green-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500 border-t border-slate-900 pt-8">
                        <p>&copy; {new Date().getFullYear()} Servis360. {dict.landing.footer.rights}</p>
                        <div className="flex gap-6">
                            <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">{dict.landing.footer.link_terms}</Link>
                            <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">{dict.landing.footer.link_privacy}</Link>
                            <a href="#" className="hover:text-white transition-colors">{dict.landing.footer.link_contact}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}