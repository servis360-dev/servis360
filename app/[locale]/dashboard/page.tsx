import { getDictionary } from '../../../lib/dictionary';
import DashboardView from './view';

export default async function DashboardPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    // 1. Dili algıla ve ilgili sözlüğü sunucudan indir
    const dict = await getDictionary(locale);

    // 2. Sözlüğü güvenli dosyamıza (view.tsx) gönder
    return <DashboardView dict={dict} />;
}