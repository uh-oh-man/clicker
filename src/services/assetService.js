import { withAppBasePath } from "../constants/app.js";

export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#27272a"/>
          <stop offset="1" stop-color="#09090b"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="56" fill="url(#g)"/>
      <circle cx="128" cy="130" r="58" fill="#a3e635" opacity=".85"/>
      <path d="M118 65c30-32 64-16 68-10-28 4-45 17-54 37" fill="#22c55e"/>
      <text x="128" y="214" text-anchor="middle" font-family="Verdana" font-size="22" fill="#e4e4e7">Clicker</text>
    </svg>
  `);

export const resolveAsset = (source) => {
  if (!source) return FALLBACK_IMAGE;
  if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("data:")) return source;
  if (source.startsWith("/")) return withAppBasePath(source);
  return withAppBasePath(`assets/${source.replace(/^\.\//, "")}`);
};

export const handleImageFallback = (event) => {
  if (event.currentTarget.src !== FALLBACK_IMAGE) {
    event.currentTarget.src = FALLBACK_IMAGE;
  }
};