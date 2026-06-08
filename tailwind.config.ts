import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        b2buy: {
          primary: "#FF5A1F",     // B2BUY 메인 오렌지
          primaryDark: "#E04A12",
          accent: "#00C896",      // 절감액 강조 녹색
          accentDark: "#00A87A",
          ink: "#1F2937",
          muted: "#6B7280",
          line: "#E5E7EB",
          bg: "#FAFAFA"
        }
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"]
      },
      keyframes: {
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" }
        }
      },
      animation: {
        progress: "progress 0.8s ease-out forwards",
        pulseSoft: "pulseSoft 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
