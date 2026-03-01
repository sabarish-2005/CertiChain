import { Upload, Database, Link as LinkIcon, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "College Uploads Certificate",
    description: "The institution uploads the student's certificate via the admin dashboard.",
  },
  {
    icon: Database,
    title: "Stored on IPFS",
    description: "The certificate file is stored on IPFS, generating a unique content hash.",
  },
  {
    icon: LinkIcon,
    title: "Hash Recorded on Blockchain",
    description: "The IPFS hash is recorded on-chain via a smart contract for immutability.",
  },
  {
    icon: CheckCircle,
    title: "Employer Verifies Instantly",
    description: "Anyone can verify authenticity by querying the blockchain in real-time.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-spacing bg-muted/30">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            From issuance to verification in four steps
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden md:block" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-6 items-start group">
                <div className="relative z-10 shrink-0">
                  <div className="h-12 w-12 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-card group-hover:border-primary/50 transition-colors">
                    <step.icon size={20} className="text-primary" />
                  </div>
                </div>
                <div className="pt-2 pb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Step {i + 1}
                  </p>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
