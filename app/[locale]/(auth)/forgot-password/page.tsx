import { getDictionary } from '../../../../lib/dictionary';
import ForgotPasswordView from './view';

export default async function ForgotPasswordPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <ForgotPasswordView dict={dict} locale={locale} />;
}