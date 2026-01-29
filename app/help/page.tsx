import { HelpCircle, Mail, Phone } from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="max-w-4xl mx-auto py-20 px-6">
            <h1 className="text-3xl font-bold mb-8 text-center">Yardım Merkezi</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Mail className="text-blue-500" /> E-posta Destek
                    </h3>
                    <p className="text-slate-500 mb-4">Sorularınızı bize yazın, 24 saat içinde dönelim.</p>
                    <a href="mailto:destek@servis360.com" className="text-blue-600 font-bold hover:underline">destek@servis360.com</a>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <HelpCircle className="text-green-500" /> Sıkça Sorulan Sorular
                    </h3>
                    <ul className="space-y-2 list-disc pl-5 text-slate-500">
                        <li>Şifremi nasıl değiştiririm?</li>
                        <li>Aboneliğimi nasıl iptal ederim?</li>
                        <li>Fatura bilgilerimi nereden güncellerim?</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}