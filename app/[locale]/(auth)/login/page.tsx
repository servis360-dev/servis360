import { getDictionary } from '../../../../lib/dictionary';
import LoginView from './view';

export default async function LoginPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <LoginView dict={dict} locale={locale} />;
}