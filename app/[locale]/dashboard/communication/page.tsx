import { getDictionary } from '../../../../lib/dictionary';
import CommunicationView from './view';

export default async function CommunicationPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <CommunicationView dict={dict} />;
}