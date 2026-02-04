import { getDictionary } from '../../../../../lib/dictionary';
import TicketChatView from './view';

export default async function TicketChatPage({
    params: { locale, id }
}: {
    params: { locale: string, id: string }
}) {
    const dict = await getDictionary(locale);
    return <TicketChatView dict={dict} id={id} locale={locale} />;
}