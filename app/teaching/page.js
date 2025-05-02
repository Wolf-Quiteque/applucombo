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
              passcode: '228899'
            },
            {
              id: 'financas',
              name_pt: 'FINANÇAS CORPORATIVAS',
              name_en: 'CORPORATE FINANCE',
              description_pt: 'Estudo das decisões financeiras dentro das empresas.',
              description_en: 'Study of financial decisions within corporations.',
              passcode: '228899'
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
      
      {!isAuthenticated ? (
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
                    className={`card h-100 ${styles.courseCard} ${selectedCourse === course.id ? styles.selected : ''}`}
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

          {selectedCourse && (
            <div className="row g-3 mt-4">
              <div className="col-12">
                <h5>
                  {language === 'pt' ? 'Acesso ao Material' : 'Material Access'}
                </h5>
              </div>
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
          )}

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
              {availableCourses.find(c => c.id === selectedCourse)?.name_pt || ''}
              ({selectedYear})
            </h2>
            <button 
              className="btn btn-outline-secondary" 
              onClick={handleBack}
            >
              <i className="bi bi-arrow-left me-2"></i>
              {language === 'pt' ? 'Voltar' : 'Back'}
            </button>
          </div>
          
          <p className="lead mb-4">
            {language === 'pt' ? 'Bem-vindo aos materiais do curso!' : 'Welcome to the course materials!'}
          </p>
          
          <div className="list-group">
            <a 
              className="list-group-item list-group-item-action" 
              href="/assets/pdf/Financas_Corporativas_ACITE.pdf" 
              download
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  {language === 'pt' ? 'Plano de Aulas' : 'Syllabus'}
                </h5>
                <small>PDF</small>
              </div>
            </a>
            <a 
              href="#" 
              className="list-group-item list-group-item-action"
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">
                  <i className="bi bi-file-earmark-slides me-2"></i>
                  {language === 'pt' ? 'Apresentação Semana 1' : 'Week 1 Presentation'}
                </h5>
                <small>PPT</small>
              </div>
            </a>
            <a 
              href="#" 
              className="list-group-item list-group-item-action"
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">
                  <i className="bi bi-journal-text me-2"></i>
                  {language === 'pt' ? 'Leituras Recomendadas' : 'Recommended Readings'}
                </h5>
                <small>PDF</small>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}