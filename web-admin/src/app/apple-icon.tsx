import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon for iOS, which will not take an SVG.
 *
 * Generated at build time rather than checked in as a binary, so the one place
 * the brand rose is written stays the one place it is written. Same nameplate
 * as `icon.svg` and as the Flutter launcher icon, scaled from 32 to 180.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #5E1E3B 0%, #9C3464 100%)",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <rect x="6.4" y="7.1" width="19.2" height="1.6" rx="0.8" fill="#DD872B" />
          <rect x="6.4" y="23.3" width="19.2" height="1.6" rx="0.8" fill="#FAF8F2" />
          <path
            d="M10.5 21.5V10.5L16 17.5 21.5 10.5V21.5"
            fill="none"
            stroke="#FAF8F2"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
