import { getDictionary } from '../../../../lib/dictionary';
import RegisterView from './view';

export default async function RegisterPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <RegisterView dict={dict} locale={locale} />;
}