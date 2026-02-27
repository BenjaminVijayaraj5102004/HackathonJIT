/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#070A12",
        panel: "#0F172A",
        panelSoft: "#111C34",
        accent: "#2DD4BF",
        warning: "#F97316",
        danger: "#F43F5E"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45, 212, 191, 0.3), 0 10px 30px rgba(45, 212, 191, 0.08)"
      }
    }
  },
  plugins: []
};
