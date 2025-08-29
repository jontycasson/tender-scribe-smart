import { Link } from "react-router-dom";

const Footer = () => {
  const links = [
    { name: "Pricing", href: "/pricing" },
    { name: "Security", href: "/security" },
    { name: "Company", href: "/company" },
    { name: "Contact", href: "/contact" },
    { name: "Terms", href: "/terms" },
    { name: "Privacy", href: "/privacy" },
    { name: "Acceptable Use Policy", href: "/acceptable-use" },
    { name: "Changelog", href: "/changelog" },
  ];

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
          {links.map(({ name, href }) => (
            <Link
              key={name}
              to={href}
              className="hover:text-foreground transition-colors"
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;