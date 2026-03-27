import Link from "next/link";

export default function Home() {
  // Clone of Aim_Admin_Portal `/` (StartupPage): Welcome Admin + Login/Signup buttons.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="animate-fadeIn w-full max-w-md rounded-2xl bg-white/10 p-8 text-center shadow-xl backdrop-blur-lg">
        <h1 className="mb-6 text-4xl font-extrabold text-white drop-shadow-lg md:text-5xl">
          Welcome Admin
        </h1>

        <div className="flex flex-col justify-center gap-4 md:flex-row">
          <Link
            href="/login"
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-blue-700 md:w-auto"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="w-full rounded-lg bg-green-500 px-6 py-3 text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-green-600 md:w-auto"
          >
            Signup
          </Link>
        </div>
      </div>
    </div>
  );
}
