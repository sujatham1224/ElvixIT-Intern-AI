import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return <div className="page-wrap"><EmptyState icon="404" title="Oops, this page wandered off" description="The link may be out of date. Let's get you back to something delicious." action={<Link to="/" className="button button-primary">Back to home</Link>} /></div>;
}
