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
              description_pt: 'Material em preparação - disponível em breve',
              description_en: 'Material in preparation - coming soon',
              passcode: '000000'
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
          
          {selectedCourse === 'financas' || selectedCourse === 'cbc' ? (
            <div className="alert alert-info d-flex align-items-center">
              <i className="bi bi-hourglass-split fs-3 me-3"></i>
              <div>
                <h5 className="alert-heading">
                  {language === 'pt' ? '⏳ Materiais em breve!' : '⏳ Coming soon!'}
                </h5>
                <p className="mb-0">
                  {language === 'pt' 
                    ? 'Estamos preparando materiais incríveis para você. Volte em breve!'
                    : 'We are preparing amazing materials for you. Check back soon!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="row g-3">
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
                    <a 
                      href="/assets/material/economia/ACITE_PLANO OU PROGRAMA DE AULA_CRESCIMENTO E DESENVOLVIMENTO ECONÓMICO_ 2025.pdf" 
                      className="btn btn-primary"
                      download
                    >
                      <i className="bi bi-download me-2"></i>
                      {language === 'pt' ? 'Baixar PDF' : 'Download PDF'}
                    </a>
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
                      <a 
                        href="/assets/material/economia/aula/ACITE_AULA 1_2025.pdf" 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        download
                      >
                        <span>
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '1. Crescimento econômico versus Desenvolvimento econômico' : '1. Economic Growth vs. Economic Development'}
                        </span>
                        <span className="badge bg-primary rounded-pill">PDF</span>
                      </a>
                      <a 
                        href="/assets/material/economia/aula/ACITE_AULA 2_2025.pdf" 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        download
                      >
                        <span>
                          <i className="bi bi-file-earmark-play me-2"></i>
                          {language === 'pt' ? '2. Modelos Teóricos do Crescimento Econômico' : '2. Theoretical Models of Economic Growth'}
                        </span>
                        <span className="badge bg-primary rounded-pill">PDF</span>
                      </a>
                      <a 
                        href="/assets/material/economia/aula/ACITE_AULA 3_2025.pdf" 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        download
                      >
                        <span>
                          <i className="bi bi-file-earmark-play me-2"></i>
                    {language === 'pt' ? '3. Modelo de Solow' : '3. Solow Model'}
                        </span>
                        <span className="badge bg-primary rounded-pill">PDF</span>
                      </a>
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
