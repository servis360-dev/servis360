import { getDictionary } from '../../../../lib/dictionary';
import SubscriptionView from './view';

export default async function SubscriptionPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <SubscriptionView dict={dict} />;
}