import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Basic",
    price: "$49",
    period: "/month",
    description: "For small institutions getting started",
    features: [
      "Up to 500 certificates/year",
      "Basic dashboard",
      "Email support",
      "IPFS storage",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    description: "For growing universities and colleges",
    features: [
      "Up to 5,000 certificates/year",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Bulk issuance",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale institutional deployments",
    features: [
      "Unlimited certificates",
      "Dedicated account manager",
      "SLA guarantee",
      "API access",
      "White-label solution",
      "On-premise option",
    ],
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section-spacing bg-muted/30">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">
            Choose the plan that fits your institution's needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                  : "bg-card border border-border/50 shadow-card hover:shadow-card-hover"
              }`}
            >
              <h3 className={`text-lg font-semibold mb-1 ${plan.highlighted ? "" : "text-foreground"}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-4 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={16} className={plan.highlighted ? "text-secondary" : "text-secondary"} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "secondary" : "outline"}
                className="w-full transition-transform hover:scale-[1.02]"
              >
                {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
