import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Unlock } from "lucide-react";

// Injected CSS Keyframes from original site
const styleString = `
@keyframes sonner-fade-in { 
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes sonner-fade-out { 
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8); }
}
@keyframes sonner-spin { 
  0% { opacity: 1; }
  100% { opacity: 0.15; }
}
@keyframes pulse{50%{opacity:.5}}
@keyframes pulse-glow{0%,to{opacity:.4}50%{opacity:.8}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes enter{0%{opacity:var(--tw-enter-opacity, 1);transform:translate3d(var(--tw-enter-translate-x, 0),var(--tw-enter-translate-y, 0),0) scale3d(var(--tw-enter-scale, 1),var(--tw-enter-scale, 1),var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0))}}
@keyframes exit{to{opacity:var(--tw-exit-opacity, 1);transform:translate3d(var(--tw-exit-translate-x, 0),var(--tw-exit-translate-y, 0),0) scale3d(var(--tw-exit-scale, 1),var(--tw-exit-scale, 1),var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0))}}
@keyframes floatA { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(3deg); } }
@keyframes floatB { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(-2deg); } }
@keyframes floatC { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-25px) scale(1.05); } }
@keyframes shimmer { 100% { transform: translateX(100%); } }
`;

const AnimatedElement = ({ children, className, delay = 0 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setIsVisible(true); return; }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { 
        clearTimeout(fallback); 
        setTimeout(() => setIsVisible(true), delay); 
        observer.unobserve(el); 
      }
    }, { threshold: 0.05, rootMargin: '0px 0px 200px 0px' });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);

  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className || ''}`}>
      {children}
    </div>
  );
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  const handleGoogleLogin = () => {};
  const handleDevAccess = () => {};
  const handleForgotPassword = () => {};
  const handleMagicLink = () => {};
  const handleRegister = () => {};

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center relative font-sans selection:bg-primary/20">
      <style>{styleString}</style>
      
      {/* Background Decorative Orbs - Enhanced for depth */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Floating Micro-elements */}
      <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-primary/20 pointer-events-none shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ animation: "floatA 8s ease-in-out infinite" }} />
      <div className="absolute top-[35%] right-[18%] w-3 h-3 rounded-full bg-accent/20 pointer-events-none shadow-[0_0_10px_rgba(var(--accent),0.5)]" style={{ animation: "floatB 6s ease-in-out 2s infinite" }} />
      <div className="absolute bottom-[30%] left-[25%] w-1.5 h-1.5 rounded-full bg-primary/30 pointer-events-none shadow-[0_0_8px_rgba(var(--primary),0.5)]" style={{ animation: "floatC 10s ease-in-out 4s infinite" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center w-full px-4 z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">
            MachiAlex
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            Legal Intelligence Platform
          </p>
        </div>

        {/* Main Login Card */}
        <AnimatedElement delay={150} className="w-full max-w-[420px]">
          <div className="bg-card rounded-[1.5rem] shadow-xl border border-border/40 p-8 sm:p-10 backdrop-blur-xl hover:shadow-2xl transition-shadow duration-500">
            
            <h2 className="text-xl font-semibold text-card-foreground mb-6 tracking-tight">
              Anmelden
            </h2>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border/60 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-xl text-sm transition-all duration-200"
                  autoComplete="email"
                  required
                />
                <Input
                  type="password"
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border/60 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-xl text-sm transition-all duration-200"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 mt-2 shadow-sm hover:shadow-md group"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? "Anmelden..." : "Anmelden"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-7">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">oder</span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {/* Social & Alternative Logins */}
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full h-12 border-border/60 bg-background text-foreground hover:bg-muted/50 transition-all duration-300 rounded-xl flex items-center justify-center gap-3 font-medium hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleGoogleLogin}
              >
                <img
                  alt="Google"
                  src="https://media.base44.com/images/public/69c441d7bade5f765215cc57/d4b94185d_svg_001.svg"
                  className="w-5 h-5"
                />
                Mit Google anmelden
              </Button>

              <Button
                className="w-full h-12 bg-accent text-accent-foreground font-medium rounded-xl hover:bg-accent/90 transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleDevAccess}
              >
                <Unlock className="w-4 h-4 opacity-80" />
                Dev-Zugang (ohne Login)
              </Button>
            </div>

            {/* Footer Links */}
            <div className="flex flex-col items-center gap-3 mt-8">
              <button
                className="text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all duration-200"
                onClick={handleForgotPassword}
              >
                Passwort vergessen?
              </button>
              <button
                className="text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all duration-200"
                onClick={handleMagicLink}
              >
                Mit Magic Link anmelden
              </button>
              <p className="text-sm text-muted-foreground mt-2">
                Noch kein Konto?{" "}
                <button
                  className="text-primary hover:text-primary/80 font-medium hover:underline underline-offset-4 transition-all duration-200"
                  onClick={handleRegister}
                >
                  Registrieren
                </button>
              </p>
            </div>
          </div>
        </AnimatedElement>
      </motion.div>
    </div>
  );
}