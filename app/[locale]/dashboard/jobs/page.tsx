import { getDictionary } from '../../../../lib/dictionary';
import JobsView from './view';

export default async function JobsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <JobsView dict={dict} />;
}