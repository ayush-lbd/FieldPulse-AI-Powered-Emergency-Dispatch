import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    try {
      // 1. Send credentials to your Express Auth Controller
      const res = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email,
        password
      }, {
        withCredentials: true // Crucial: Tells the browser to accept the secure httpOnly cookies
      });

      // 2. Save the JWT token to localStorage so our ProtectedRoute allows access
      localStorage.setItem('fieldPulseToken', res.data.data.accessToken);
      
      // 3. Redirect the safety personnel to the map
      navigate('/dashboard');
      
    } catch (err) {
      // Show the actual error message from the backend (or a fallback)
      setError(err.response?.data?.message || "Invalid coordinator credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-3 rounded-full mb-3 text-blue-600">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Security Portal</h2>
          <p className="text-gray-500 text-sm mt-1">Authorized Coordinators Only</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Badge ID / Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="admin@fieldpulse.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition">
            Authenticate & Enter
          </button>
        </form>

      </div>
    </div>
  );
}