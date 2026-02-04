import { getDictionary } from '../../../../lib/dictionary';
import FinanceView from './view';

export default async function FinancePage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <FinanceView dict={dict} />;
}