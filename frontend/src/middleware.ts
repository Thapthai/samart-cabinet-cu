import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  if (pathname === basePath || pathname === `${basePath}/`) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return pathname;
}

function isAdminToken(
  token: { is_admin?: boolean; user?: { is_admin?: boolean; userType?: string } } | null | undefined,
): boolean {
  if (!token) return false;
  if (token.is_admin === true) return true;
  if (token.user?.is_admin === true) return true;
  if (token.user?.userType === "admin") return true;
  return false;
}

export default withAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const pathname = req.nextUrl.pathname;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const token = req.nextauth?.token;
    const path = stripBasePath(pathname, basePath);

    const admin = path === "/admin" || path.startsWith("/admin/");

    // Staff ห้ามเข้า /admin — ส่งไป staff dashboard (Admin เข้า /staff ได้ตามปกติ)
    if (admin && token && !isAdminToken(token)) {
      return NextResponse.redirect(new URL(`${basePath}/staff/dashboard`, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const path = stripBasePath(pathname, basePath);

        if (
          path.startsWith("/auth/") ||
          path === "/" ||
          path === "/403" ||
          path.startsWith("/403/")
        ) {
          return true;
        }

        const protectedPrefixes = [
          "/admin",
          "/staff",
          "/items",
          "/profile",
          "/categories",
        ];

        const needsAuth = protectedPrefixes.some(
          (p) => path === p || path.startsWith(`${p}/`),
        );

        return needsAuth ? !!token : true;
      },
    },
    pages: {
      signIn: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/auth/login`,
    },
  },
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
