import { getDictionary } from '../../../lib/dictionary';
import PrivacyView from './view';

export default async function PrivacyPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <PrivacyView dict={dict} locale={locale} />;
}