import type { CreditedPhoto } from "@/const";

export default function PhotoCredit({ photo, className }: { photo: CreditedPhoto; className?: string }) {
  return (
    <span className={className}>
      Photo:{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
        {photo.author}
      </a>
      ,{" "}
      <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
        {photo.license}
      </a>
      , via Wikimedia Commons
    </span>
  );
}
