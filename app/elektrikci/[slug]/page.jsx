"use client";
import React, { useState, useEffect, useRef } from 'react';
import data from './data.json';
import { notFound } from 'next/navigation';
import {
    Phone,
    MessageCircle,
    Zap,
    ShieldCheck,
    Wrench,
    Cpu,
    CheckCircle2,
    MapPin,
    Clock,
    ChevronRight,
    Menu,
    X,
    Mail,
    Volume2,
    VolumeX
} from 'lucide-react';

export default function ElektrikciPage({ params }) {
    // Next.js 14+ kullanıyorsanız, params props'u asenkron olabilir. Gerekirse 'const { slug } = React.use(params);' şeklinde kullanın.
    const { slug } = params;
    const firma = data[slug];

    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Kullanıcı siteyle ilk etkileşime girdiğinde müziği başlatmayı dener (Tarayıcı izin verirse)
    useEffect(() => {
        const handleFirstInteraction = () => {
            if (audioRef.current && !isPlaying) {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch((err) => {
                    console.log("Otomatik oynatma tarayıcı tarafından engellendi, kullanıcının butona basması gerekiyor.");
                });
            }
            // Sadece ilk tıklamada çalışması için eventi temizliyoruz
            window.removeEventListener('click', handleFirstInteraction);
        };

        window.addEventListener('click', handleFirstInteraction);
        return () => window.removeEventListener('click', handleFirstInteraction);
    }, [isPlaying]);

    const toggleMusic = (e) => {
        e.stopPropagation(); // Butona tıklarken sayfa tıklaması algılanmasın
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Eğer URL'deki slug data.json'da yoksa 404 sayfasına yönlendir
    if (!firma) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
                <p className="text-slate-600">Firma Bulunamadı</p>
            </div>
        );
    }

    // --- Dinamik Veri Çözümlemeleri ---
    // Boşlukları temizlenmiş telefon numarası (Tıklamalar için)
    const cleanPhone = firma.telefon.replace(/\s+/g, '');

    // WhatsApp için numarayı uluslararası formata çevirme (+90 ekleme)
    let waPhone = cleanPhone;
    if (waPhone.startsWith('0')) {
        waPhone = `90${waPhone.substring(1)}`;
    }

    const whatsappMessage = `Merhaba ${firma.firmaAdi}, elektrik tesisatı/arızası hakkında bilgi almak istiyorum.`;

    // Adresten şehri çıkarma (Örn: "... Şişli / İstanbul" -> "İstanbul")
    const sehir = firma.adres.split('/').pop()?.trim() || "Türkiye";

    // Kurumsal logo görünümü için firma adını parçalama
    const firmaKelimeler = firma.firmaAdi.split(' ');
    const firmaIlkKelime = firmaKelimeler[0];
    const firmaKalanKelimeler = firmaKelimeler.slice(1).join(' ');

    // Marquee (Kayan Yazı) animasyonu için özel stil
    const customStyles = `
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-scroll {
      display: flex;
      width: 200%;
      animation: scroll 20s linear infinite;
    }
    .animate-scroll:hover {
      animation-play-state: paused;
    }
  `;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-[60px] md:pb-0">
            <style>{customStyles}</style>

            {/* HEADER */}
            <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-slate-900/95 backdrop-blur-sm py-5 text-white'}`}>
                <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
                    {/* Logo - Dinamik Firma Adı */}
                    <div className="flex items-center gap-2 max-w-[60%] md:max-w-md">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isScrolled ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}>
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div className="truncate">
                            <h1 className={`font-bold text-xl md:text-2xl tracking-tight truncate ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
                                {firmaIlkKelime} <span className="text-blue-500">{firmaKalanKelimeler}</span>
                            </h1>
                            <p className={`text-[10px] md:text-xs font-medium tracking-widest uppercase ${isScrolled ? 'text-slate-500' : 'text-slate-400'}`}>
                                Profesyonel Elektrik • {sehir}
                            </p>
                        </div>
                    </div>

                    {/* Desktop Nav & Contact */}
                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex gap-6 font-medium text-sm">
                            <a href="#hizmetler" className={`hover:text-blue-500 transition-colors ${isScrolled ? 'text-slate-700' : 'text-slate-200'}`}>Hizmetlerimiz</a>
                            <a href="#galeri" className={`hover:text-blue-500 transition-colors ${isScrolled ? 'text-slate-700' : 'text-slate-200'}`}>Sahadan Kareler</a>
                            <a href="#iletisim" className={`hover:text-blue-500 transition-colors ${isScrolled ? 'text-slate-700' : 'text-slate-200'}`}>İletişim</a>
                        </nav>
                        <div className="flex items-center gap-4">
                            <a
                                href={`tel:${cleanPhone}`}
                                className="flex items-center gap-2 font-bold text-lg hover:text-blue-500 transition-colors"
                                style={{ color: isScrolled ? '#1e293b' : 'white' }}
                            >
                                <Phone size={20} className={isScrolled ? 'text-blue-600' : 'text-blue-400'} />
                                {firma.telefon}
                            </a>
                            <a
                                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-green-500/30 flex items-center gap-2"
                            >
                                <MessageCircle size={18} />
                                WhatsApp
                            </a>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ?
                            <X size={28} className={isScrolled ? 'text-slate-900' : 'text-white'} /> :
                            <Menu size={28} className={isScrolled ? 'text-slate-900' : 'text-white'} />
                        }
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-slate-100 flex flex-col p-4 gap-4 z-50">
                        <a href="#hizmetler" onClick={() => setMobileMenuOpen(false)} className="text-slate-800 font-medium py-2 border-b border-slate-50">Hizmetlerimiz</a>
                        <a href="#galeri" onClick={() => setMobileMenuOpen(false)} className="text-slate-800 font-medium py-2 border-b border-slate-50">Sahadan Kareler</a>
                        <a href="#iletisim" onClick={() => setMobileMenuOpen(false)} className="text-slate-800 font-medium py-2">İletişim</a>
                        <div className="flex flex-col gap-3 mt-2">
                            <a href={`tel:${cleanPhone}`} className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                                <Phone size={20} /> Hemen Ara
                            </a>
                            <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer" className="bg-green-500 text-white text-center py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                                <MessageCircle size={20} /> WhatsApp'tan Yaz
                            </a>
                        </div>
                    </div>
                )}
            </header>

            {/* HERO SECTION */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-slate-900">
                {/* BURASI GÜNCELLENDİ: Arka plan resmi daha şeffaf ve görünür yapıldı */}
                <div className="absolute inset-0 z-0 opacity-50 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center"></div>
                {/* BURASI GÜNCELLENDİ: Siyah gradyan katmanı hafifletildi (yazıların okunduğu sol taraf koyu, sağa doğru açılıyor) */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/60 to-transparent z-0"></div>

                <div className="container mx-auto px-4 md:px-6 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-semibold mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            7/24 Acil Elektrik Servisi - {sehir}
                        </div>
                        <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
                            Profesyonel, Güvenli ve Hızlı <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Elektrik Tesisat</span> Çözümleri
                        </h2>
                        <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">
                            Eviniz veya iş yeriniz için garantili arıza tespiti, pano kurulumu ve sıfırdan tesisat çekimi. Uzman kadromuzla {sehir} bölgesinde dakikalar içinde kapınızdayız.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <a
                                href={`tel:${cleanPhone}`}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/30 group"
                            >
                                <Phone className="group-hover:animate-bounce" />
                                Ustayı Hemen Ara
                            </a>
                            <a
                                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-lg font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 transition-all backdrop-blur-sm"
                            >
                                <MessageCircle className="text-green-400" />
                                WhatsApp'tan Bilgi Al
                            </a>
                        </div>

                        <div className="mt-10 flex items-center gap-6 text-sm font-medium text-slate-400">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="text-blue-500" size={18} /> Garantili İşçilik
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="text-blue-500" size={18} /> TSE Belgeli Malzeme
                            </div>
                            <div className="hidden sm:flex items-center gap-2">
                                <CheckCircle2 className="text-blue-500" size={18} /> Ücretsiz Keşif
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PARTNERS (GÜVEN ALANI) */}
            <section className="py-8 bg-white border-b border-slate-200 overflow-hidden relative">
                <div className="container mx-auto px-4 mb-4">
                    <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider">Kullandığımız ve Çalıştığımız Güvenilir Markalar</p>
                </div>
                <div className="relative w-full overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10"></div>

                    <div className="animate-scroll flex items-center gap-12 md:gap-24 px-4 w-max">
                        {[...Array(2)].map((_, i) => (
                            <React.Fragment key={i}>
                                <span className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter">VIKO</span>
                                <span className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter">SIEMENS</span>
                                <span className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter">Schneider</span>
                                <span className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter">MUTLUSAN</span>
                                <span className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter">hlegrand</span>
                                <span className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter">HesKablo</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* HİZMETLERİMİZ */}
            <section id="hizmetler" className="py-20 bg-slate-50">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Uzmanlık Alanlarımız</h3>
                        <p className="text-slate-600 text-lg">Ev ve iş yerinizdeki tüm elektrik ihtiyaçları için modern, güvenli ve standartlara uygun kalıcı çözümler üretiyoruz.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Wrench size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">Arıza Tespiti ve Onarım</h4>
                            <p className="text-slate-600 mb-4">Atan sigortalar, kısa devreler ve yanmış prizler için hızlı tespit ve güvenli onarım hizmeti.</p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Cpu size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">Sıfırdan Daire Tesisatı</h4>
                            <p className="text-slate-600 mb-4">Tadilat veya yeni inşaatlarınızda yönetmeliğe uygun borulama, kablo çekimi ve linyelerin ayrılması.</p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ShieldCheck size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">Sigorta Panosu Kurulumu</h4>
                            <p className="text-slate-600 mb-4">Hayati önem taşıyan kaçak akım rölesi montajı, doğru amperajda otomat seçimi ve güvenli pano dizilimi.</p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Zap size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">Aydınlatma Sistemleri</h4>
                            <p className="text-slate-600 mb-4">Avize montajı, gizli LED şerit uygulamaları, spot aydınlatmalar ve dekoratif aydınlatma çözümleri.</p>
                        </div>

                        {/* Banner Kartı - Dinamik Veri */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 rounded-2xl shadow-lg text-white md:col-span-2 lg:col-span-2 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 opacity-10">
                                <Zap size={180} />
                            </div>
                            <h4 className="text-2xl md:text-3xl font-bold mb-4 relative z-10">Elektrik Şakaya Gelmez!</h4>
                            <p className="text-blue-100 mb-6 max-w-lg relative z-10 text-lg">Evinizin ve ailenizin güvenliği için yetkisiz kişilere müdahale ettirmeyin. {firma.firmaAdi} olarak bir telefon uzağınızdayız.</p>
                            <div className="relative z-10">
                                <a href={`tel:${cleanPhone}`} className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-lg hover:bg-slate-100 transition-colors">
                                    <Phone size={20} /> Hemen Uzman Çağır
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* GALERİ (SAHADAN KARELER) */}
            <section id="galeri" className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div className="max-w-2xl">
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Sahadan Kareler</h3>
                            <p className="text-slate-600 text-lg">Sözde değil, özde kalite. Tamamladığımız bazı projelerden ve saha çalışmalarımızdan örnekler.</p>
                        </div>
                        <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors group">
                            Referanslar için WhatsApp'tan Yazın <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group relative rounded-2xl overflow-hidden shadow-lg h-64 md:h-80">
                            {/* BURASI GÜNCELLENDİ: /images/galeri-1.jpg eklendi */}
                            <img src="/images/galeri-1.jpg" alt="Elektrik Panosu Kurulumu" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-6">
                                <h4 className="text-white font-bold text-xl">Profesyonel Pano Montajı</h4>
                                <p className="text-slate-300 text-sm">Düzenli ve güvenli sigorta kutusu altyapısı.</p>
                            </div>
                        </div>
                        <div className="group relative rounded-2xl overflow-hidden shadow-lg h-64 md:h-80">
                            {/* BURASI GÜNCELLENDİ: /images/galeri-2.jpg eklendi */}
                            <img src="/images/galeri-2.jpg" alt="Kablo Çekimi" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-6">
                                <h4 className="text-white font-bold text-xl">Sıfırdan Tesisat Çekimi</h4>
                                <p className="text-slate-300 text-sm">Yönetmeliğe uygun yanmaz kablo ve borulama.</p>
                            </div>
                        </div>
                        <div className="group relative rounded-2xl overflow-hidden shadow-lg h-64 md:h-80">
                            {/* BURASI GÜNCELLENDİ: /images/galeri-3.jpg eklendi */}
                            <img src="/images/galeri-3.jpg" alt="Aydınlatma Sistemleri" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-6">
                                <h4 className="text-white font-bold text-xl">Özel Aydınlatma Çözümleri</h4>
                                <p className="text-slate-300 text-sm">Spot ve gizli ışık uygulamaları.</p>
                            </div>
                        </div>
                        <div className="group relative rounded-2xl overflow-hidden shadow-lg h-64 md:h-80">
                            {/* BURASI GÜNCELLENDİ: /images/galeri-4.jpg eklendi */}
                            <img src="/images/galeri-4.jpg" alt="Arıza Tespiti" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-6">
                                <h4 className="text-white font-bold text-xl">Nokta Atışı Arıza Tespiti</h4>
                                <p className="text-slate-300 text-sm">Gelişmiş cihazlarla kısa devre ve kaçak kontrolü.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER & İLETİŞİM */}
            <footer id="iletisim" className="bg-slate-900 pt-20 pb-24 md:pb-10 border-t border-slate-800">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

                        {/* Marka Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 rounded-lg bg-blue-600 text-white">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <h1 className="font-bold text-2xl text-white">
                                    {firmaIlkKelime} <span className="text-blue-500">{firmaKalanKelimeler}</span>
                                </h1>
                            </div>
                            <p className="text-slate-400 mb-6 leading-relaxed">
                                Evinizin ve iş yerinizin elektrik tesisatı, onarımı ve bakımı için yılların tecrübesiyle {sehir} ve çevresinde 7/24 hizmetinizdeyiz. Güvenliğiniz önceliğimizdir.
                            </p>
                        </div>

                        {/* İletişim Bilgileri */}
                        <div>
                            <h4 className="text-white font-bold text-xl mb-6">İletişim</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li>
                                    <a href={`tel:${cleanPhone}`} className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400"><Phone size={18} /></div>
                                        <span className="font-semibold text-lg text-white">{firma.telefon}</span>
                                    </a>
                                </li>
                                <li>
                                    <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-green-400 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-green-400"><MessageCircle size={18} /></div>
                                        <span>WhatsApp Destek Hattı</span>
                                    </a>
                                </li>
                                <li>
                                    <a href={`mailto:${firma.email}`} className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400"><Mail size={18} /></div>
                                        <span>{firma.email}</span>
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Adres & Saatler */}
                        <div>
                            <h4 className="text-white font-bold text-xl mb-6">Çalışma Bilgileri</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0"><MapPin size={18} /></div>
                                    <span className="pt-2">{firma.adres}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0"><Clock size={18} /></div>
                                    <span className="pt-2">7 Gün 24 Saat Acil Servis<br /><span className="text-sm text-slate-500">(Normal Servis: 08:00 - 20:00)</span></span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
                        <p>&copy; {new Date().getFullYear()} {firma.firmaAdi}. Tüm hakları saklıdır.</p>
                        <p>Profesyonel Elektrik Tesisat Çözümleri</p>
                    </div>
                </div>
            </footer>

            {/* MOBİL YAPIŞKAN İLETİŞİM BARI (Ads için Kritik) */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 flex">
                <a
                    href={`tel:${cleanPhone}`}
                    className="flex-1 flex flex-col items-center justify-center py-3 bg-blue-600 text-white font-bold text-sm"
                >
                    <Phone size={20} className="mb-1" />
                    HEMEN ARA
                </a>
                <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex flex-col items-center justify-center py-3 bg-green-500 text-white font-bold text-sm"
                >
                    <MessageCircle size={20} className="mb-1" />
                    WHATSAPP
                </a>
            </div>

            {/* MASAÜSTÜ YAPIŞKAN WHATSAPP BUTONU */}
            <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white w-16 h-16 rounded-full items-center justify-center shadow-lg shadow-green-500/40 transition-transform hover:scale-110"
                title="WhatsApp'tan Ulaşın"
            >
                <MessageCircle size={32} />
                {/* Bildirim Noktası */}
                <span className="absolute top-0 right-0 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400 border-2 border-white"></span>
                </span>
            </a>

            {/* GİZLİ MÜZİK OYNATICI */}
            {/* Kendi müziğinizi eklemek için src kısmını "/images/benim-muzigim.mp3" yapabilirsiniz */}
            <audio ref={audioRef} src="/images/Resonance_Cascade.mp3" loop preload="auto" />

            {/* MÜZİK KONTROL BUTONU */}
            <button
                onClick={toggleMusic}
                className="fixed bottom-24 right-4 md:bottom-28 md:right-6 z-50 bg-slate-800 hover:bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-slate-900/20 transition-all border border-slate-700"
                title={isPlaying ? "Müziği Durdur" : "Müziği Başlat"}
            >
                {isPlaying ? (
                    <Volume2 size={20} className="text-blue-400 animate-pulse" />
                ) : (
                    <VolumeX size={20} className="text-slate-400" />
                )}
            </button>

        </div>
    );
}