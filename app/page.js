'use client'
import { useLanguage } from './context/LanguageContext'
import styles from './page.module.css'

export default function Home() {
  const { language } = useLanguage()

  const researchAreas = [
    {
      icon: 'bi-graph-up-arrow',
      title_en: 'Labor Economics',
      title_pt: 'Economia do Trabalho',
      description_en: 'Analyzing labor markets, employment dynamics, and workforce development',
      description_pt: 'Análise de mercados de trabalho, dinâmica do emprego e desenvolvimento da força de trabalho'
    },
    {
      icon: 'bi-globe',
      title_en: 'International Development',
      title_pt: 'Desenvolvimento Internacional',
      description_en: 'Focus on economic growth in energy-producing countries and Africa',
      description_pt: 'Foco no crescimento econômico em países produtores de energia e África'
    },
    {
      icon: 'bi-building',
      title_en: 'Urban Economics',
      title_pt: 'Economia Urbana',
      description_en: 'Urban development, city planning, and metropolitan economic systems',
      description_pt: 'Desenvolvimento urbano, planejamento urbano e sistemas econômicos metropolitanos'
    },
    {
      icon: 'bi-heart-pulse',
      title_en: 'Health Economics',
      title_pt: 'Economia da Saúde',
      description_en: 'Research on health systems, policy, and economic impacts',
      description_pt: 'Pesquisa sobre sistemas de saúde, políticas e impactos econômicos'
    }
  ]

  const stats = [
    {
      number: '23+',
      label_en: 'Years Experience',
      label_pt: 'Anos de Experiência',
      icon: 'bi-award'
    },
    {
      number: '50+',
      label_en: 'Research Publications',
      label_pt: 'Publicações de Pesquisa',
      icon: 'bi-journal-text'
    },
    {
      number: '15+',
      label_en: 'Countries Analyzed',
      label_pt: 'Países Analisados',
      icon: 'bi-globe'
    },
    {
      number: '100+',
      label_en: 'Students Mentored',
      label_pt: 'Alunos Orientados',
      icon: 'bi-people'
    }
  ]

  const featuredWork = [
    {
      title_en: 'Economic Growth in Lusophone Economies',
      title_pt: 'Crescimento Econômico em Economias Lusófonas',
      description_en: 'Comprehensive analysis of growth patterns and development strategies',
      description_pt: 'Análise abrangente de padrões de crescimento e estratégias de desenvolvimento',
      category_en: 'Research Paper',
      category_pt: 'Artigo de Pesquisa',
      year: '2024'
    },
    {
      title_en: 'Energy Markets and African Development',
      title_pt: 'Mercados de Energia e Desenvolvimento Africano',
      description_en: 'Impact of energy resources on economic transformation',
      description_pt: 'Impacto dos recursos energéticos na transformação econômica',
      category_en: 'Working Paper',
      category_pt: 'Working Paper',
      year: '2024'
    },
    {
      title_en: 'Labor Market Dynamics in Developing Economies',
      title_pt: 'Dinâmica do Mercado de Trabalho em Economias em Desenvolvimento',
      description_en: 'Analysis of employment trends and workforce challenges',
      description_pt: 'Análise de tendências de emprego e desafios da força de trabalho',
      category_en: 'Book Chapter',
      category_pt: 'Capítulo de Livro',
      year: '2023'
    }
  ]

  return (
    <div className={styles.container}>
      {/* Hero Section with Profile */}
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

      {/* Statistics Section */}
      <div className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className={`bi ${stat.icon}`}></i>
              </div>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>
                {language === 'pt' ? stat.label_pt : stat.label_en}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research Areas Section */}
      <div className={styles.researchAreasSection}>
        <h2 className={styles.sectionTitle}>
          {language === 'pt' ? 'Áreas de Pesquisa' : 'Research Areas'}
        </h2>
        <div className={styles.researchGrid}>
          {researchAreas.map((area, index) => (
            <div key={index} className={styles.researchCard}>
              <div className={styles.researchIcon}>
                <i className={`bi ${area.icon}`}></i>
              </div>
              <h3 className={styles.researchTitle}>
                {language === 'pt' ? area.title_pt : area.title_en}
              </h3>
              <p className={styles.researchDescription}>
                {language === 'pt' ? area.description_pt : area.description_en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Work Section */}
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>
          {language === 'pt' ? 'Trabalhos em Destaque' : 'Featured Work'}
        </h2>
        <div className={styles.featuredGrid}>
          {featuredWork.map((work, index) => (
            <div key={index} className={styles.featuredCard}>
              <div className={styles.featuredHeader}>
                <span className={styles.featuredCategory}>
                  {language === 'pt' ? work.category_pt : work.category_en}
                </span>
                <span className={styles.featuredYear}>{work.year}</span>
              </div>
              <h3 className={styles.featuredTitle}>
                {language === 'pt' ? work.title_pt : work.title_en}
              </h3>
              <p className={styles.featuredDescription}>
                {language === 'pt' ? work.description_pt : work.description_en}
              </p>
              <a href="/research" className={styles.readMoreLink}>
                {language === 'pt' ? 'Ler mais →' : 'Read more →'}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            {language === 'pt' 
              ? 'Interessado em Colaboração ou Consultoria?' 
              : 'Interested in Collaboration or Consultation?'}
          </h2>
          <p className={styles.ctaDescription}>
            {language === 'pt'
              ? 'Estou sempre aberto a discutir novas oportunidades de pesquisa, projetos de consultoria e parcerias acadêmicas.'
              : 'I am always open to discussing new research opportunities, consulting projects, and academic partnerships.'}
          </p>
          <div className={styles.ctaButtons}>
            <a href="mailto:contact@example.com" className={styles.ctaPrimaryButton}>
              {language === 'pt' ? 'Entre em Contato' : 'Get in Touch'}
            </a>
            <a href="/teaching" className={styles.ctaSecondaryButton}>
              {language === 'pt' ? 'Ver Materiais de Ensino' : 'View Teaching Materials'}
            </a>
          </div>
        </div>
      </div>

      {/* Interactive Data Visualization */}
      <div className={styles.gdpSection}>
        <h2 className={styles.gdpTitle}>
          {language === 'pt' ? 'PIB per Capita Global' : 'Global GDP per Capita'}
        </h2>
        <p className={styles.gdpDescription}>
          {language === 'pt'
            ? 'Explore dados interativos sobre o PIB per capita em diferentes países e períodos de tempo.'
            : 'Explore interactive data on GDP per capita across different countries and time periods.'}
        </p>
        <iframe 
          src="//www.gapminder.org/tools/?embedded=true#$chart-type=bubbles&url=v2" 
          style={{ width: '100%', height: '500px', margin: '0', border: '1px solid grey' }} 
          allowFullScreen
        ></iframe>
      </div>

      {/* Regional Focus Section */}
      <div className={styles.regionalSection}>
        <h2 className={styles.sectionTitle}>
          {language === 'pt' ? 'Foco Regional' : 'Regional Focus'}
        </h2>
        <div className={styles.regionalGrid}>
          <div className={styles.regionalCard}>
            <i className="bi bi-pin-map" style={{ fontSize: '2.5rem', color: '#0066cc' }}></i>
            <h3>{language === 'pt' ? 'África' : 'Africa'}</h3>
            <p>
              {language === 'pt'
                ? 'Pesquisa aprofundada sobre crescimento econômico, mercados de energia e desenvolvimento urbano no continente africano.'
                : 'In-depth research on economic growth, energy markets, and urban development across the African continent.'}
            </p>
          </div>
          <div className={styles.regionalCard}>
            <i className="bi bi-globe2" style={{ fontSize: '2.5rem', color: '#0066cc' }}></i>
            <h3>{language === 'pt' ? 'Economias Lusófonas' : 'Lusophone Economies'}</h3>
            <p>
              {language === 'pt'
                ? 'Análise especializada de países de língua portuguesa, incluindo Brasil, Angola e Moçambique.'
                : 'Specialized analysis of Portuguese-speaking countries, including Brazil, Angola, and Mozambique.'}
            </p>
          </div>
          <div className={styles.regionalCard}>
            <i className="bi bi-lightning-charge" style={{ fontSize: '2.5rem', color: '#0066cc' }}></i>
            <h3>{language === 'pt' ? 'Países Produtores de Energia' : 'Energy-Producing Countries'}</h3>
            <p>
              {language === 'pt'
                ? 'Estudo do impacto dos recursos naturais no desenvolvimento econômico e diversificação.'
                : 'Study of the impact of natural resources on economic development and diversification.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}