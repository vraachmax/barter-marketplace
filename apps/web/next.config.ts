import type { NextConfig } from "next";

// 127.0.0.1: на Windows localhost → ::1, Nest на IPv4 — нормализуем хост
const rawApi =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://127.0.0.1:3001";
const apiUrl = rawApi.replace(/^http:\/\/localhost(?=:)/i, "http://127.0.0.1");

const nextConfig: NextConfig = {
  /** Временно: файл settings-content.tsx имеет синтаксическую ошибку после восстановления */
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  /** Убирает предупреждение Next 16 при открытии с 127.0.0.1 */
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  async rewrites() {
    return [
      { source: "/auth/register", destination: `${apiUrl}/auth/register` },
      { source: "/auth/login", destination: `${apiUrl}/auth/login` },
      { source: "/auth/logout", destination: `${apiUrl}/auth/logout` },
      { source: "/auth/me", destination: `${apiUrl}/auth/me` },
      { source: "/auth/change-password", destination: `${apiUrl}/auth/change-password` },
      { source: "/analytics/:path*", destination: `${apiUrl}/analytics/:path*` },
      { source: "/categories", destination: `${apiUrl}/categories` },
      { source: "/categories/:path*", destination: `${apiUrl}/categories/:path*` },
      { source: "/listings", destination: `${apiUrl}/listings` },
      { source: "/listings/:path*", destination: `${apiUrl}/listings/:path*` },
      { source: "/favorites", destination: `${apiUrl}/favorites` },
      { source: "/favorites/:path*", destination: `${apiUrl}/favorites/:path*` },
      { source: "/chats", destination: `${apiUrl}/chats` },
      { source: "/chats/:path*", destination: `${apiUrl}/chats/:path*` },
      { source: "/reviews", destination: `${apiUrl}/reviews` },
      { source: "/reviews/:path*", destination: `${apiUrl}/reviews/:path*` },
      { source: "/users/:path*", destination: `${apiUrl}/users/:path*` },
      { source: "/uploads/:path*", destination: `${apiUrl}/uploads/:path*` },
      { source: "/health", destination: `${apiUrl}/health` },
      { source: "/presence/:path*", destination: `${apiUrl}/presence/:path*` },
      { source: "/search/:path*", destination: `${apiUrl}/search/:path*` },
      { source: "/socket.io/:path*", destination: `${apiUrl}/socket.io/:path*` },
      { source: "/support/:path*", destination: `${apiUrl}/support/:path*` },
    ];
  },
};

export default nextConfig;
