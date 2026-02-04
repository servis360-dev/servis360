import { getDictionary } from '../../../../lib/dictionary';
import SettingsView from './view';

export default async function SettingsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <SettingsView dict={dict} />;
}