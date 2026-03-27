"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const logoutHandler = async () => {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <button
        type="button"
        className="hidden md:flex cursor-pointer px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 hover:from-blue-700 hover:to-purple-700"
        onClick={logoutHandler}
      >
        Logout
      </button>
    </div>
  );
}

