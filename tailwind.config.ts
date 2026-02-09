// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Your existing theme customization...
    },
  },
  plugins: [
    require("tailwindcss-animate"), // If you use Shadcn/ui
    require("@tailwindcss/typography"), // 👈 Add this line!
  ],
};
export default config;
