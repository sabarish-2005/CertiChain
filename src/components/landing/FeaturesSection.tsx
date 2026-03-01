import { Database, ShieldCheck, Search } from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Decentralized Storage (IPFS)",
    description:
      "Certificates are stored on IPFS, a distributed file system, ensuring permanent availability and eliminating single points of failure.",
  },
  {
    icon: ShieldCheck,
    title: "Smart Contract Security",
    description:
      "Every certificate is anchored to an immutable smart contract on the blockchain, making tampering or forgery mathematically impossible.",
  },
  {
    icon: Search,
    title: "Instant Employer Verification",
    description:
      "Employers can verify any certificate in real-time with a single search — no phone calls, no emails, no delays.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-spacing bg-background">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to issue and verify certificates
          </h2>
          <p className="text-muted-foreground">
            Built with enterprise-grade security and simplicity in mind.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group bg-card rounded-xl p-8 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 border border-border/50"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-11 w-11 rounded-lg bg-primary/5 flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
                <feature.icon size={22} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
