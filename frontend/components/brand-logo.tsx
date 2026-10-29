import Image from "next/image";
import lingoLogo from "../public/branding/lingo-logo.png";

export function BrandLogo() {
  return <Image src={lingoLogo} alt="Lingo" className="brand-logo" sizes="120px" />;
}
