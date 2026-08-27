import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon for iOS, which will not take an SVG.
 *
 * Generated at build time rather than checked in as a binary, so the one place
 * the brand blue is written stays the one place it is written.
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
          background: "#145892",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 24 24" fill="#ffffff">
          <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
        </svg>
      </div>
    ),
    size,
  );
}
