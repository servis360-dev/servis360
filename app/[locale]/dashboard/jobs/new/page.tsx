import { getDictionary } from '../../../../../lib/dictionary';
import NewJobView from './view';

export default async function NewJobPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <NewJobView dict={dict} />;
} 