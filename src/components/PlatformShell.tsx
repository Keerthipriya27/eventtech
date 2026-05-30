import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/MobileNav";

export default function PlatformShell({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-screen bg-event-vibrant text-foreground ${className || ""}`}>
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center">
                ET
              </div>
              <span className="hidden sm:inline">EventTech</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button size="sm" variant="ghost">
                Dashboard
              </Button>
            </Link>
            <Link to="/organizer">
              <Button size="sm" variant="ghost">
                Organizer
              </Button>
            </Link>
            <Link to="/sponsor">
              <Button size="sm" variant="ghost">
                Sponsor
              </Button>
            </Link>
            <Link to="/volunteer">
              <Button size="sm" variant="ghost">
                Volunteer
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
