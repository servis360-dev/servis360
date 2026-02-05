import { getDictionary } from '../../../lib/dictionary';
import TermsView from './view';

export default async function TermsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <TermsView dict={dict} locale={locale} />;
}