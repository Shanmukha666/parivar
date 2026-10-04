import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
      <Link href="/" className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors">
        Return Home
      </Link>
    </div>
  );
}
