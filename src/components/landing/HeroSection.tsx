import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Globe, CheckCircle } from "lucide-react";

const trustItems = [
  { icon: Shield, label: "Trusted by Universities" },
  { icon: Globe, label: "Secure & Decentralized" },
  { icon: CheckCircle, label: "Built on Polygon / Ethereum" },
];

export function HeroSection() {
  return (
    <section className="relative gradient-hero overflow-hidden">
      {/* Decorative dots */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(hsl(222 65% 33%) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      <div className="container-tight relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary mb-6 animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Blockchain-Powered Certificate Verification
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Academic Certificate Verification{" "}
            <span className="text-primary">Powered by Blockchain</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Secure, decentralized, and instantly verifiable digital certificates
            using Smart Contracts and IPFS.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/dashboard">
              <Button size="lg" className="w-full sm:w-auto px-8 transition-transform hover:scale-[1.02]">
                College Login
              </Button>
            </Link>
            <Link to="/verify">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 transition-transform hover:scale-[1.02]">
                Company Login
              </Button>
            </Link>
          </div>

          {/* Glass card */}
          <div className="glass-card rounded-xl p-6 max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
              {trustItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon size={16} className="text-secondary shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
