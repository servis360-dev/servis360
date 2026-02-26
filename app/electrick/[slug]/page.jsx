"use client";
import React, { useState, useEffect } from 'react';
import data from './data.json';
import { notFound } from 'next/navigation';

export default function ElektrikciPage({ params }) {
    const { slug } = params;
    const firma = data[slug];

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showCookie, setShowCookie] = useState(false);
    const [formSuccess, setFormSuccess] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        if (!localStorage.getItem('cookiesAccepted')) {
            setTimeout(() => setShowCookie(true), 1000);
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleCookieAccept = () => {
        localStorage.setItem('cookiesAccepted', 'true');
        setShowCookie(false);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setFormSuccess(true);
        e.target.reset();
        setTimeout(() => setFormSuccess(false), 5000);
    };

    if (!firma) {
        return notFound();
    }

    // Dinamik şehir ismini adresten çekiyoruz (Örn: "10115 Berlin" -> "Berlin")
    const sehir = firma.adres.split(' ').pop();

    return (
        <div className="font-sans text-[#1E1E1E] bg-white pb-[60px] md:pb-0 relative">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            {/* Üst Bilgi Çubuğu (Desktop) */}
            <div className="hidden md:block bg-[#1E1E1E] text-white text-sm py-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex space-x-6">
                        <span className="flex items-center"><i className="fa-solid fa-clock text-[#FFD200] mr-2"></i> 24/7 Notdienst verfügbar</span>
                        <span className="flex items-center"><i className="fa-solid fa-certificate text-[#FFD200] mr-2"></i> Zertifizierter Meisterbetrieb</span>
                    </div>
                    <div className="flex space-x-6">
                        <a href={`mailto:${firma.email}`} className="hover:text-[#FFD200] transition"><i className="fa-solid fa-envelope mr-2"></i>{firma.email}</a>
                    </div>
                </div>
            </div>

            {/* Yapışkan (Sticky) Header */}
            <header className={`bg-white sticky top-0 z-40 transition-all duration-300 border-b border-gray-100 ${isScrolled ? 'shadow-md py-0' : ''}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <a href="#" className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-[#0057B8] rounded-lg flex items-center justify-center text-[#FFD200] text-2xl">
                                    <i className="fa-solid fa-bolt"></i>
                                </div>
                                <div>
                                    <h1 className="font-bold text-xl leading-tight text-[#1E1E1E]">{firma.firmaAdi.split(' ')[0]}<span className="text-[#0057B8]"> {firma.firmaAdi.split(' ').slice(1).join(' ')}</span></h1>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">GmbH {sehir}</p>
                                </div>
                            </a>
                        </div>

                        {/* Desktop Menü */}
                        <nav className="hidden md:flex space-x-8">
                            <a href="#leistungen" className="text-[#1E1E1E] hover:text-[#0057B8] font-medium transition">Leistungen</a>
                            <a href="#warum-wir" className="text-[#1E1E1E] hover:text-[#0057B8] font-medium transition">Warum Wir?</a>
                            <a href="#bewertungen" className="text-[#1E1E1E] hover:text-[#0057B8] font-medium transition">Bewertungen</a>
                            <a href="#kontakt" className="text-[#1E1E1E] hover:text-[#0057B8] font-medium transition">Kontakt</a>
                        </nav>

                        {/* Desktop CTA */}
                        <div className="hidden md:flex items-center space-x-4">
                            <div className="text-right mr-2">
                                <p className="text-xs text-gray-500 font-medium">Jetzt anrufen</p>
                                <a href={`tel:${firma.telefon.replace(/\s+/g, '')}`} className="text-lg font-bold text-[#0057B8] hover:text-[#004494]">{firma.telefon}</a>
                            </div>
                            <a href="#kontakt" className="bg-[#FFD200] hover:bg-[#E6BD00] text-[#1E1E1E] font-bold py-2.5 px-6 rounded-md transition-colors shadow-md">
                                Angebot anfordern
                            </a>
                        </div>

                        {/* Mobil Menü Butonu */}
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[#1E1E1E] hover:text-[#0057B8] focus:outline-none p-2">
                                <i className="fa-solid fa-bars text-2xl"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobil Menü */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg">
                        <div className="px-4 pt-2 pb-6 space-y-1">
                            <a href="#leistungen" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-[#1E1E1E] hover:bg-gray-50 rounded-md">Leistungen</a>
                            <a href="#warum-wir" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-[#1E1E1E] hover:bg-gray-50 rounded-md">Warum Wir?</a>
                            <a href="#bewertungen" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-[#1E1E1E] hover:bg-gray-50 rounded-md">Bewertungen</a>
                            <a href="#kontakt" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-[#1E1E1E] hover:bg-gray-50 rounded-md">Kontakt</a>
                        </div>
                    </div>
                )}
            </header>

            <main>
                {/* 1. Hero Alanı */}
                <section className="relative bg-[#1E1E1E] text-white">
                    <div className="absolute inset-0">
                        <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop" alt="Elektroinstallation" className="w-full h-full object-cover opacity-40" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1E1E1E] via-[#1E1E1E]/80 to-transparent"></div>
                    </div>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
                        <div className="max-w-2xl">
                            <div className="inline-block bg-[#0057B8] text-white text-xs font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
                                24/7 Notdienst in {sehir}
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                                Ihr zuverlässiger Elektriker in <span className="text-[#FFD200]">{sehir}</span>
                            </h2>
                            <p className="text-lg md:text-xl text-gray-300 mb-10 font-light">
                                Schnell. Professionell. Zertifiziert. Wir sind Ihr Meisterbetrieb für sichere und moderne Elektroinstallationen – für Privathaushalte und Gewerbe.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a href={`tel:${firma.telefon.replace(/\s+/g, '')}`} className="flex items-center justify-center bg-[#0057B8] hover:bg-[#004494] text-white font-bold py-4 px-8 rounded-md transition-colors text-lg shadow-lg shadow-[#0057B8]/30 group">
                                    <i className="fa-solid fa-phone mr-3 group-hover:rotate-12 transition-transform"></i>
                                    Jetzt anrufen
                                </a>
                                <a href="#kontakt" className="flex items-center justify-center bg-white hover:bg-gray-100 text-[#1E1E1E] font-bold py-4 px-8 rounded-md transition-colors text-lg border border-gray-200">
                                    Kostenloses Angebot
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Leistungen (Hizmetler) */}
                <section id="leistungen" className="py-20 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h3 className="text-[#0057B8] font-bold tracking-wider uppercase text-sm mb-2">Unsere Expertise</h3>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#1E1E1E] mb-4">Unsere Leistungen für Sie</h2>
                            <p className="text-gray-600">Als zertifizierter Meisterbetrieb bieten wir Ihnen das gesamte Spektrum der modernen Elektrotechnik aus einer Hand.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { icon: 'fa-bolt', title: 'Elektroinstallation', desc: 'Komplette Neu- und Altbauinstallationen nach modernsten Sicherheitsstandards.' },
                                { icon: 'fa-lightbulb', title: 'Beleuchtungssysteme', desc: 'Individuelle Lichtkonzepte und energieeffiziente LED-Technik.' },
                                { icon: 'fa-plug', title: 'Steckdosen & Schalter', desc: 'Fachgerechte Erweiterung und Reparatur Ihrer Anschlüsse.' },
                                { icon: 'fa-house-signal', title: 'Smart Home', desc: 'Intelligente Haussteuerung für mehr Komfort und Sicherheit.' },
                                { icon: 'fa-triangle-exclamation', title: 'Reparatur & Notdienst', desc: 'Schnelle Hilfe bei Stromausfall und elektrischen Störungen.', notdienst: true },
                                { icon: 'fa-solar-panel', title: 'Photovoltaikanlagen', desc: 'Nachhaltige Energielösungen. Beratung und Installation.' }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                                    {item.notdienst && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">24/7</div>}
                                    <div className={`w-14 h-14 ${item.notdienst ? 'bg-red-50 text-red-600 group-hover:bg-red-600' : 'bg-blue-50 text-[#0057B8] group-hover:bg-[#0057B8]'} rounded-lg flex items-center justify-center text-2xl mb-6 group-hover:text-white transition-colors`}>
                                        <i className={`fa-solid ${item.icon}`}></i>
                                    </div>
                                    <h4 className="text-xl font-bold text-[#1E1E1E] mb-3">{item.title}</h4>
                                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. Warum Wir? (Neden Biz) */}
                <section id="warum-wir" className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="w-full lg:w-1/2 relative">
                                <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop" alt="Elektriker bei der Arbeit" className="rounded-2xl shadow-2xl relative z-10 w-full h-auto object-cover aspect-[4/3]" />
                                <div className="absolute -bottom-6 -right-6 w-full h-full border-4 border-[#FFD200] rounded-2xl z-0 hidden md:block"></div>
                                <div className="absolute -left-6 top-10 bg-white p-4 rounded-xl shadow-xl z-20 flex items-center gap-4">
                                    <div className="bg-[#0057B8] text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">15+</div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-semibold">Jahre</p>
                                        <p className="font-bold text-[#1E1E1E]">Erfahrung</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full lg:w-1/2">
                                <h3 className="text-[#0057B8] font-bold tracking-wider uppercase text-sm mb-2">Ihre Vorteile</h3>
                                <h2 className="text-3xl md:text-4xl font-bold text-[#1E1E1E] mb-6">Warum Sie sich für uns entscheiden sollten</h2>
                                <p className="text-gray-600 mb-8 leading-relaxed">Als eingetragener Meisterbetrieb garantieren wir Ihnen Sicherheit, Qualität und Termintreue bei jedem Projekt.</p>
                                <ul className="space-y-5">
                                    {[
                                        { title: 'Eingetragener Meisterbetrieb', desc: 'Höchste Qualitätsstandards nach VDE-Normen.' },
                                        { title: 'Zertifizierte Fachkräfte', desc: 'Unser Team wird regelmäßig geschult.' },
                                        { title: 'Transparente Preise', desc: 'Keine versteckten Kosten.' },
                                    ].map((li, i) => (
                                        <li key={i} className="flex items-start">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FFD200] flex items-center justify-center text-[#1E1E1E] mt-0.5 mr-4"><i className="fa-solid fa-check text-xs"></i></span>
                                            <div>
                                                <h4 className="font-bold text-[#1E1E1E]">{li.title}</h4>
                                                <p className="text-sm text-gray-600 mt-1">{li.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                    <li className="flex items-start">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0057B8] flex items-center justify-center text-white mt-0.5 mr-4 shadow-md shadow-[#0057B8]/30"><i className="fa-solid fa-phone text-xs"></i></span>
                                        <div>
                                            <h4 className="font-bold text-[#0057B8]">24h Notdienst in {sehir}</h4>
                                            <p className="text-sm text-gray-600 mt-1">Bei Stromausfall sind wir rund um die Uhr für Sie da.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Bewertungen (Yorumlar) */}
                <section id="bewertungen" className="py-20 bg-[#1E1E1E] text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className="flex justify-center items-center space-x-1 text-[#FFD200] text-2xl mb-4">
                                <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Das sagen unsere Kunden</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { init: 'TM', name: 'Thomas Müller', role: `Privatkunde, ${sehir}`, text: 'Sehr schneller und professioneller Service! Der Notdienst war mitten in der Nacht innerhalb von 30 Minuten da. Transparente Preise, absolut empfehlenswert.' },
                                { init: 'SK', name: 'Sarah Klein', role: 'Hausbesitzerin', text: 'Wir haben im Zuge unserer Altbausanierung das komplette Haus neu verkabeln lassen. Das Team hat super sauber und extrem zuverlässig gearbeitet.' },
                                { init: 'MB', name: 'Michael Becker', role: 'Gewerbekunde', text: 'Beratung, Planung und Installation unserer neuen Smart Home Anlage sowie der Wallbox liefen reibungslos. Sehr freundliche und kompetente Mitarbeiter.' }
                            ].map((rev, i) => (
                                <div key={i} className="bg-gray-800 p-8 rounded-xl relative">
                                    <i className="fa-solid fa-quote-right absolute top-6 right-8 text-5xl text-gray-700 opacity-50"></i>
                                    <div className="flex text-[#FFD200] text-sm mb-4">
                                        <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i>
                                    </div>
                                    <p className="text-gray-300 mb-6 italic">"{rev.text}"</p>
                                    <div className="flex items-center gap-4 mt-auto">
                                        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl text-gray-300">{rev.init}</div>
                                        <div>
                                            <h4 className="font-bold">{rev.name}</h4>
                                            <p className="text-xs text-gray-400">{rev.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 5. Kontakt (İletişim) */}
                <section id="kontakt" className="py-20 bg-[#F8FAFC] relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-100 opacity-50"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="flex flex-col lg:flex-row">
                                {/* İletişim Bilgileri */}
                                <div className="w-full lg:w-5/12 bg-[#0057B8] text-white p-10 md:p-12 flex flex-col justify-between">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-2">Kontaktieren Sie uns</h2>
                                        <p className="text-blue-100 mb-10">Haben Sie Fragen oder benötigen Sie ein Angebot?</p>
                                        <div className="space-y-8">
                                            <div className="flex items-start">
                                                <div className="mt-1 bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-location-dot"></i></div>
                                                <div className="ml-4">
                                                    <h4 className="font-bold text-lg">Adresse</h4>
                                                    <p className="text-blue-100 mt-1">{firma.adres}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="mt-1 bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-phone"></i></div>
                                                <div className="ml-4">
                                                    <h4 className="font-bold text-lg">Telefon</h4>
                                                    <a href={`tel:${firma.telefon.replace(/\s+/g, '')}`} className="text-blue-100 mt-1 hover:text-white transition block">{firma.telefon}</a>
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <div className="mt-1 bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"><i className="fa-solid fa-envelope"></i></div>
                                                <div className="ml-4">
                                                    <h4 className="font-bold text-lg">E-Mail</h4>
                                                    <a href={`mailto:${firma.email}`} className="text-blue-100 mt-1 hover:text-white transition block">{firma.email}</a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form */}
                                <div className="w-full lg:w-7/12 p-10 md:p-12">
                                    <h3 className="text-2xl font-bold text-[#1E1E1E] mb-6">Kostenloses Angebot anfordern</h3>
                                    {formSuccess && (
                                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 relative">
                                            <strong className="font-bold">Vielen Dank!</strong> Ihre Nachricht wurde erfolgreich gesendet.
                                        </div>
                                    )}
                                    <form onSubmit={handleFormSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name / Firma *</label>
                                                <input type="text" id="name" required className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#0057B8] focus:ring-2 focus:ring-[#0057B8]/20 outline-none transition" />
                                            </div>
                                            <div>
                                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer *</label>
                                                <input type="tel" id="phone" required className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#0057B8] focus:ring-2 focus:ring-[#0057B8]/20 outline-none transition" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Wie können wir helfen? *</label>
                                            <textarea id="message" rows="4" required className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#0057B8] focus:ring-2 focus:ring-[#0057B8]/20 outline-none transition resize-none"></textarea>
                                        </div>
                                        <button type="submit" className="w-full bg-[#0057B8] hover:bg-[#004494] text-white font-bold py-4 rounded-md transition-colors text-lg shadow-md flex justify-center items-center">
                                            Nachricht senden <i className="fa-solid fa-paper-plane ml-2"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-[#1E1E1E] text-gray-400 pt-16 pb-8 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                        <div>
                            <a href="#" className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-[#0057B8] rounded flex items-center justify-center text-[#FFD200] text-xl"><i className="fa-solid fa-bolt"></i></div>
                                <h2 className="font-bold text-xl text-white">Elektro<span className="text-[#0057B8]">Meister</span></h2>
                            </a>
                            <p className="mb-6 text-sm">Ihr zuverlässiger Meisterbetrieb für Elektroinstallationen, Smart Home und Photovoltaik in {sehir} und Umgebung.</p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6">Schnelllinks</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="#leistungen" className="hover:text-[#0057B8] transition">Leistungen</a></li>
                                <li><a href="#warum-wir" className="hover:text-[#0057B8] transition">Über uns</a></li>
                                <li><a href="#kontakt" className="hover:text-[#0057B8] transition">Kontakt</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm">
                        <p>© 2024 ElektroMeister GmbH. Alle Rechte vorbehalten.</p>
                    </div>
                </div>
            </footer>

            {/* Sticky Mobil Alt Bar */}
            <div className="fixed bottom-0 left-0 w-full z-50 flex md:hidden shadow-[0_-4px_15px_rgba(0,0,0,0.1)]">
                <a href={`tel:${firma.telefon.replace(/\s+/g, '')}`} className="flex-1 bg-[#0057B8] text-white flex items-center justify-center py-4 font-bold text-[15px] border-r border-blue-600/50">
                    <i className="fa-solid fa-phone mr-2 text-lg"></i> Jetzt anrufen
                </a>
            </div>

            {/* DSGVO Cookie Banner */}
            {showCookie && (
                <div className="fixed bottom-[75px] md:bottom-4 left-4 right-4 md:left-8 md:right-auto md:w-96 bg-white p-6 rounded-xl shadow-2xl z-50 border border-gray-100">
                    <h4 className="font-bold text-[#1E1E1E] mb-2">Wir verwenden Cookies 🍪</h4>
                    <p className="text-sm text-gray-600 mb-4">Um unsere Webseite optimal zu gestalten, verwenden wir Cookies.</p>
                    <button onClick={handleCookieAccept} className="w-full bg-[#0057B8] hover:bg-[#004494] text-white font-bold py-2 rounded text-sm transition">Alle Akzeptieren</button>
                </div>
            )}
        </div>
    );
}