import localFont from 'next/font/local'
import s from './trabalhos.module.css'
import { Toaster } from './_components/ui'

// Roboto guardada no projecto (e não descarregada do Google durante o build):
// o Google às vezes responde com links que partem o build na Vercel.
const roboto = localFont({
  src: [
    { path: './fonts/roboto-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/roboto-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/roboto-latin-700-normal.woff2', weight: '700', style: 'normal' }
  ],
  variable: '--font-roboto',
  display: 'swap'
})

export const metadata = {
  title: 'Trabalhos · Lucombo Luveia',
  description: 'Envio e correcção de trabalhos.',
  robots: { index: false, follow: false }
}

export const viewport = {
  themeColor: '#f8fafd'
}

export default function TrabalhosLayout({ children }) {
  return (
    <div className={`${roboto.variable} ${s.app}`}>
      <Toaster>{children}</Toaster>
    </div>
  )
}
