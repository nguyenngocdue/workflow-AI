import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cleanDistDir: true,
  serverExternalPackages: ["pyodide"],
};

export default withNextIntl(nextConfig);
