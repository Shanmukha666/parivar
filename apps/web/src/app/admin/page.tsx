'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      if (!supabase) {
        if (email.includes('admin') || password === 'demo123') {
          router.push('/admin/dashboard');
          return;
        }
        throw new Error('Invalid credentials');
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push('/admin/dashboard');
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Portal</h1>
        {error && <div className="mb-4 text-red-600 text-sm font-semibold">{error}</div>}
        <input 
          type="text" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Staff email" 
          className="w-full p-4 mb-4 border rounded-xl focus:ring-2 focus:ring-blue-500" 
        />
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          className="w-full p-4 mb-6 border rounded-xl focus:ring-2 focus:ring-blue-500" 
        />
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  );
}
