// Projenizin yapısına göre globals.css yolunu güncelleyebilirsiniz (örn: import '@/app/globals.css')
import '../../globals.css';

export const metadata = {
    title: 'Elektrikçi Demo | Servis-360',
    description: 'Elektrik firmaları için modern, dönüşüm odaklı web sitesi demosu.',
};

export default function TurkishElectricianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="tr" className="scroll-smooth">
            <body>
                {children}
            </body>
        </html>
    );
}