import { Roboto } from 'next/font/google'
import s from './trabalhos.module.css'
import { Toaster } from './_components/ui'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto'
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
