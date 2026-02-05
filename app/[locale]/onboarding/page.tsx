import { getDictionary } from '../../../lib/dictionary';
import OnboardingView from './view';

export default async function OnboardingPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <OnboardingView dict={dict} locale={locale} />;
}