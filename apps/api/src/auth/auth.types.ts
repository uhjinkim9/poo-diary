export type AuthPrincipal =
  | { kind: "mercury"; mercuryUserId: string }
  | { kind: "legacy"; legacyDeviceUserId: string };

declare module "fastify" {
  interface FastifyRequest {
    authPrincipal?: AuthPrincipal;
  }
}
