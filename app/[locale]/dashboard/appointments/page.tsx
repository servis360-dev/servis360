import { getDictionary } from '../../../../lib/dictionary';
import AppointmentsView from './view';

export default async function AppointmentsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <AppointmentsView dict={dict} />;
}