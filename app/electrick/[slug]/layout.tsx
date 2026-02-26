// Tailwind CSS'in bulunduğu global dosyayı buraya çağırıyoruz
import '../../globals.css';

export const metadata = {
    title: 'Elektriker Demo | Servis-360',
    description: 'Moderne Webseite für Elektriker',
};

export default function ElectrickLayout({
    children,
}: {
    children: React.ReactNode; // TypeScript'in istediği o sihirli satır burası
}) {
    return (
        <html lang="de">
            <body>
                {children}
            </body>
        </html>
    );
}