import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-900">

      <h1 className="text-8xl font-bold text-blue-600">
        404
      </h1>

      <h2 className="text-3xl font-bold mt-4">
        Page Not Found
      </h2>

      <p className="text-slate-400 mt-4">
        The page you are looking for does not exist.
      </p>

      <Link
        href="/"
        className="mt-8 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition"
      >
        Return Home
      </Link>

    </main>
  );
}