// Tailwind CSS'in bulunduğu global dosyayı buraya çağırıyoruz
import '../../globals.css';

export const metadata = {
    title: 'Elektriker Demo | Servis-360',
    description: 'Moderne Webseite für Elektriker',
};

export default function ElectrickLayout({ children }) {
    return (
        // Alman pazarına hitap edeceğimiz için dili de 'de' (Almanca) yapıyoruz
        <html lang="de">
            <body>
                {children}
            </body>
        </html>
    );
}