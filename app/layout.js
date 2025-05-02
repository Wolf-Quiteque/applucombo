
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { LanguageProvider } from './context/LanguageContext'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Lucombo Joaquim Luveia, PhD',
  description: 'Macroeconomist specializing in labor, international growth & development, and urban economics. Research focuses on energy-producing countries, Africa, US, China, and Lusophone economies.',
  keywords: 'Lucombo Luveia, economist, macroeconomics, PhD Economics, labor economics, international development, urban economics, research, Angola, Africa, US, China, Lusophone economy, economic research, development economics',
  author: 'Lucombo Joaquim Luveia',
  openGraph: {
    title: 'Lucombo Joaquim Luveia, PhD',
    description: 'Macroeconomist specializing in labor, international growth & development, and urban economics. Research focuses on energy-producing countries, Africa, US, China, and Lusophone economies.',
    url: 'https://lucombo.vercel.app/',
    type: 'website',
    images: [
      {
        url: 'https://lucombo.vercel.app/assets/images/Luveia-US-email.jpg',
        width: 1200,
        height: 630,
        alt: 'Lucombo Joaquim Luveia',
      },
    ],
  },
  twitter: {
    card: 'summary_large',
    title: 'Lucombo Joaquim Luveia, PhD',
    description: 'Macroeconomist specializing in labor, international growth & development, and urban economics. Research focuses on energy-producing countries, Africa, US, China, and Lusophone economies.',
    images: ['https://lucombo.vercel.app/assets/images/Luveia-US-email.jpg'],
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css" />

      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <Navbar />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
