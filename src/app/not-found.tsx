import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/en"
          className="inline-block px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
