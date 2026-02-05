import { getDictionary } from '../../lib/dictionary';
import HomeView from './view';

export default async function HomePage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <HomeView dict={dict} locale={locale} />;
}