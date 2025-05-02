'use client'
import Link from 'next/link'
import { useLanguage } from '../context/LanguageContext'
import { useState } from 'react'

export default function Navbar() {
  const { language, setLanguage } = useLanguage()
  const [showNav, setShowNav] = useState(false)

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'pt' ? 'en' : 'pt')
  }

  return (
    <nav className="navbar navbar-expand-lg sticky-top" style={{ backgroundColor: 'white' }}>
      <div className="container">
        <Link className="navbar-brand" href="/">
          Lucombo Luveia, PhD
        </Link>
        <button 
          className="navbar-toggler" 
          type="button"
          onClick={() => setShowNav(!showNav)}
          aria-expanded={showNav}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className={`collapse navbar-collapse ${showNav ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" href="/">
                {language === 'pt' ? 'Início' : 'Home'}
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/cv">CV</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/research">
                {language === 'pt' ? 'Projetos de Pesquisa' : 'Research Projects'}
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/teaching">
                {language === 'pt' ? 'Ensino' : 'Teaching'}
              </Link>
            </li>
          </ul>
          
          <div 
            className="language-switcher d-flex align-items-center" 
            onClick={toggleLanguage}
            style={{ cursor: 'pointer' }}
          >
            <i className="bi bi-globe me-2"></i>
            <span>{language === 'pt' ? 'EN' : 'PT'}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
