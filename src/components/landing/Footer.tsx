import { Linkedin, Twitter, Github } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Security", "Documentation"],
  Company: ["About", "Contact", "Careers", "Blog"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  Support: ["Help Center", "API Reference", "Status Page"],
};

export function Footer() {
  return (
    <footer className="bg-footer text-footer-foreground pt-16 pb-8">
      <div className="container-tight">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CC</span>
              </div>
              <span className="font-bold text-lg text-footer-heading">CertiChain</span>
            </div>
            <p className="text-sm text-footer-foreground leading-relaxed">
              Blockchain-powered academic certificate verification for the modern institution.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-footer-heading text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-footer-heading transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-sidebar-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-footer-foreground">
            © {new Date().getFullYear()} CertiChain. All rights reserved.
          </p>
          <div className="flex gap-4">
            {[Linkedin, Twitter, Github].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-sidebar-accent transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
