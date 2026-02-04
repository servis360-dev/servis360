import { getDictionary } from '../../../../lib/dictionary';
import SupportView from './view';

export default async function SupportPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <SupportView dict={dict} locale={locale} />;
}