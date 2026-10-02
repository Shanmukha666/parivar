'use client';
import { useRouter } from 'next/navigation';

export default function CounsellorLogin() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col min-h-screen bg-teal-50 items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-teal-900 mb-6 text-center">Counsellor Portal</h1>
        <input type="text" placeholder="ID or Email" className="w-full p-4 mb-4 border rounded-xl" />
        <input type="password" placeholder="Password" className="w-full p-4 mb-6 border rounded-xl" />
        <button 
          onClick={() => router.push('/counsellor/dashboard')}
          className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
