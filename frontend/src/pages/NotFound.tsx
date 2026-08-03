import { Link } from "react-router-dom";
import { Button } from "../components/ui/Basics";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-low px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-primary mb-2">404</div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Page not found</h1>
        <p className="text-on-surface-variant mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
