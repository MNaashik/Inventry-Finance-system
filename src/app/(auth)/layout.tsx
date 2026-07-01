import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 antialiased font-sans">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-6 sm:p-8 bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
