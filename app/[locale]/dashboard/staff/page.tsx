import { getDictionary } from '../../../../lib/dictionary';
import StaffView from './view';

export default async function StaffPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    // 1. Sözlüğü indir
    const dict = await getDictionary(locale);

    // 2. Sayfayı göster
    return <StaffView dict={dict} />;
}