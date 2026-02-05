import { getDictionary } from '../../../lib/dictionary'; // ✅ DÜZELTİLDİ: Artık doğru adrese bakıyor
import DashboardShell from './shell';

export default async function DashboardLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    // Sunucu tarafında sözlüğü çekiyoruz
    const dict = await getDictionary(locale);

    // Veriyi Client Component olan Shell'e aktarıyoruz
    return (
        <DashboardShell dict={dict} locale={locale}>
            {children}
        </DashboardShell>
    );
}