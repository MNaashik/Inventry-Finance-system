import { ShoppingCart, Package } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full text-center space-y-6 animate-fadeIn">
      <style>{`
        @keyframes pageBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pageDrop {
          0% { transform: translateY(-35px) scale(0.6); opacity: 0; }
          30% { transform: translateY(8px) scale(1); opacity: 1; }
          70% { transform: translateY(8px) scale(1); opacity: 1; }
          100% { transform: translateY(20px) scale(0.6); opacity: 0; }
        }
      `}</style>

      {/* Animated E-commerce Loading Graphic */}
      <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-primary/5 border border-primary/10 shadow-lg shadow-primary/5 overflow-hidden">
        {/* Bobbing Shopping Cart */}
        <div style={{ animation: 'pageBob 1.5s ease-in-out infinite' }} className="text-primary relative z-10 mt-5">
          <ShoppingCart className="h-14 w-14" />
        </div>
        {/* Falling Package */}
        <div style={{ animation: 'pageDrop 1.5s cubic-bezier(0.25, 1, 0.5, 1) infinite' }} className="absolute top-5 z-0">
          <Package className="h-8 w-8 text-primary/80" />
        </div>
      </div>

      {/* Informative loading texts */}
      <div className="space-y-1">
        <p className="text-sm font-bold text-white tracking-wide animate-pulse">Loading ....</p>
        <p className="text-xs text-slate-500">Retrieving system registries and updating metrics...</p>
      </div>
    </div>
  );
}
