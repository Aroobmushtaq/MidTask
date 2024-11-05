import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const [doctorDetails, setDoctorDetails] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeSection, setActiveSection] = useState('details');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [available, setAvailable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await fetchDoctorDetails(user.uid);
        fetchAppointments(user.uid);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchDoctorDetails = async (id) => {
    const doctorDocRef = doc(db, 'doctors', id);
    const doctorDocSnapshot = await getDoc(doctorDocRef);

    if (doctorDocSnapshot.exists()) {
      const data = doctorDocSnapshot.data();
      setDoctorDetails(data);
      setName(data.name || '');
      setSpecialization(data.specialization || '');
    } else {
      console.log("No such document!");
    }
  };

  const fetchAppointments = (doctorId) => {
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsQuery = query(appointmentsRef, where('doctorId', '==', doctorId));
    const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
      const appointmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAppointments(appointmentsList);
    });

    return unsubscribe;
  };

  const handleSaveDetails = async () => {
    const doctorDocRef = doc(db, 'doctors', userId);
    await setDoc(doctorDocRef, { name, specialization }, { merge: true });
    alert("Doctor details saved successfully.");
    setIsEditing(false);
  };

  const handleSaveSlot = async () => {
    if (!startTime || !endTime) {
      alert("Please select start and end time.");
      return;
    }

    const slot = {
      startTime,
      endTime,
      available,
    };
    setSchedule([...schedule, slot]);
    alert("Slot added successfully!");
    clearSlotForm();
  };

  const clearSlotForm = () => {
    setStartTime('');
    setEndTime('');
    setAvailable(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const formatDate = (date) => new Date(date.seconds * 1000).toLocaleString();

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>

      <div className="w-full max-w-md mb-4 flex justify-around">
        <button onClick={() => setActiveSection('details')} className={activeSection === 'details' ? 'border-b-2 border-blue-500' : ''}>
          Details
        </button>
        <button onClick={() => setActiveSection('schedule')} className={activeSection === 'schedule' ? 'border-b-2 border-blue-500' : ''}>
          Schedule
        </button>
        <button onClick={() => setActiveSection('appointments')} className={activeSection === 'appointments' ? 'border-b-2 border-blue-500' : ''}>
          Appointments
        </button>
      </div>

      {/* Render Sections */}
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        {activeSection === 'details' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Doctor Details</h2>
            {isEditing ? (
              <>
                <label className="block mb-2">
                  Name:
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </label>
                <label className="block mb-2">
                  Specialization:
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </label>
                <button onClick={handleSaveDetails} className="w-full py-2 font-semibold text-white bg-blue-500 rounded-md">
                  Save Details
                </button>
                <button onClick={() => setIsEditing(false)} className="w-full py-2 mt-2 font-semibold text-white bg-gray-500 rounded-md">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>Specialization:</strong> {specialization}</p>
                <button onClick={() => setIsEditing(true)} className="mt-4 py-2 px-4 font-semibold text-white bg-blue-500 rounded-md">
                  Edit Details
                </button>
              </>
            )}
          </div>
        )}

        {activeSection === 'schedule' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Manage Schedule</h2>
            <label className="block mb-2">
              Start Time:
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </label>
            <label className="block mb-2">
              End Time:
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </label>
            <label className="block mb-4">
              Available:
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="ml-2"
              />
            </label>
            <button onClick={handleSaveSlot} className="w-full py-2 font-semibold text-white bg-blue-500 rounded-md">
              Add Slot
            </button>

            {/* Display Schedule */}
            <h2 className="text-xl font-bold mt-6">Current Schedule</h2>
            {schedule.map((slot, index) => (
              <div key={index} className="mt-2">
                <p><strong>Start:</strong> {slot.startTime} | <strong>End:</strong> {slot.endTime} | <strong>Available:</strong> {slot.available ? 'Yes' : 'No'}</p>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'appointments' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Upcoming Appointments</h2>
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="mb-4 p-4 border rounded-md">
                  {/* <p><strong>Patient ID:</strong> {appointment.patientId}</p> */}
                  <p><strong>Date & Time:</strong> {formatDate(appointment.dateTime)}</p>
                  <p><strong>Notes:</strong> {appointment.notes}</p>
                </div>
              ))
            ) : (
              <p>No upcoming appointments</p>
            )}
          </div>
        )}
      </div>

      {/* <button onClick={handleLogout} className="mt-4 py-2 px-4 font-semibold text-white bg-red-500 rounded-md">
        Logout
      </button> */}
    </div>
  );
};

export default DoctorDashboard;
