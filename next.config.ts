import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * The CSP here deliberately does not restrict `script-src`/`style-src`. A
 * useful script policy needs a per-request nonce threaded through the proxy,
 * which is a separate piece of work; a half-configured one would either freeze
 * the framework's own inline bootstrap or be waved through with
 * `'unsafe-inline'`. The four directives below are still worth having: they
 * close clickjacking (`frame-ancestors`), `<base>` hijacking (`base-uri`),
 * form exfiltration to an attacker origin (`form-action`) and plugin embedding
 * (`object-src`), and none of them can break the app as written.
 */
const CSP = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  // Redundant with `frame-ancestors` for modern browsers, kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: it must stay outside the server bundle.
  serverExternalPackages: ["better-sqlite3"],

  async headers() {
    const production = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // Only sent in production: pinning HSTS against a local http:// dev
          // origin makes the browser refuse to talk to it again.
          ...(production
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
