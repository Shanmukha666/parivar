'use client';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Portal</h1>
        <input type="text" placeholder="Admin ID" className="w-full p-4 mb-4 border rounded-xl" />
        <input type="password" placeholder="Password" className="w-full p-4 mb-6 border rounded-xl" />
        <button 
          onClick={() => router.push('/admin/dashboard')}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
