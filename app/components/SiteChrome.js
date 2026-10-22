'use client'
import { usePathname } from 'next/navigation'

// Esconde a navbar/rodapé do site na área de Trabalhos (tem o seu próprio layout).
export default function SiteChrome({ children }) {
  const pathname = usePathname() || ''
  if (pathname === '/trabalhos' || pathname.startsWith('/trabalhos/')) return null
  return children
}
