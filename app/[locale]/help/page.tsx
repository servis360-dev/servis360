import { getDictionary } from '../../../lib/dictionary';
import HelpView from './view';

export default async function HelpPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <HelpView dict={dict} />;
}