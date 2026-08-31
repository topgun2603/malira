import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon for iOS.
 *
 * The same medallion as `icon.png` and the Flutter launcher icons, on the
 * ring's own blue so that whatever shape iOS masks it to only ever cuts blue.
 * Read from disk and inlined as a data URI because ImageResponse renders on
 * the server with no origin to fetch a relative path from.
 */
export default async function AppleIcon() {
  const logo = await readFile(join(process.cwd(), "public", "brand", "logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#001854",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
