import { RouterProvider, useLocation } from "./lib/router";
import { CursorProvider } from "./context/CursorContext";
import CustomCursor from "./components/CustomCursor";
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
import DevModeIndicator from "./components/DevModeIndicator";

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

  if (path === "/dot-grid") return <InteractiveDotGrid />;
  if (path === "/explore") return <ExplorePage />;
  if (path.startsWith("/explore/")) return <CollegePage slug={path.replace("/explore/", "").replace(/\/$/, "")} />;
  if (path === "/join") return <JoinPage />;
  if (path.startsWith("/join/")) return <JoinPage roleId={path.replace("/join/", "").replace(/\/$/, "")} />;
  if (path === "/opportunities" || path.startsWith("/opportunities/")) {
    return <OpportunitiesPage categoryId={path.replace("/opportunities", "").replace(/^\/|\/$/g, "") || undefined} />;
  }
  if (path === "/admin") return <AdminPage />;
  return <DuScienceHubHome />;
}

export default function App() {
  return (
    <RouterProvider>
      <CursorProvider>
        <CustomCursor />
        <AppRouter />
        <DevModeIndicator />
      </CursorProvider>
    </RouterProvider>
  );
}
