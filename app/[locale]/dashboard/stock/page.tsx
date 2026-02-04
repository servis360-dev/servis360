import { getDictionary } from '../../../../lib/dictionary';
import StockView from './view';

export default async function StockPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <StockView dict={dict} />;
}