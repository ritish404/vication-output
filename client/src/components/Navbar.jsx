import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useUser,
  UserButton,
  SignInButton,
  SignUpButton,
} from "@clerk/clerk-react";

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const ClerkAuthControls = () => {
  const { isSignedIn } = useUser();

  return (
    <>
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <>
          <SignInButton mode="modal">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md">Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="border border-blue-600 text-blue-600 px-4 py-2 rounded-md">
              Sign Up
            </button>
          </SignUpButton>
        </>
      )}
    </>
  );
};

const AuthControls = () => {
  if (!hasClerkKey) {
    return (
      <button className="bg-slate-700 text-white px-4 py-2 rounded-md" disabled>
        Demo mode
      </button>
    );
  }

  return <ClerkAuthControls />;
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-teal-300 shadow-lg py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gray-800">
          AI Vacation Outfit Assistant
        </Link>

        <div className="hidden md:flex space-x-6">
          <Link to="/" className="text-gray-700 hover:text-gray-900">Home</Link>
          <Link to="/about" className="text-gray-700 hover:text-gray-900">About</Link>
          <Link to="/vacation" className="text-gray-700 hover:text-gray-900">Vacation</Link>
          <Link to="/contact" className="text-gray-700 hover:text-gray-900">Contact</Link>
        </div>

        <div className="hidden md:flex space-x-4">
          <AuthControls />
        </div>

        <button className="md:hidden text-gray-800" onClick={() => setIsOpen(!isOpen)}>
          ☰
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden flex flex-col space-y-4 px-6 py-4 bg-white shadow-lg">
          <Link to="/" className="text-gray-700 hover:text-gray-900">Home</Link>
          <Link to="/about" className="text-gray-700 hover:text-gray-900">About</Link>
          <Link to="/vacation" className="text-gray-700 hover:text-gray-900">Vacation</Link>
          <Link to="/contact" className="text-gray-700 hover:text-gray-900">Contact</Link>
          <AuthControls />
        </div>
      )}
    </nav>
  );
};

export default Navbar;




