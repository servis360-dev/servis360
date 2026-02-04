import { getDictionary } from '../../../../../lib/dictionary';
import NewProposalView from './view';

export default async function NewProposalPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const dict = await getDictionary(locale);
    return <NewProposalView dict={dict} />;
}