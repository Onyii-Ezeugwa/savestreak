import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#167C80",
          borderRadius: 48,
          color: "#FFFDF8",
          fontSize: 108,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        $
      </div>
    ),
    size,
  );
}
