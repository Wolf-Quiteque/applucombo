'use client'
export default function Footer({ language }) {
  return (
    <footer className="bg-light py-4 mt-5">
      <div className="container text-center">
        <p className="text-muted mb-0">
          {language === 'pt' 
            ? '© 2025 Lucombo Joaquim Luveia, Phd. Todos os direitos reservados.'
            : '© 2025 Lucombo Joaquim Luveia, Phd. All rights reserved.'}
        </p>
      </div>
    </footer>
  )
}
