"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Compass } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Indoor Temp", href: "/indoor-temp" },
  { name: "Design", href: "/design" },
  { name: "Thermal Energy", href: "/thermal-energy" },
  { name: "Heat Flow", href: "/heat-flow" },
  { name: "Dashboard", href: "/dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground transition-colors hover:text-accent"
        >
          <span className="flex h-7 w-7 items-center justify-center border border-border bg-card text-accent">
            <Compass size={16} />
          </span>
          <span className="font-sans font-bold">Cold-Climate Shelter</span>
          <span className="hidden rounded-none border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
            SIH 26051
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-b-2 border-accent text-accent font-semibold bg-accent/5"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-background px-4 py-2 md:hidden">
          <div className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between border-l-2 px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-accent bg-accent/10 font-semibold text-accent"
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="font-mono text-[10px] text-accent">ACTIVE</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
