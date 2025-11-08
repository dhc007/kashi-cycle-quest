import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import bolt91Logo from "@/assets/bolt91-logo.png";

export const Navbar = () => {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={bolt91Logo} alt="Bolt91" className="h-10" />
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/book">Book Now</Link>
          </Button>
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/admin">Admin</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
