import { Coins, CircleDollarSign, TrendingUp } from "lucide-react";

export default function FinanceLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full text-center space-y-8 animate-fadeIn font-sans">
      <style>{`
        @keyframes rotateSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes floatCoin1 {
          0% { transform: translateY(20px) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-40px) scale(1); opacity: 0; }
        }
        @keyframes floatCoin2 {
          0% { transform: translateY(25px) scale(0.5) translateX(-15px); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-50px) scale(1.1) translateX(15px); opacity: 0; }
        }
        @keyframes floatCoin3 {
          0% { transform: translateY(15px) scale(0.5) translateX(15px); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-45px) scale(0.9) translateX(-10px); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.2), inset 0 0 15px rgba(16, 185, 129, 0.1); }
          50% { box-shadow: 0 0 35px rgba(16, 185, 129, 0.4), inset 0 0 25px rgba(16, 185, 129, 0.2); }
        }
        @keyframes coinBob {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.03); }
        }
      `}</style>

      {/* Modern High-End Financial Loading Animation */}
      <div className="relative flex items-center justify-center w-36 h-36">
        
        {/* Rotating Outer Ring */}
        <div 
          style={{ animation: 'rotateSlow 6s linear infinite' }}
          className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30 m-2"
        />

        {/* Pulsing Glow Background */}
        <div 
          style={{ animation: 'pulseGlow 2.5s ease-in-out infinite' }}
          className="absolute inset-4 rounded-full bg-emerald-950/20 border border-emerald-500/10 backdrop-blur-sm"
        />

        {/* Central Bobbing Coins Graphic */}
        <div 
          style={{ animation: 'coinBob 2s ease-in-out infinite' }}
          className="relative z-10 flex flex-col items-center text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          <Coins className="h-16 w-16" />
        </div>

        {/* Floating Mini Coins / Dollar signs */}
        <div 
          style={{ animation: 'floatCoin1 1.8s ease-in-out infinite' }}
          className="absolute z-20 text-emerald-500/80"
        >
          <CircleDollarSign className="h-6 w-6" />
        </div>
        
        <div 
          style={{ animation: 'floatCoin2 2.2s ease-in-out infinite', animationDelay: '0.4s' }}
          className="absolute z-20 text-emerald-400/60"
        >
          <TrendingUp className="h-5 w-5" />
        </div>

        <div 
          style={{ animation: 'floatCoin3 2s ease-in-out infinite', animationDelay: '0.8s' }}
          className="absolute z-20 text-emerald-300/70"
        >
          <CircleDollarSign className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Beautiful Loading Text */}
      <div className="space-y-2">
        <h3 className="text-base font-extrabold text-white tracking-wider uppercase animate-pulse">
          Balancing Ledger...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Syncing cash flow registries, updating running balances, and loading financial metrics.
        </p>
      </div>
    </div>
  );
}
