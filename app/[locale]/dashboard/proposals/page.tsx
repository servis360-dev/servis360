import { getDictionary } from '../../../../lib/dictionary';
import ProposalsView from './view';

export default async function ProposalsPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <ProposalsView dict={dict} />;
}