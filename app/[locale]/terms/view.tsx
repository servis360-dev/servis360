'use client';

export default function TermsView({ dict, locale }: { dict: any, locale: string }) {
    const dateStr = new Date().toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'de' ? 'de-DE' : 'en-US');

    return (
        <div className="max-w-4xl mx-auto py-20 px-6 min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans">
            <div className="prose dark:prose-invert max-w-none">
                <h1 className="text-4xl font-bold mb-4">{dict.terms.title}</h1>
                <p className="text-slate-500 mb-8 italic">{dict.terms.last_updated}: {dateStr}</p>

                <p className="text-lg leading-relaxed mb-8">{dict.terms.intro}</p>

                <h3 className="text-2xl font-bold mt-8 mb-4">{dict.terms.section_1_title}</h3>
                <p className="mb-6">{dict.terms.section_1_desc}</p>

                <h3 className="text-2xl font-bold mt-8 mb-4">{dict.terms.section_2_title}</h3>
                <p className="mb-6">{dict.terms.section_2_desc}</p>

                <h3 className="text-2xl font-bold mt-8 mb-4">{dict.terms.section_3_title}</h3>
                <p className="mb-6">{dict.terms.section_3_desc}</p>

                <h3 className="text-2xl font-bold mt-8 mb-4">{dict.terms.section_4_title}</h3>
                <p className="mb-6">{dict.terms.section_4_desc}</p>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 mt-12">
                    <h4 className="font-bold text-lg mb-2">{dict.terms.contact_title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">{dict.terms.contact_desc}</p>
                    <a href="mailto:legal@servis360.com" className="text-blue-600 font-bold hover:underline">legal@servis360.com</a>
                </div>
            </div>
        </div>
    );
}