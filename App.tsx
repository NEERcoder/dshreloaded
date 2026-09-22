import { RouterProvider, useLocation } from "./lib/router";
import { CursorProvider } from "./context/CursorContext";
import { AuthProvider } from "./context/AuthContext";
import CustomCursor from "./components/CustomCursor";
import PageTransition from "./components/PageTransition";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HomeChoices from "./components/HomeChoices";
import Footer from "./components/Footer";
import InteractiveDotGrid from "./components/InteractiveDotGrid";
import ExplorePage from "./pages/ExplorePage";
import CollegePage from "./pages/CollegePage";
import JoinPage from "./pages/JoinPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";

function DuScienceHubHome() {
  return (
    <div className="relative min-h-screen isolate">
      {/* Signature Living Background */}
      <InteractiveDotGrid background preset="home" />
      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        <Navbar />
        <main className="flex-1">
          {/* 1. SIMPLE HERO — THE FRONT DOOR */}
          <Hero />

          {/* 2. THREE GRAND DOORS — CHOOSE WHAT YOU CAME HERE FOR */}
          <HomeChoices />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function AppRouter() {
  const { path } = useLocation();

  let page: React.ReactNode;

  if (path === "/dot-grid") page = <InteractiveDotGrid />;
  else if (path === "/explore") page = <ExplorePage />;
  else if (path.startsWith("/explore/")) page = <CollegePage slug={path.replace("/explore/", "").replace(/\/$/, "")} />;
  else if (path === "/join") page = <JoinPage />;
  else if (path.startsWith("/join/")) page = <JoinPage roleId={path.replace("/join/", "").replace(/\/$/, "")} />;
  else if (path === "/opportunities" || path.startsWith("/opportunities/")) {
    page = <OpportunitiesPage categoryId={path.replace("/opportunities", "").replace(/^\/|\/$/g, "") || undefined} />;
  }
  else if (path === "/admin") page = <AdminPage />;
  else if (path === "/login" || path === "/signin") page = <LoginPage />;
  else if (path === "/signup" || path === "/register") page = <SignupPage />;
  else if (path === "/reset-password") page = <ResetPasswordPage />;
  else if (path === "/dashboard") page = <DashboardPage />;
  else page = <DuScienceHubHome />;

  return <PageTransition>{page}</PageTransition>;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <CursorProvider>
          <CustomCursor />
          <AppRouter />
        </CursorProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
