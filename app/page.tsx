import Link from 'next/link';

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
            <h1 className="text-5xl font-bold mb-6 text-blue-500">Servis360</h1>
            <p className="text-xl text-slate-400 mb-8">Profesyonel Servis Yönetim Paneli</p>

            <div className="flex gap-4">
                <Link href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors">
                    Giriş Yap
                </Link>
                <Link href="/register" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-colors">
                    Kayıt Ol
                </Link>
            </div>
        </div>
    );
}
