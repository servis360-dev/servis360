import { getDictionary } from '../../../../lib/dictionary';
import BranchesView from './view';

export default async function BranchesPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    // 1. Dili algıla ve sözlüğü indir
    const dict = await getDictionary(locale);

    // 2. Görüntüleme bileşenini çağır
    return <BranchesView dict={dict} />;
}