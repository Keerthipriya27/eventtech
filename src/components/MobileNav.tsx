import { Link } from '@tanstack/react-router';
import { Home, QrCode, Users, Trophy, UserPlus } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-background/90 backdrop-blur rounded-xl border border-border shadow-md sm:hidden">
      <div className="flex items-center justify-between px-3 py-2 touch-press">
        <Link to="/" className="flex-1 text-center py-2">
          <Home className="mx-auto w-5 h-5 text-muted-foreground" />
          <div className="text-[10px] text-muted-foreground mt-1">Home</div>
        </Link>
        <Link to="#checkin-section" className="flex-1 text-center py-2">
          <QrCode className="mx-auto w-5 h-5 text-muted-foreground" />
          <div className="text-[10px] text-muted-foreground mt-1">Check-In</div>
        </Link>
        <Link to="/network" className="flex-1 text-center py-2">
          <Users className="mx-auto w-5 h-5 text-muted-foreground" />
          <div className="text-[10px] text-muted-foreground mt-1">Network</div>
        </Link>
        <Link to="/volunteer" className="flex-1 text-center py-2">
          <Trophy className="mx-auto w-5 h-5 text-muted-foreground" />
          <div className="text-[10px] text-muted-foreground mt-1">Volunteers</div>
        </Link>
        <Link to="/sponsor" className="flex-1 text-center py-2">
          <UserPlus className="mx-auto w-5 h-5 text-muted-foreground" />
          <div className="text-[10px] text-muted-foreground mt-1">Sponsors</div>
        </Link>
      </div>
    </nav>
  );
}
