import { RouterProvider, useLocation } from "./lib/router";
import { CursorProvider } from "./context/CursorContext";
import { AuthProvider } from "./context/AuthContext";
import CustomCursor from "./components/CustomCursor";
import PageTransition from "./components/PageTransition";
import Navbar from "./components/Navbar";
import HomeSidebar from "./components/HomeSidebar";
import Hero from "./components/Hero";
import FeaturedOpportunityTicker from "./components/FeaturedOpportunityTicker";
import Footer from "./components/Footer";
import InteractiveDotGrid from "./components/InteractiveDotGrid";
import AimPreview from "./components/home/AimPreview";
import FieldPreview from "./components/home/FieldPreview";
import CrewPreview from "./components/home/CrewPreview";
import CirclePreview from "./components/home/CirclePreview";
import MarkPreview from "./components/home/MarkPreview";
import PulsePreview from "./components/home/PulsePreview";
import ReviewsPreview from "./components/home/ReviewsPreview";
import JoinPreview from "./components/home/JoinPreview";
import ExplorePage from "./pages/ExplorePage";
import CollegePage from "./pages/CollegePage";
import JoinPage from "./pages/JoinPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import { isOpportunityCategoryParam } from "./lib/opportunityRoute";
import AimPage from "./pages/AimPage";
import FieldPage from "./pages/FieldPage";
import CrewPage from "./pages/CrewPage";
import CirclePage from "./pages/CirclePage";
import ConnectionsPage from "./pages/ConnectionsPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import MarkPage from "./pages/MarkPage";
import NotificationsPage from "./pages/NotificationsPage";
import PulsePage from "./pages/PulsePage";
import CollegeReviewsPage from "./pages/CollegeReviewsPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import TeamPage from "./pages/TeamPage";

function JavlinHome() {
  return (
    <div className="homepage-canvas relative flex min-h-screen flex-col">
      {/* The dot field is one CSS radial-gradient on this wrapper. The canvas
          particle grid is deliberately not mounted here: it costs an animation
          frame on every scroll for decoration a background paint gives free. */}
      <Navbar />
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 gap-6 lg:px-6">
        <HomeSidebar />
        <main className="min-w-0 flex-1">
          {/* 1. HERO — the front door and the six-area launcher */}
          <Hero />

          {/* 2. TRENDING — what is happening right now */}
          <FeaturedOpportunityTicker />

          {/* 3. Content islands — one per pillar, each on its own surface */}
          <AimPreview />
          <FieldPreview />
          <MarkPreview />
          <CrewPreview />
          <CirclePreview />
          <PulsePreview />
          <ReviewsPreview />
          <JoinPreview />
        </main>
      </div>
      <Footer />
    </div>
  );
}

function AppRouter() {
  const { path } = useLocation();

  let page: React.ReactNode;

  if (path === "/dot-grid") page = <InteractiveDotGrid />;
  else if (path === "/aim") page = <AimPage />;
  else if (path === "/field") page = <FieldPage />;
  else if (path === "/crew") page = <CrewPage />;
  else if (path === "/circle") page = <CirclePage />;
  // Before the /circle/:id match, or "connections" is read as a user id.
  else if (path === "/circle/connections") page = <ConnectionsPage />;
  else if (path.startsWith("/circle/")) page = <StudentProfilePage userId={path.replace("/circle/", "").replace(/\/$/, "")} />;
  else if (path === "/mark") page = <MarkPage />;
  else if (path === "/notifications") page = <NotificationsPage />;
  else if (path === "/pulse") page = <PulsePage />;
  else if (path === "/college-reviews") page = <CollegeReviewsPage />;
  else if (path === "/explore") page = <ExplorePage />;
  else if (path.startsWith("/explore/")) page = <CollegePage slug={path.replace("/explore/", "").replace(/\/$/, "")} />;
  else if (path === "/join") page = <JoinPage />;
  else if (path.startsWith("/join/")) page = <JoinPage roleId={path.replace("/join/", "").replace(/\/$/, "")} />;
  else if (path === "/opportunities") page = <OpportunitiesPage />;
  else if (path.startsWith("/opportunities/")) {
    // One path, two meanings: the four known slugs are category filters, and
    // anything else on this path is an opportunity id — which keeps the
    // category route intact while making a pasted detail link refreshable.
    const param = path.replace("/opportunities/", "").replace(/\/$/, "");
    page = isOpportunityCategoryParam(param) ? (
      <OpportunitiesPage categoryId={param} />
    ) : (
      <OpportunityDetailPage opportunityId={param} />
    );
  }
  else if (path === "/admin") page = <AdminPage />;
  else if (path === "/login" || path === "/signin") page = <LoginPage />;
  else if (path === "/signup" || path === "/register") page = <SignupPage />;
  else if (path === "/reset-password") page = <ResetPasswordPage />;
  else if (path === "/dashboard") page = <DashboardPage />;
  else if (path.startsWith("/teams/")) page = <TeamPage teamId={path.replace("/teams/", "").replace(/\/$/, "")} />;
  else page = <JavlinHome />;

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
