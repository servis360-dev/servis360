import { getDictionary } from '../../../../../lib/dictionary';
import ProposalView from './view';

export default async function ProposalViewPage({
    params: { locale, id }
}: {
    params: { locale: string, id: string }
}) {
    const dict = await getDictionary(locale);
    return <ProposalView dict={dict} id={id} locale={locale} />;
}