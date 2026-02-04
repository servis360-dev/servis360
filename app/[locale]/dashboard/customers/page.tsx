import { getDictionary } from '../../../../lib/dictionary';
import CustomersView from './view';

export default async function CustomersPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <CustomersView dict={dict} />;
}