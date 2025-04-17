// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError('');
  
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
  
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0]; // Get the first matching user
        const userData = userDoc.data();
        const role = userData.role?.toLowerCase();
        if (role === 'office assistant' || role === 'founder') {
          console.log(email);
          navigate('/admindashboard');
          localStorage.setItem('userEmail', email);
        } else {
          console.log(email);
          navigate('/userdashboard');
          localStorage.setItem('userEmail', email);

        }
      } else {
        setError('User not found!');
      }
    } catch (err) {
      console.error('Error checking user:', err);
      console.log(email);
      setError('Something went wrong. Please try again.');
    }
  };
  

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-center text-blue-600 mb-6">Welcome to UNIK Dessert World</h1>
  
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-lg font-medium text-gray-700">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
  
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
  
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 ease-in-out"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
