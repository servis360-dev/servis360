import { getDictionary } from '../../../../lib/dictionary';
import ReportsView from './view';

export default async function ReportsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <ReportsView dict={dict} />;
}