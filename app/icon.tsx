import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 9,
          color: "#FFFDF8",
          fontSize: 20,
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
