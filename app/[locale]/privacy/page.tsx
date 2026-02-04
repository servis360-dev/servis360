export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto py-20 px-6 prose dark:prose-invert">
            <h1>Gizlilik Politikası</h1>
            <p>Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
            <p>Servis360 olarak gizliliğinize önem veriyoruz. Bu politika, verilerinizin nasıl toplandığını ve kullanıldığını açıklar.</p>
            <h3>1. Toplanan Veriler</h3>
            <p>Kayıt olurken adınız, e-postanız ve işletme bilgileriniz alınır.</p>
            <h3>2. Veri Güvenliği</h3>
            <p>Verileriniz endüstri standardı şifreleme ile korunmaktadır.</p>
            {/* Buraya gerçek metinler gelecek */}
        </div>
    );
}