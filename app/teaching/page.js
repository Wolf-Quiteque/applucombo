'use client'
import { useState } from 'react'
import styles from './page.module.css'

export default function Teaching() {
  const [language, setLanguage] = useState('pt')
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [passcode, setPasscode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [showAllQuizzes, setShowAllQuizzes] = useState(false)

  const schools = [
    {
      id: 'acite',
      name_pt: 'ACADEMIA DE CIÊNCIAS SOCIAIS E TECNOLOGIA - ACITE',
      name_en: 'ACADEMY OF SOCIAL SCIENCES AND TECHNOLOGY - ACITE',
      years: [
        { 
          year: '2025',
          courses: [
            {
              id: 'economia',
              name_pt: 'CRESCIMENTO E DESENVOLVIMENTO ECONOMICO',
              name_en: 'ECONOMIC GROWTH AND DEVELOPMENT',
              description_pt: 'Curso sobre os fundamentos do crescimento e desenvolvimento econômico.',
              description_en: 'Course on the fundamentals of economic growth and development.',
              passcode: '040450'
            },
            {
              id: 'financas',
              name_pt: 'FINANÇAS CORPORATIVAS',
              name_en: 'CORPORATE FINANCE',
              description_pt: 'Estudo das decisões financeiras dentro das empresas.',
              description_en: 'Study of financial decisions within corporations.',
              passcode: '228899'
            },
            {
              id: 'cbc',
              name_pt: 'Curso Básico sobre CBC/FT/FP',
              name_en: 'Basic Course on CBC/FT/FP',
              description_pt: 'Sistema internacional de combate ao branqueamento de capitais e financiamento do terrorismo',
              description_en: 'International system for combating money laundering and terrorism financing',
              passcode: '334455'
            },
            {
              id: 'teoria-do-jogo',
              name_pt: 'Teoria do Jogo',
              name_en: 'Game Theory',
              description_pt: 'Introdução aos princípios e aplicações da teoria dos jogos.',
              description_en: 'Introduction to the principles and applications of game theory.',
              passcode: '963852'
            },
            {
              id: 'investimento-estrangeiro-directo',
              name_pt: 'Investimento estrangeiro directo',
              name_en: 'Foreign Direct Investment',
              description_pt: 'Análise do investimento estrangeiro direto e seus impactos.',
              description_en: 'Analysis of foreign direct investment and its impacts.',
              passcode: '114477'
            }
          ]
        }
      ]
    }
  ]

  const getAvailableYears = () => {
    const school = schools.find(s => s.id === selectedSchool)
    return school ? school.years : []
  }

  const getAvailableCourses = () => {
    const school = schools.find(s => s.id === selectedSchool)
    if (!school) return []
    const yearData = school.years.find(y => y.year === selectedYear)
    return yearData ? yearData.courses : []
  }

  const resetSelection = () => {
    setSelectedYear('')
    setSelectedCourse('')
    setPasscode('')
    setIsAuthenticated(false)
    setError('')
  }

  const resetCourseSelection = () => {
    setSelectedCourse('')
    setPasscode('')
    setIsAuthenticated(false)
    setError('')
  }

  const handleLogin = () => {
    const school = schools.find(s => s.id === selectedSchool)
    if (!school) return
    
    const yearData = school.years.find(y => y.year === selectedYear)
    if (!yearData) return
    
    const course = yearData.courses.find(c => c.id === selectedCourse)
    
    if (course && passcode === course.passcode) {
      setIsAuthenticated(true)
      setError('')
    } else {
      setIsAuthenticated(false)
      setPasscode('') // Clear input on failure
      setError(language === 'pt' ? 'Código de acesso inválido.' : 'Invalid passcode.')
    }
  }

  const handleBack = () => {
    setIsAuthenticated(false)
    setPasscode('')
    setError('')
  }

  const handleSelectCourse = (courseId) => {
    setSelectedCourse(courseId)
    setPasscode('')
    setIsAuthenticated(false)
    setError('')
  }

  const availableYears = getAvailableYears()
  const availableCourses = getAvailableCourses()

  return (
    <div className={`container ${styles.pageContent} ${styles.fadeIn}`}>
      <h1 className={`text-center mb-4 ${styles.pageTitle}`}>
        {language === 'pt' ? 'Materiais de Ensino' : 'Teaching Materials'}
      </h1>
      
      {!selectedCourse ? (
        // Course Selection View
        <div className={`${styles.selectionArea} ${styles.bgLightBlue}`}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="schoolSelect" className="form-label">
                {language === 'pt' ? 'Selecione a Instituição' : 'Select Institution'}
              </label>
              <select 
                id="schoolSelect" 
                className="form-select" 
                value={selectedSchool} 
                onChange={(e) => {
                  setSelectedSchool(e.target.value)
                  resetSelection()
                }}
              >
                <option value="" disabled>
                  {language === 'pt' ? '-- Escolha uma Instituição --' : '-- Choose an Institution --'}
                </option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {language === 'pt' ? school.name_pt : school.name_en}
                  </option>
                ))}
              </select>
            </div>

            {selectedSchool && availableYears.length > 0 && (
              <div className="col-md-6">
                <label htmlFor="yearSelect" className="form-label">
                  {language === 'pt' ? 'Selecione o Ano Letivo' : 'Select Academic Year'}
                </label>
                <select 
                  id="yearSelect" 
                  className="form-select" 
                  value={selectedYear} 
                  onChange={(e) => {
                    setSelectedYear(e.target.value)
                    resetCourseSelection()
                  }}
                >
                  <option value="" disabled>
                    {language === 'pt' ? '-- Escolha um Ano --' : '-- Choose a Year --'}
                  </option>
                  {availableYears.map(yearData => (
                    <option key={yearData.year} value={yearData.year}>
                      {yearData.year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedYear && availableCourses.length > 0 && (
            <div className="row g-4 mt-3">
              <div className="col-12">
                <h4>
                  {language === 'pt' ? 'Cursos Disponíveis' : 'Available Courses'}
                </h4>
              </div>
              
              {availableCourses.map(course => (
                <div className="col-md-6" key={course.id}>
                  <div 
                    className={`card h-100 ${styles.courseCard}`}
                    onClick={() => handleSelectCourse(course.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-body">
                      <h5 className="card-title fw-bold">
                        {language === 'pt' ? course.name_pt : course.name_en}
                      </h5>
                      <p className="card-text">
                        {language === 'pt' ? course.description_pt : course.description_en}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !isAuthenticated ? (
        // Authentication View - Only shows when a course is selected
        <div className={`${styles.selectionArea} ${styles.bgLightBlue} ${styles.fadeIn}`}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>
              {language === 'pt' ? 'Curso Selecionado: ' : 'Selected Course: '}
              <span className="fw-bold">
                {language === 'pt' 
                  ? availableCourses.find(c => c.id === selectedCourse)?.name_pt 
                  : availableCourses.find(c => c.id === selectedCourse)?.name_en}
              </span>
            </h3>
            <button 
              className="btn btn-outline-secondary" 
              onClick={() => {
                setSelectedCourse('');
                setPasscode('');
                setError('');
              }}
            >
            <strong> <i className="bi bi-arrow-left me-2"></i></strong> 
            </button>
          </div>
          
          <p>
            {language === 'pt' 
              ? 'Para acessar os materiais deste curso, por favor insira o código de acesso abaixo:'
              : 'To access materials for this course, please enter the access code below:'}
          </p>
          
          <div className="row mt-4">
            <div className="col-md-6">
              <label htmlFor="passcode" className="form-label">
                {language === 'pt' ? 'Código de Acesso' : 'Passcode'}
              </label>
              <input 
                type="password" 
                id="passcode" 
                className="form-control" 
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={language === 'pt' ? 'Digite o código' : 'Enter passcode'}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="col-md-6 align-self-end">
              <button 
                className="btn btn-primary w-100" 
                onClick={handleLogin}
              >
                {language === 'pt' ? 'Acessar Materiais' : 'Access Materials'}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className={`${styles.materialsArea} ${styles.fadeIn} ${styles.bgLightBlue}`}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              {language === 'pt' ? 'Materiais: ' : 'Materials: '}
              <span className="fw-bold">
                {language === 'pt' 
                  ? availableCourses.find(c => c.id === selectedCourse)?.name_pt 
                  : availableCourses.find(c => c.id === selectedCourse)?.name_en}
              </span>
              <span className="fs-6 ms-2 text-muted">({selectedYear})</span>
            </h2>
            <button 
              className="btn btn-outline-secondary" 
              onClick={() => {
                setSelectedCourse('');
                setIsAuthenticated(false);
                setPasscode('');
              }}
            >
             <strong> <i className="bi bi-arrow-left me-2"></i> </strong>
            </button>
          </div>
          
          {selectedCourse === 'cbc' && (
            <div className="row g-3 mb-4">
              <div className="col-12">
                <div className="card border-warning">
                  <div className="card-body">
                    <h3 className="card-title text-warning">
                      <i className="bi bi-question-circle-fill me-2"></i>
                      {language === 'pt' ? '📝 Questionários' : '📝 Quizzes'}
                    </h3>
                    <p className="card-text text-muted">
                      {language === 'pt' 
                        ? 'Baixe os questionários para testar seus conhecimentos.'
                        : 'Download quizzes to test your knowledge.'}
                    </p>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-text me-2"></i>
                          {language === 'pt' ? 'Questionário sobre Branqueamento de Capitais' : 'Quiz on Money Laundering'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONÁRIO DE AVALIAÇÃO TÉCNICA SOBRE A COMPREENSÃO DO FENÓMENO DO BRANQUEAMENTO DE CAPITAIS.pdf" 
                            className="btn btn-sm btn-warning me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONÁRIO DE AVALIAÇÃO TÉCNICA SOBRE A COMPREENSÃO DO FENÓMENO DO BRANQUEAMENTO DE CAPITAIS.pdf" 
                            className="btn btn-sm btn-outline-warning"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-text me-2"></i>
                          {language === 'pt' ? 'Questionário sobre Financiamento ao Terrorismo' : 'Quiz on Terrorism Financing'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONÁRIO DE AVALIAÇÃO TÉCNICA SOBRE A COMPREENSÃO DO FENÓMENO DO FINANCIAMENTO AO TERRORISMO.pdf" 
                            className="btn btn-sm btn-warning me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONÁRIO DE AVALIAÇÃO TÉCNICA SOBRE A COMPREENSÃO DO FENÓMENO DO FINANCIAMENTO AO TERRORISMO.pdf" 
                            className="btn btn-sm btn-outline-warning"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                    </div>
                    {/* For future expansion with more quizzes and show more/less functionality */}
                    {/*
                    <button 
                      className="btn btn-link mt-2" 
                      onClick={() => setShowAllQuizzes(!showAllQuizzes)}
                    >
                      {showAllQuizzes ? 
                        (language === 'pt' ? 'Mostrar Menos' : 'Show Less') : 
                        (language === 'pt' ? 'Mostrar Mais' : 'Show More')}
                    </button>
                    */}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center mb-4">
            <h2 className="fw-bold">
              {language === 'pt' ? '📚 Materiais do Curso' : '📚 Course Materials'}
            </h2>
            <p className="lead text-muted">
              {language === 'pt' 
                ? 'Explore os recursos abaixo para sua aprendizagem' 
                : 'Explore the resources below for your learning'}
            </p>
          </div>
          
          {selectedCourse === 'financas' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <div className="card h-100 border-primary">
                  <div className="card-body">
                    <h3 className="card-title text-primary">
                      <i className="bi bi-journal-bookmark-fill me-2"></i>
                      {language === 'pt' ? '📝 Programa' : '📝 Program'}
                    </h3>
                    <p className="card-text text-muted">
                      {language === 'pt' 
                        ? 'Conteúdo programático e estrutura do curso'
                        : 'Course syllabus and structure'}
                    </p>
                    <div className="d-flex justify-content-center">
                      <a 
                        href="/assets/material/financas/Conteudo pragmatico - Financas Corporativas.pdf" 
                        className="btn btn-primary me-2"
                        download
                      >
                        <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                      </a>
                      <a 
                        href="/assets/material/financas/Conteudo pragmatico - Financas Corporativas.pdf" 
                        className="btn btn-outline-primary"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="card h-100 border-success">
                  <div className="card-body">
                    <h3 className="card-title text-success">
                      <i className="bi bi-collection-play-fill me-2"></i>
                      {language === 'pt' ? '🎬 Aulas' : '🎬 Lessons'}
                    </h3>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '1. Introdução' : '1. Introduction'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/financas/Finanças corporativas - Introdução.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/financas/Finanças corporativas - Introdução.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '2. Emissão de Títulos, Valores Presentes' : '2. Bond Issuance, Present Values'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/financas/Emissão de títulos, valores presentes.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/financas/Emissão de títulos, valores presentes.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '3. Retorno e Risco em Mercados de Acções' : '3. Return and Risk in Stock Markets'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/financas/Retorno e Risco.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/financas/Retorno e Risco.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '4. Teoria de Agência e Governança Corporativa' : '4. Agency Theory and Corporate Governance'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/financas/TEORIA DE AGÊNCIA E GOVERNANÇA CORPORATIVA.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/financas/TEORIA DE AGÊNCIA E GOVERNANÇA CORPORATIVA.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '4.1 Controlo Interno' : '4.1 Internal Control'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/financas/Controlo_Interno_-_ Apresentação.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/financas/Controlo_Interno_-_ Apresentação.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <a 
                        href="/assets/material/financas/risk-and-return-empirical-class exercise.xlsx" 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        download
                      >
                        <span>
                          <i className="bi bi-file-earmark-excel me-2"></i>
                          {language === 'pt' ? 'Exercício Empírico: Retorno e Risco' : 'Empirical Exercise: Return and Risk'}
                        </span>
                        <span className="badge bg-success rounded-pill">Excel</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-12 mt-3">
                <div className="card border-info">
                  <div className="card-body">
                    <h3 className="card-title text-info">
                      <i className="bi bi-book me-2"></i>
                      {language === 'pt' ? '📖 Leitura Adicional' : '📖 Additional Reading'}
                    </h3>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-text me-2"></i>
                          {language === 'pt' ? 'Ética em Finanças Corporativas' : 'Ethics in Corporate Finance'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/financas/Ética.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/financas/Ética.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedCourse === 'cbc' ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="card border-info">
                  <div className="card-body">
                    <h3 className="card-title text-info">
                      <i className="bi bi-collection-play-fill me-2"></i>
                      {language === 'pt' ? '🎓 CBC/FT/FP' : '🎓 CBC/FT/FP'}
                    </h3>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '1. Sistema Internacional de Combate e Prevenção do Branqueamento de Capitais, Financiamento do Terrorismo' : '1. International System for Combating Money Laundering and Terrorism Financing'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/SISTEMA INTERNACIONAL DE COMBATE E PREVENÇÃO DO BRANQUEAMENTO DE CAPITAIS, FINANCIAMENTO DO TERRORISMO.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/SISTEMA INTERNACIONAL DE COMBATE E PREVENÇÃO DO BRANQUEAMENTO DE CAPITAIS, FINANCIAMENTO DO TERRORISMO.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '2. Enquadramento Teórico sobre Branqueamento de Capitais' : '2. Theoretical Framework on Money Laundering'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE BRANQUEAMENTO DE CAPITAIS.doc II.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE BRANQUEAMENTO DE CAPITAIS.doc II.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '3. Enquadramento Teórico sobre Financiamento do Terrorismo' : '3. Theoretical Framework on Terrorism Financing'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DO TERRORISMO.doc II.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DO TERRORISMO.doc II.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '4. Enquadramento Teórico sobre os Activos Virtuais' : '4. Theoretical Framework on Virtual Assets'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE OS ACTIVOS VIRTUAIS.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE OS ACTIVOS VIRTUAIS.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '5. Enquadramento Teórico sobre Financiamento da Proliferação de Armas de Destruição em Massa' : '5. Theoretical Framework on the Financing of Proliferation of Weapons of Mass Destruction'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DA PROLIFERAÇÃO DE ARMAS DE DESTRUIÇÃO EM MASSA.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DA PROLIFERAÇÃO DE ARMAS DE DESTRUIÇÃO EM MASSA.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '6. COMITÉ DE COORDENAÇÃO' : '6. COORDINATION COMMITTEE'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/COMITÉ DE COORDENAÇÃO.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/COMITÉ DE COORDENAÇÃO.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '7. ADOPÇÃO DO RELATÓRIO DE AVALIAÇÃO MÚTUA DE ANGOLA' : '7. ADOPTION OF ANGOLA\'S MUTUAL EVALUATION REPORT'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ADOPÇÃO DO RELATÓRIO DE AVALIAÇÃO MÚTUA DE ANGOLA.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ADOPÇÃO DO RELATÓRIO DE AVALIAÇÃO MÚTUA DE ANGOLA.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '8. UNIDADE DE INFORMAÇÃO FINANCEIRA' : '8. FINANCIAL INTELLIGENCE UNIT'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/UNIDADE DE INFORMAÇÃO FINANCEIRA.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/UNIDADE DE INFORMAÇÃO FINANCEIRA.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '9. ENQUADRAMENTO TEOìRICO SOBRE OS ACTIVOS VIRTUAIS' : '9. THEORETICAL FRAMEWORK ON VIRTUAL ASSETS'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEOìRICO SOBRE OS ACTIVOS VIRTUAIS.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEOìRICO SOBRE OS ACTIVOS VIRTUAIS.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '10. ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DA PROLIFERAÇÃO DE ARMAS DE DESTRUIÇÃO EM MASSA' : '10. THEORETICAL FRAMEWORK ON THE FINANCING OF PROLIFERATION OF WEAPONS OF MASS DESTRUCTION'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DA PROLIFERAÇÃO DE ARMAS DE DESTRUIÇÃO EM MASSA.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ENQUADRAMENTO TEÓRICO SOBRE FINANCIAMENTO DA PROLIFERAÇÃO DE ARMAS DE DESTRUIÇÃO EM MASSA.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '11. ESTRATÉGIA DOS ÓRGÃOS DE APLICAÇÃO DA LEI PARA CUMPRIMENTO DAS AÇÕES CONTIDAS NO PLANO DE AÇÃO DO GAFI' : '11. LAW ENFORCEMENT STRATEGY FOR COMPLIANCE WITH FATF ACTION PLAN'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/ESTRATÉGIA DOS ÓRGÃOS DE APLICAÇÃO DA LEI PARA CUMPRIMENTO DAS AÇÕES CONTIDAS NO PLANO DE AÇÃO DO GAFI.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/ESTRATÉGIA DOS ÓRGÃOS DE APLICAÇÃO DA LEI PARA CUMPRIMENTO DAS AÇÕES CONTIDAS NO PLANO DE AÇÃO DO GAFI.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '12. MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE BRANQUEAMENTO DE CAPITAIS' : '12. MANUAL FOR IDENTIFYING AND INVESTIGATING MONEY LAUNDERING CASES'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE BRANQUEAMENTO DE CAPITAIS.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE BRANQUEAMENTO DE CAPITAIS.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '13. PAÍSES EM VIA DE INCLUSÃO NA LISTA CINZENTA DO GAFI' : '13. COUNTRIES ON THE WAY TO INCLUSION IN THE FATF GREY LIST'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/PAÍSES EM VIA DE INCLUSÃO NA LISTA CINZENTA DO GAFI.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/PAÍSES EM VIA DE INCLUSÃO NA LISTA CINZENTA DO GAFI.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '14. QUESTIONÁRIO DE AVALIAÇÃO TÉCNICA SOBRE A COMPREENSÃO DO FENÓMENO DO BRANQUEAMENTO DE CAPITAIS' : '14. TECHNICAL ASSESSMENT QUESTIONNAIRE ON UNDERSTANDING THE PHENOMENON OF MONEY LAUNDERING'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONARIO_DE_AVALIACAO_TECNICA_SOBRE_A_COMPREENSAO_DO_FENOMENO_DO_BRANQUEAMENTO_DE_CAPITAIS.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONARIO_DE_AVALIACAO_TECNICA_SOBRE_A_COMPREENSAO_DO_FENOMENO_DO_BRANQUEAMENTO_DE_CAPITAIS.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '15. QUESTIONÁRIO DE AVALIAÇÃO TÉCNICA SOBRE A COMPREENSÃO DO FENÓMENO DO FINANCIAMENTO AO TERRORISMO' : '15. TECHNICAL ASSESSMENT QUESTIONNAIRE ON UNDERSTANDING THE PHENOMENON OF TERRORISM FINANCING'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONARIO_DE_AVALIACAO_TECNICA_SOBRE_A_COMPREENSAO_DO_FENOMENO_DO_FINANCIAMENTO_AO_TERRORISMO.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONARIO_DE_AVALIACAO_TECNICA_SOBRE_A_COMPREENSAO_DO_FENOMENO_DO_FINANCIAMENTO_AO_TERRORISMO.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '16. QUESTIONÁRIO PARA A REALIZAÇÃO DE AVALIAÇÃO DE RISCOS EXTERNO DE BRANQUEAMENTO DE CAPITAIS' : '16. QUESTIONNAIRE FOR EXTERNAL MONEY LAUNDERING RISK ASSESSMENT'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONARIO_PARA_A_REALIZACAO_DE_AVALIACAO_DE_RISCOS_EXTERNO_DE_BRANQUEAMENTO_DE_CAPITAIS.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/QUESTIONARIO_PARA_A_REALIZACAO_DE_AVALIACAO_DE_RISCOS_EXTERNO_DE_BRANQUEAMENTO_DE_CAPITAIS.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '17. RELAÇÃO EXISTENTE ENTRE OS ONZE RESULTADOS IMEDIATOS E AS QUARENTAS RECOMENDAÇÕES DO GAFI' : '17. RELATIONSHIP BETWEEN THE ELEVEN IMMEDIATE OUTCOMES AND THE FORTY FATF RECOMMENDATIONS'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/RELAÇÃO EXISTENTE ENTRE OS ONZE RESULTADOS IMEDIATOS E AS QUARENTAS RECOMENDAÇÕES DO GAFI.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/RELAÇÃO EXISTENTE ENTRE OS ONZE RESULTADOS IMEDIATOS E AS QUARENTAS RECOMENDAÇÕES DO GAFI.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '18. MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE FT' : '18. MANUAL FOR IDENTIFYING AND INVESTIGATING TF CASES'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE FT.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE FT.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '19. ACTIVOS VIRTUAIS' : '19. VIRTUAL ASSETS'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/GAFI.FP.ACTIVOS.VIRTUAISII.26.5.25.Acite.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/GAFI.FP.ACTIVOS.VIRTUAISII.26.5.25.Acite.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '20. ASPECTOS JURIDICOS DE BC/FT' : '20. LEGAL ASPECTS OF ML/TF'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/GAFI.FP.aspectosJuridicosBDFT26.5.25.Acite.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/GAFI.FP.aspectosJuridicosBDFT26.5.25.Acite.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '21. MANUAL PARA IDENTIFICAÇÃO E INVESTIGAÇÃO DE CASOS DE FINANCIAMENTO DO TERRORISMO' : '21. MANUAL FOR IDENTIFYING AND INVESTIGATING TERRORISM FINANCING CASES'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/CBC-FT-FP/GAFI.FP.IdentificacaoFTs26.5.25.Acite.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/CBC-FT-FP/GAFI.FP.IdentificacaoFTs26.5.25.Acite.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedCourse === 'teoria-do-jogo' ? (
            <div className="row g-3">
              <div className="col-12 mb-4">
                <div className="card border-info">
                  <div className="card-body">
                    <h3 className="card-title text-info mb-4 text-center">
                      <i className="bi bi-play-circle-fill me-2"></i>
                      {language === 'pt' ? 'Vídeo de Introdução: Teoria do Jogo' : 'Introduction Video: Game Theory'}
                    </h3>
                    <div className="ratio ratio-16x9">
                      <video controls muted playsInline className="w-100 h-100">
                        <source src="/assets/material/teoria-do-jogo/jogo-de-teoria-introducao.mp4" type="video/mp4" />
                        {language === 'pt' ? 'Seu navegador não suporta o elemento de vídeo.' : 'Your browser does not support the video tag.'}
                      </video>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="card h-100 border-info text-center py-5">
                  <div className="card-body">
                    <h3 className="card-title text-info mb-4">
                      <i className="bi bi-hourglass-split me-2"></i>
                      {language === 'pt' ? 'Materiais do Curso em breve! 🚀📚✨' : 'Course materials coming soon! 🚀📚✨'}
                    </h3>
                    <p className="card-text lead text-muted">
                      {language === 'pt' 
                        ? 'Estamos a preparar materiais incríveis para este curso. Volte em breve para novidades!'
                        : 'We are preparing amazing materials for this course. Check back soon for updates!'}
                    </p>
                    <p className="card-text text-muted">
                      {language === 'pt' ? 'Agradecemos a sua paciência e entusiasmo! 😊💡' : 'Thank you for your patience and enthusiasm! 😊💡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedCourse === 'investimento-estrangeiro-directo' ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="card h-100 border-info text-center py-5">
                  <div className="card-body">
                    <h3 className="card-title text-info mb-4">
                      <i className="bi bi-hourglass-split me-2"></i>
                      {language === 'pt' ? 'Conteúdos de Investimento Estrangeiro Directo em breve! 🚀📚✨' : 'Foreign Direct Investment content coming soon! 🚀📚✨'}
                    </h3>
                    <p className="card-text lead text-muted">
                      {language === 'pt' 
                        ? 'Estamos a preparar materiais incríveis para este curso. Volte em breve para novidades!'
                        : 'We are preparing amazing materials for this course. Check back soon for updates!'}
                    </p>
                    <p className="card-text text-muted">
                      {language === 'pt' ? 'Agradecemos a sua paciência e entusiasmo! 😊💡' : 'Thank you for your patience and enthusiasm! 😊💡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12 mb-4"> {/* Added mb-4 for spacing */}
                <div className="card border-success"> {/* Green outline */}
                  <div className="card-body">
                    <h3 className="card-title text-success">
                      <i className="bi bi-pencil-square me-2"></i> {/* Icon for exercise */}
                      {language === 'pt' ? '📝 Exercícios' : '📝 Exercises'}
                    </h3>
                    <p className="card-text text-muted">
                      {language === 'pt' 
                        ? 'Baixe os exercícios para praticar seus conhecimentos.'
                        : 'Download exercises to practice your knowledge.'}
                    </p>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-text me-2"></i>
                          {language === 'pt' ? 'Exercício: Modelo de Solow' : 'Exercise: Solow Model'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/Modelo de Solow-exercicio.pdf" 
                            className="btn btn-sm btn-success me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/Modelo de Solow-exercicio.pdf" 
                            className="btn btn-sm btn-outline-success"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-primary">
                  <div className="card-body">
                    <h3 className="card-title text-primary">
                      <i className="bi bi-journal-bookmark-fill me-2"></i>
                      {language === 'pt' ? '📝 Plano de Aula' : '📝 Course Plan'}
                    </h3>
                    <p className="card-text text-muted">
                      {language === 'pt' 
                        ? 'Estrutura completa do curso e objetivos de aprendizagem'
                        : 'Complete course structure and learning objectives'}
                    </p>
                    <div className="d-flex justify-content-center">
                      <a 
                        href="/assets/material/economia/ACITE_PLANO OU PROGRAMA DE AULA_CRESCIMENTO E DESENVOLVIMENTO ECONÓMICO_ 2025.pdf" 
                        className="btn btn-primary me-2"
                        download
                      >
                        <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                      </a>
                      <a 
                        href="/assets/material/economia/ACITE_PLANO OU PROGRAMA DE AULA_CRESCIMENTO E DESENVOLVIMENTO ECONÓMICO_ 2025.pdf" 
                        className="btn btn-outline-primary"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="card h-100 border-success">
                  <div className="card-body">
                    <h3 className="card-title text-success">
                      <i className="bi bi-collection-play-fill me-2"></i>
                      {language === 'pt' ? '🎬 Aulas' : '🎬 Lessons'}
                    </h3>
                    <div className="list-group list-group-flush">
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '1. Crescimento econômico versus Desenvolvimento econômico' : '1. Economic Growth vs. Economic Development'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/ACITE_AULA 1_2025.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/ACITE_AULA 1_2025.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '2. Modelos Teóricos do Crescimento Econômico' : '2. Theoretical Models of Economic Growth'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/ACITE_AULA 2_2025.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/ACITE_AULA 2_2025.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '3. Modelo de Solow' : '3. Solow Model'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/ACITE_AULA 3_2025.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/ACITE_AULA 3_2025.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          Revisao do Modelo Classico de Crescimento economico I
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/Revisao dos modelos de crescimento economico.11.5.25.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/Revisao dos modelos de crescimento economico.11.5.25.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          Revisao do Modelo Classico de Crescimento economico II
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/Revisao do Modelo Classico de Crescimento economico 12.5.25.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/Revisao do Modelo Classico de Crescimento economico 12.5.25.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          Modelo AK
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/Modelo AK.13.5.25.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/Modelo AK.13.5.25.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          Rostow
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/Rostow.14.5.25.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/Rostow.14.5.25.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '5. Schumpeter : O modelo de fluxo circular e a teoria da destruição criativa' : '5. The Circular Flow Model and the Theory of Creative Destruction'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/O modelo de fluxo circular e a teoria da destruição criativa.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/O modelo de fluxo circular e a teoria da destruição criativa.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                      <div className="list-group-item list-group-item-action d-flex justify-content-between align-items-center flex-wrap">
                        <span className="mb-2 mb-md-0">
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '6. O Modelo de Crescimento de Schumpeter II' : '6. Schumpeter\'s Growth Model II'}
                        </span>
                        <div className="d-flex">
                          <a 
                            href="/assets/material/economia/aula/O Modelo de Crescimento de Schumpeter II.pdf" 
                            className="btn btn-sm btn-primary me-2"
                            download
                          >
                            <i className="bi bi-download me-1"></i> {language === 'pt' ? 'Baixar' : 'Download'}
                          </a>
                          <a 
                            href="/assets/material/economia/aula/O Modelo de Crescimento de Schumpeter II.pdf" 
                            className="btn btn-sm btn-outline-primary"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i> {language === 'pt' ? 'Ver' : 'View'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
