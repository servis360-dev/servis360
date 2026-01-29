import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}", // Burası çok önemli, menüyü boyar
        "./app/**/*.{js,ts,jsx,tsx,mdx}",        // Burası sayfaları boyar
    ],
    theme: {
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
    darkMode: 'media', // Bilgisayarın temasına göre otomatik koyu/açık mod
};
export default config;