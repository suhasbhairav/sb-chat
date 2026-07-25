import Image from "next/image";

export function BrandMark({ initials = "SB", large = false, logoUrl = "" }) {
  return (
    <div className={`brand-mark ${large ? "large" : ""} ${logoUrl ? "has-logo" : ""}`}>
      {logoUrl ? <Image alt="" fill sizes={large ? "50px" : "28px"} src={logoUrl} /> : initials || "SB"}
    </div>
  );
}
