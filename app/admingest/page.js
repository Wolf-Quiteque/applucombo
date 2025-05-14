'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../page.module.css';

// Cloudinary API URL and Upload Preset
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dbagu0ju8/image/upload';
const UPLOAD_PRESET = 'utjuauqd';

// Function to handle uploading the image to Cloudinary
export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    // Sending the image to Cloudinary
    const response = await axios.post(CLOUDINARY_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Returning the URL of the uploaded image
    return response.data.secure_url;
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

export default function AdmingestPage() {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (selectedCourse) {
        try {
          const response = await fetch(`/api/materials/get?courseId=${selectedCourse}`);
          const data = await response.json();

          if (data.success) {
            setMaterials(data.data);
          } else {
            console.error('Error fetching materials:', data.error);
            alert('Error fetching materials: ' + data.error);
          }
        } catch (error) {
          console.error('Error fetching materials:', error);
          alert('Error fetching materials: ' + error.message);
        }
      } else {
        setMaterials([]);
      }
    };

    fetchMaterials();
  }, [selectedCourse]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (selectedSchool) {
        try {
          const response = await fetch(`/api/courses/get?schoolId=${selectedSchool}`);
          const data = await response.json();

          if (data.success) {
            setCourses(data.data);
          } else {
            console.error('Error fetching courses:', data.error);
            alert('Error fetching courses: ' + data.error);
          }
        } catch (error) {
          console.error('Error fetching courses:', error);
          alert('Error fetching courses: ' + error.message);
        }
      } else {
        setCourses([]);
      }
    };

    fetchCourses();
  }, [selectedSchool]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch('/api/schools/get');
        const data = await response.json();

        if (data.success) {
          setSchools(data.data);
        } else {
          console.error('Error fetching schools:', data.error);
          alert('Error fetching schools: ' + data.error);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        alert('Error fetching schools: ' + error.message);
      }
    };

    fetchSchools();
  }, []);

  const [newSchool, setNewSchool] = useState({ id: '', name_pt: '', name_en: '' });
  const [newCourse, setNewCourse] = useState({ year: '', id: '', name_pt: '', name_en: '', description_pt: '', description_en: '', passcode: '' });
  const [newMaterial, setNewMaterial] = useState({ title_pt: '', title_en: '', type: '', file: null, link: '', planoDeAula: false });

  // Handlers for School Management
  const handleCreateSchool = async () => {
    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchool),
      });

      const data = await response.json();

      if (data.success) {
        setSchools([...schools, newSchool]);
        setNewSchool({ id: '', name_pt: '', name_en: '' });
      } else {
        console.error('Error creating school:', data.error);
        alert('Error creating school: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating school:', error);
      alert('Error creating school: ' + error.message);
    }
  };

  // Handlers for Course Management
  const handleCreateCourse = async () => {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newCourse, schoolId: selectedSchool }),
      });

      const data = await response.json();

      if (data.success) {
        setCourses([...courses, { ...newCourse, schoolId: selectedSchool }]);
        setNewCourse({ year: '', id: '', name_pt: '', name_en: '', description_pt: '', description_en: '', passcode: '' });
      } else {
        console.error('Error creating course:', data.error);
        alert('Error creating course: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error creating course: ' + error.message);
    }
  };

 // Handlers for Material Management
  const handleCreateMaterial = async () => {
    try {
      let cloudinaryUrl = '';
      if (newMaterial.file) {
        cloudinaryUrl = await uploadToCloudinary(newMaterial.file);
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newMaterial, courseId: selectedCourse, cloudinaryUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials([...materials, { ...newMaterial, courseId: selectedCourse, cloudinaryUrl }]);
        setNewMaterial({ title_pt: '', title_en: '', type: '', file: null, link: '', planoDeAula: false });
      } else {
        console.error('Error creating material:', data.error);
        alert('Error creating material: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating material:', error);
      alert('Error creating material: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      {/* School Management */}
      <section>
        <h2>Schools</h2>
        <div className="mb-3">
          <label className="form-label">School ID</label>
          <input type="text" className="form-control" value={newSchool.id} onChange={(e) => setNewSchool({ ...newSchool, id: e.target.value })} />
        </div>
        <div className="mb-3">
          <label className="form-label">Name (PT)</label>
          <input type="text" className="form-control" value={newSchool.name_pt} onChange={(e) => setNewSchool({ ...newSchool, name_pt: e.target.value })} />
        </div>
        <div className="mb-3">
          <label className="form-label">Name (EN)</label>
          <input type="text" className="form-control" value={newSchool.name_en} onChange={(e) => setNewSchool({ ...newSchool, name_en: e.target.value })} />
        </div>
        <button className="btn btn-primary" onClick={handleCreateSchool}>Create School</button>
        <ul>
          {schools.map(school => (
            <li key={school.id}>{school.name_pt}</li>
          ))}
        </ul>
      </section>

      {/* Course Management */}
      <section>
        <h2>Courses</h2>
        <div className="mb-3">
          <label className="form-label">Select School</label>
          <select className="form-select" value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
            <option value="">Select a school</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>{school.name_pt}</option>
            ))}
          </select>
        </div>

        {selectedSchool && (
          <>
            <div className="mb-3">
              <label className="form-label">Year</label>
              <input type="text" className="form-control" value={newCourse.year} onChange={(e) => setNewCourse({ ...newCourse, year: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Course ID</label>
              <input type="text" className="form-control" value={newCourse.id} onChange={(e) => setNewCourse({ ...newCourse, id: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Name (PT)</label>
              <input type="text" className="form-control" value={newCourse.name_pt} onChange={(e) => setNewCourse({ ...newCourse, name_pt: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Name (EN)</label>
              <input type="text" className="form-control" value={newCourse.name_en} onChange={(e) => setNewCourse({ ...newCourse, name_en: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Description (PT)</label>
              <input type="text" className="form-control" value={newCourse.description_pt} onChange={(e) => setNewCourse({ ...newCourse, description_pt: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Description (EN)</label>
              <input type="text" className="form-control" value={newCourse.description_en} onChange={(e) => setNewCourse({ ...newCourse, description_en: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Passcode</label>
              <input type="text" className="form-control" value={newCourse.passcode} onChange={(e) => setNewCourse({ ...newCourse, passcode: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={handleCreateCourse}>Create Course</button>
            <ul>
              {courses.filter(course => course.schoolId === selectedSchool).map(course => (
                <li key={course.id}>{course.name_pt}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Material Management */}
      <section>
        <h2>Materials</h2>
        <div className="mb-3">
          <label className="form-label">Select School</label>
          <select className="form-select" value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
            <option value="">Select a school</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>{school.name_pt}</option>
            ))}
          </select>
        </div>

        {selectedSchool && (
          <div className="mb-3">
            <label className="form-label">Select Course</label>
            <select className="form-select" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">Select a course</option>
              {courses.filter(course => course.schoolId === selectedSchool).map(course => (
                <option key={course.id} value={course.id}>{course.name_pt}</option>
              ))}
            </select>
          </div>
        )}

        {selectedCourse && (
          <>
            <div className="mb-3">
              <label className="form-label">Title (PT)</label>
              <input type="text" className="form-control" value={newMaterial.title_pt} onChange={(e) => setNewMaterial({ ...newMaterial, title_pt: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Title (EN)</label>
              <input type="text" className="form-control" value={newMaterial.title_en} onChange={(e) => setNewMaterial({ ...newMaterial, title_en: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Type</label>
              <input type="text" className="form-control" value={newMaterial.type} onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">File</label>
              <input type="file" className="form-control" onChange={(e) => setNewMaterial({ ...newMaterial, file: e.target.files[0] })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Link</label>
              <input type="text" className="form-control" value={newMaterial.link} onChange={(e) => setNewMaterial({ ...newMaterial, link: e.target.value })} />
            </div>
            <div className="mb-3 form-check">
              <input type="checkbox" className="form-check-input" checked={newMaterial.planoDeAula} onChange={(e) => setNewMaterial({ ...newMaterial, planoDeAula: e.target.checked })} />
              <label className="form-check-label">Plano de Aula</label>
            </div>
            <button className="btn btn-primary" onClick={handleCreateMaterial}>Create Material</button>
            <ul>
              {materials.filter(material => material.courseId === selectedCourse).map(material => (
                <li key={material.title_pt}>{material.title_pt}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
