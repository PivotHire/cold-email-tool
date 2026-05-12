import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    title: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      title: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    title: string;
  }
}
