import { Link } from "react-router-dom";
import { Button } from "../components/ui";

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-6xl font-bold text-navy-800">404</p>
      <p className="text-slate-600">We couldn't find that page.</p>
      <Link to="/dashboard"><Button>Back to overview</Button></Link>
    </div>
  );
}
