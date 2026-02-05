'use client';

import { HelpCircle, Mail } from 'lucide-react';

export default function HelpView({ dict }: { dict: any }) {
    return (
        <div className="max-w-4xl mx-auto py-20 px-6 min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
            <h1 className="text-3xl font-bold mb-8 text-center">{dict.help.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Mail className="text-blue-500" /> {dict.help.email_title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">{dict.help.email_desc}</p>
                    <a href="mailto:destek@servis360.com" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">destek@servis360.com</a>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-green-500/50 transition-colors">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <HelpCircle className="text-green-500" /> {dict.help.faq_title}
                    </h3>
                    <ul className="space-y-2 list-disc pl-5 text-slate-500 dark:text-slate-400">
                        <li>{dict.help.faq_1}</li>
                        <li>{dict.help.faq_2}</li>
                        <li>{dict.help.faq_3}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}