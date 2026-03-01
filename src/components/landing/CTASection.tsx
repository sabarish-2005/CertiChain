import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="gradient-cta section-spacing">
      <div className="container-tight text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Ready to modernize your certificate system?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Join hundreds of institutions already issuing digital certificates on the blockchain.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/dashboard">
            <Button size="lg" className="px-10 transition-transform hover:scale-[1.02]">
              College Login
            </Button>
          </Link>
          <Link to="/verify">
            <Button variant="outline" size="lg" className="px-10 transition-transform hover:scale-[1.02]">
              Company Login
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
