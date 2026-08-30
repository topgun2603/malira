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
          <rect x="5.1" y="7.1" width="21.8" height="1.6" rx="0.8" fill="#DD872B" />
          <rect x="5.1" y="23.3" width="21.8" height="1.6" rx="0.8" fill="#FAF8F2" />
          <g
            fill="none"
            stroke="#FAF8F2"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.6 21V11h3.6a2.3 2.3 0 0 1 0 4.6H8.6m2.7 0L15.2 21" />
            <path d="M18 11v10M24 11l-5.8 5.3M20.2 14.4 24.4 21" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
