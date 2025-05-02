'use client'
import { useLanguage } from './context/LanguageContext'
import styles from './page.module.css'

export default function Home() {
  const { language } = useLanguage()

  return (
    <div className={styles.container}>
      <div className={styles.profileContainer}>
        <div className={styles.profileImageContainer}>
          <img 
            src="/assets/images/Luveia-US-email.jpg" 
            className={styles.profileImage}
            alt="Lucombo Joaquim Luveia" 
          />
          
          <div className={styles.contactBar}>
            <a href="mailto:contact@example.com" className={styles.contactIcon}>
              <i className="bi bi-envelope"></i>
            </a>
            <a href="#" className={styles.contactIcon}>
              <i className="bi bi-linkedin"></i>
            </a>
            <a href="#" className={styles.contactIcon}>
              <i className="bi bi-twitter"></i>
            </a>
            <a href="#" className={styles.contactIcon}>
              <i className="bi bi-google"></i>
            </a>
          </div>
        </div>
        
        <div className={styles.profileContent}>
          <h1 className={styles.nameTitle}>LUCOMBO JOAQUIM LUVEIA</h1>
          
          <p className={styles.positionTitle}>
            {language === 'pt' ? 'PhD em Economia' : 'PhD in Economics'}
          </p>
          
          <div className={styles.bioSection}>
            <p className={styles.bioText} style={{ display: language === 'pt' ? 'block' : 'none' }}>
              Sou um macroeconomista com foco nos campos de trabalho, crescimento e desenvolvimento internacional, e economia urbana, bem como pesquisador em saúde. Minha pesquisa concentra-se em países produtores de energia, África, EUA, China e economias lusófonas.
            </p>
            
            <p className={styles.bioText} style={{ display: language === 'pt' ? 'block' : 'none' }}>
              Tenho 23 anos de experiência profissional e acadêmica em vários níveis. Durante minha carreira, desenvolvi fortes habilidades de liderança e negociação, e a capacidade de construir equipes coesas e produtivas, enquanto promovo e incentivo a criatividade e pesquisa de qualidade, além de um histórico de habilidades organizacionais e de comunicação eficazes, e excelentes relações interpessoais.
            </p>
            
            <p className={styles.bioText} style={{ display: language === 'en' ? 'block' : 'none' }}>
              I am a macro-economist with focus on the field of labor, international growth & development, and urban economics as well as researcher in health. My research focus on energy producing countries, Africa, US, China and lusophone economy.
            </p>
            
            <p className={styles.bioText} style={{ display: language === 'en' ? 'block' : 'none' }}>
              I have 23 years of professional and academic experience overall at various levels. During my career, I have developed strong leadership and negotiations skills, and the ability to build cohesive, productive teams while fostering and encouraging creativity and quality research as well as a track record on effective organizational, communication skills, and excellent inter-personal relations.
            </p>
          </div>
          
          <div className={styles.buttonsContainer}>
            <a href="/research" className={styles.outlineButton}>
              {language === 'pt' ? 'Ver Pesquisas' : 'View Research'}
            </a>
            <a href="/assets/pdf/CV_Lucombo_Luveia_.pdf" className={styles.primaryButton} download>
              {language === 'pt' ? 'Baixar CV' : 'Download CV'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
