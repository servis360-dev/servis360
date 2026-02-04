import { getDictionary } from '../../../../../lib/dictionary';
import JobDetailView from './view';

export default async function JobDetailViewPage({
    params: { locale, id }
}: {
    params: { locale: string, id: string }
}) {
    const dict = await getDictionary(locale);
    return <JobDetailView dict={dict} id={id} locale={locale} />;
}