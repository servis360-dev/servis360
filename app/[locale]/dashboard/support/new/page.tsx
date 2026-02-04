import { getDictionary } from '../../../../../lib/dictionary';
import NewTicketView from './view';

export default async function NewTicketPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <NewTicketView dict={dict} />;
}