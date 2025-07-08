import React from "react";
import { Button } from "./ui/button";
import { Heart, CarFront, Layout, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { Arrow } from "@radix-ui/react-dropdown-menu";

const Header = async ({ isAdminPage = false }) => {
  const isAdmin = false;
  return (
    <header className="fixed top-0 w-full bg-wite/80 backdrop-blur-md z-50 border-b">
      <nav className="mx-auto px-4 py-4 flex items-center justify-between">
        <Link href={isAdminPage ? "/admin" : "/"}>
          <Image
            src={"/logo.png"}
            alt="Vehiql logo"
            width={200}
            height={60}
            className="h-12 w-auto object-contain"
            // suppressHydrationWarning
          />
          {isAdminPage && (
            <span className="text-xs font-extralight">admin</span>
          )}
        </Link>
        <div>
          {isAdminPage ? (
            <Link href="/saved-cars">
              <Button variant="destructive" className="flex items-center gap-2">
                <ArrowLeft size={18} />
                <span>Back to app</span>
              </Button>
            </Link>
          ) : (
            <SignedIn>
              <Link href="/saved-cars">
                <Button>
                  <Heart size={18} />
                  <span className="hidden md:inline">Saved cars</span>
                </Button>
              </Link>
              {!isAdmin ? (
                <Link href="/reservations">
                  <Button variant="outline">
                    <CarFront size={18} />
                    <span className="hidden md:inline">My reservations</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/admin">
                  <Button variant="outline">
                    <CarFront size={18} />
                    <span className="hidden md:inline">Admin portal</span>
                  </Button>
                </Link>
              )}
            </SignedIn>
          )}
          <SignedOut>
            <SignInButton forceRedirectUrl="/">
              <Button variant="outline">Login</Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton appearance={{ 
                elements:{
                    avatarBox: "w-10 h-10"
                }
            }}/>
          </SignedIn>
        </div>
      </nav>
    </header>
  );
};

export default Header;
