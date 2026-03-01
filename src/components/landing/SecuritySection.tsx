import { Lock, Eye, Network, ShieldAlert } from "lucide-react";

const items = [
  {
    icon: Lock,
    title: "Immutability",
    description: "Once recorded, certificate data cannot be altered or deleted from the blockchain.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description: "All verification records are publicly auditable on the blockchain explorer.",
  },
  {
    icon: Network,
    title: "Decentralization",
    description: "No single authority controls the data — it's distributed across the network.",
  },
  {
    icon: ShieldAlert,
    title: "Fraud Prevention",
    description: "Cryptographic hashing ensures forged certificates are instantly detected.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="section-spacing bg-background">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Security</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Enterprise-grade security by design
          </h2>
          <p className="text-muted-foreground">
            Built on battle-tested blockchain infrastructure trusted by leading institutions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="text-center p-6 rounded-xl border border-border/50 bg-card shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            >
              <div className="h-11 w-11 rounded-lg bg-accent/5 flex items-center justify-center mx-auto mb-4">
                <item.icon size={22} className="text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
