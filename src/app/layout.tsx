/* eslint-disable */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers"; // 👈 NUEVO SaaS: Para leer el subdominio


// @ts-ignore Next.js procesa esta hoja global aunque TypeScript no tenga su declaración.
import "./globals.css";
import Navbar from "./components/navbar/Navbar";
import Footer from "./components/footer/Footer";
import { Providers } from "./providers/Providers";
import { ToastContainer } from "react-toastify";
import Loader from "./components/loading/Loader";
import VersionChecker from "./components/version/VersionChecker";
import PWAInstaller from "./components/PWAInstaller";
import { getTenantConfig } from "./lib/getTenantConfig";


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["400"] });

// 👇 NUEVO SaaS: Función asíncrona para generar metadatos dinámicos por subdominio
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "emprendefacil.com.ar";
  const subdomain = host.split(".")[0]; // Extrae "prettywitches" de "prettywitches.emprendefacil.com.ar"

  const config = await getTenantConfig(subdomain);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`),
    title: `${config.nombre} | Tienda Online`,
    description: config.description || "Tienda online de productos personalizados",
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.ico', // Por ahora genérico, luego se puede hacer dinámico por API
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      title: config.nombre,
      description: config.description,
      siteName: config.nombre,
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: config.nombre }],
      locale: 'es_AR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: config.nombre,
      description: config.description,
      images: ['/og-image.jpg'],
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#3D2B1F', // 👈 Se puede hacer dinámico también, pero por ahora está bien así
  width: 'device-width',
  initialScale: 1,
};

// 👇 NUEVO SaaS: El layout ahora es async para poder buscar la config del tenant
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host") || "emprendefacil.com.ar";
  const subdomain = host.split(".")[0];
  
  // Obtenemos la configuración de ESTE emprendedor específico
  const tenantConfig = await getTenantConfig(subdomain);

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable}`}
      // 👇 NUEVO SaaS: Inyectamos el color principal del emprendedor como variable CSS global
      style={{ "--color-primary": tenantConfig.colores.primary } as React.CSSProperties}
      suppressHydrationWarning={true}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>

      <body className="bg-[#FAF7F2] text-[#3D2B1F] font-sans transition-colors duration-300">
        {/* Nota: Cambié el bg-[#0d0d0d] dark por el tema cremoso que hablamos antes. 
            Si prefieres el modo oscuro, avísame y lo adaptamos para que el tenant elija "light" o "dark" */}

        <Providers>
          <header className="pt-1">
            {/* 👇 NUEVO SaaS: Si tu Navbar usa siteConfig, eventualmente le pasaremos tenantConfig como prop */}
            <Navbar /> 
          </header>

          <main>
            <VersionChecker />
            {children}
            <PWAInstaller />
            
            {/* 👇 NUEVO SaaS: WhatsApp dinámico según el emprendedor */}
            {tenantConfig.whatsapp && (
              <a
                href={`https://wa.me/${tenantConfig.whatsapp}?text=${encodeURIComponent(`Hola, me interesa consultar por un producto de ${tenantConfig.nombre}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 left-6 z-50"
                aria-label="Chatear por WhatsApp"
              >
                <div className="relative group">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    // 👇 NUEVO SaaS: El botón usa el color secundario o verde WhatsApp
                    style={{ backgroundColor: '#25D366' }} 
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.249-.597-.497-.52-.695-.52-.198 0-.422-.024-.644-.024-.224 0-.596.074-.92.446-.324.372-1.239 1.211-1.239 2.949 0 1.737 1.264 3.425 1.412 3.623.149.199 2.096 3.175 5.077 4.488.71.306 1.262.489 1.69.625.712.227 1.36.195 1.871.124.571-.075 1.758-.719 2.006-1.413.249-.694.249-1.289.174-1.413-.074-.124-.272-.199-.57-.348z" />
                    </svg>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow">
                      ¿Necesitás ayuda?
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                </div>
              </a>
            )}

            <Loader />

            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              limit={3}
              theme="light"
              style={{ zIndex: 9999 }}
            />
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}