'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Firebase bağlantısı
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
    MessageCircle // WhatsApp İkonu
} from 'lucide-react';

export default function Home() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('905555555555'); // Varsayılan numara

    // 🔥 SİSTEM AYARLARINDAN WHATSAPP NUMARASINI ÇEK
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.contact?.whatsapp) {
                        // Numarayı temizle (boşlukları sil)
                        const cleanNumber = data.contact.whatsapp.replace(/[^0-9]/g, '');
                        setWhatsappNumber(cleanNumber);
                    }
                }
            } catch (error) {
                console.error("İletişim bilgisi çekilemedi", error);
            }
        };

        fetchSettings();
    }, []);

    const features = [
        {
            title: "İş & Arıza Takibi",
            desc: "Müşteri cihazlarını ve iş emirlerini adım adım takip edin. SMS ve WhatsApp ile otomatik bilgilendirme yapın.",
            icon: Wrench,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Stok ve Envanter",
            desc: "Yedek parça ve ürün stoklarınızı şube bazlı yönetin. Kritik stok uyarıları ile asla parça sıkıntısı çekmeyin.",
            icon: ShoppingBag,
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        },
        {
            title: "Ön Muhasebe & Kasa",
            desc: "Gelir, gider ve cari hesaplarınızı tek ekrandan yönetin. Günlük, haftalık ve aylık kâr raporları alın.",
            icon: BarChart3,
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: "Çoklu Şube Yönetimi",
            desc: "Birden fazla şubeniz mi var? Hepsini tek bir panelden, ister ayrı ayrı ister toplu olarak yönetin.",
            icon: Globe,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    const sectors = [
        { name: "Teknik Servisler", icon: Smartphone },
        { name: "Güzellik Merkezleri", icon: Scissors },
        { name: "Oto Servisleri", icon: Car },
        { name: "Perakende Satış", icon: ShoppingBag },
        { name: "Diğer İşletmeler", icon: Briefcase },
    ];

    const faqs = [
        { q: "Ücretsiz deneyebilir miyim?", a: "Evet, kayıt olduğunuzda tüm özellikleri sınırsızca deneyebilmeniz için size özel deneme süresi tanımlıyoruz." },
        { q: "Kurulum gerekiyor mu?", a: "Hayır, Servis360 tamamen bulut tabanlıdır. İnterneti olan her cihazdan (Telefon, Tablet, PC) anında erişebilirsiniz." },
        { q: "Verilerim güvende mi?", a: "Kesinlikle. Verileriniz Google Cloud altyapısında, endüstri standardı şifreleme ile günlük olarak yedeklenmektedir." },
        { q: "Şube sınırı var mı?", a: "Paketinize göre şube ve personel sayısını dilediğiniz gibi artırabilirsiniz." }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 relative">

            {/* 🔥 WHATSAPP DESTEK BUTONU (SABİT) */}
            <a
                href={`https://wa.me/${whatsappNumber}?text=Merhaba, Servis360 hakkında bilgi almak istiyorum.`}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 group flex items-center justify-center p-4 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg shadow-green-600/30 transition-all hover:scale-110 hover:-translate-y-1 animate-in fade-in zoom-in duration-500"
            >
                <MessageCircle className="w-8 h-8 fill-current" />
                <span className="absolute right-full mr-4 bg-white text-slate-900 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hidden md:block">
                    Canlı Destek
                </span>
                {/* Ping Animasyonu */}
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

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium hover:text-blue-400 transition-colors">Özellikler</a>
                        <a href="#sectors" className="text-sm font-medium hover:text-blue-400 transition-colors">Sektörler</a>
                        <a href="#pricing" className="text-sm font-medium hover:text-blue-400 transition-colors">Fiyatlar</a>
                        <a href="#faq" className="text-sm font-medium hover:text-blue-400 transition-colors">SSS</a>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/login" className="text-sm font-bold hover:text-white transition-colors">Giriş Yap</Link>
                        <Link href="/register" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:scale-105">
                            Ücretsiz Başla
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden bg-slate-900 border-b border-slate-800 p-6 space-y-4 animate-in slide-in-from-top-5">
                        <a href="#features" className="block text-sm font-medium hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>Özellikler</a>
                        <a href="#sectors" className="block text-sm font-medium hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>Sektörler</a>
                        <a href="#pricing" className="block text-sm font-medium hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>Fiyatlar</a>
                        <Link href="/login" className="block text-sm font-bold text-white bg-slate-800 p-3 rounded-lg text-center">Giriş Yap</Link>
                        <Link href="/register" className="block text-sm font-bold text-white bg-blue-600 p-3 rounded-lg text-center">Hemen Kayıt Ol</Link>
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
                        Yeni Nesil Esnaf Yönetim Paneli
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        İşletmenizi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">360°</span> <br className="hidden md:block" />
                        Kontrol Altına Alın.
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        Servis takibi, stok yönetimi, cari hesaplar ve personel yönetimi tek bir platformda.
                        Karmaşık Excel dosyalarından kurtulun, işinize odaklanın.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/20 hover:scale-105 flex items-center justify-center gap-2">
                            Hemen Başla <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 hover:border-slate-600">
                            Giriş Yap
                        </Link>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-sm font-medium animate-in fade-in duration-1000 delay-500">
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Kredi Kartı Gerekmez</span>
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 7/24 Destek</span>
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Bulut Tabanlı</span>
                    </div>
                </div>
            </header>

            {/* --- FEATURES SECTION --- */}
            <section id="features" className="py-20 bg-slate-900 border-y border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Her İşletme İçin Tam Çözüm</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">İhtiyacınız olan tüm araçlar, kullanımı kolay tek bir panelde birleşti.</p>
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
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Sektörünüze Özel Çözümler</h2>
                            <p className="text-slate-400 text-lg mb-8">
                                Servis360, esnek altyapısı sayesinde farklı sektörlerin ihtiyaçlarına göre şekillenir.
                                İster teknik servis olun, ister güzellik merkezi; iş akışınızı dijitalleştirin.
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
                                        <span className="ml-auto text-xs text-slate-500">Dashboard Önizleme</span>
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
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Şeffaf Fiyatlandırma</h2>
                        <p className="text-slate-400">Gizli ücret yok. İşletmenizin büyüklüğüne göre en uygun planı seçin.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* AYLIK */}
                        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
                            <h3 className="text-lg font-bold text-slate-300 mb-2">Aylık Paket</h3>
                            <div className="text-3xl font-bold text-white mb-6">Esnek Fiyat <span className="text-sm font-normal text-slate-500">/ay</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Tüm Özellikler</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sınırsız İş Kaydı</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 7/24 Destek</li>
                            </ul>
                            <Link href="/register" className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-center transition-colors">Seç</Link>
                        </div>

                        {/* YILLIK */}
                        <div className="bg-slate-950 p-8 rounded-3xl border border-blue-500/50 shadow-2xl shadow-blue-900/20 relative flex flex-col transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">POPÜLER</div>
                            <h3 className="text-lg font-bold text-white mb-2">Yıllık Pro</h3>
                            <div className="text-3xl font-bold text-white mb-6">Avantajlı <span className="text-sm font-normal text-slate-500">/yıl</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-white font-medium"><CheckCircle2 className="w-4 h-4 text-green-500" /> 2 Ay Ücretsiz</li>
                                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Öncelikli Destek</li>
                                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Tüm Özellikler</li>
                                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Çoklu Şube Desteği</li>
                            </ul>
                            <Link href="/register" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-center transition-colors shadow-lg">Hemen Başla</Link>
                        </div>

                        {/* KURUMSAL */}
                        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
                            <h3 className="text-lg font-bold text-slate-300 mb-2">Holding / Zincir</h3>
                            <div className="text-3xl font-bold text-white mb-6">Özel Teklif</div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sınırsız Şube</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Özel Entegrasyon</li>
                                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Özel Hesap Yöneticisi</li>
                            </ul>
                            <Link href="/register" className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-center transition-colors">İletişime Geç</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQ SECTION --- */}
            <section id="faq" className="py-20">
                <div className="max-w-3xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">Sıkça Sorulan Sorular</h2>
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
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-6">İşletmenizi Büyütmeye Hazır Mısınız?</h2>
                        <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">Bugün binlerce mutlu işletme arasına katılın. Kurulum yok, kredi kartı yok.</p>
                        <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                            Ücretsiz Hesap Oluştur <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500 border-t border-slate-900 pt-8">
                        <p>&copy; {new Date().getFullYear()} Servis360. Tüm hakları saklıdır.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a>
                            <a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a>
                            <a href="#" className="hover:text-white transition-colors">İletişim</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}