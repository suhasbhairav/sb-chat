import { createAccessControl } from "better-auth/plugins";
import { defaultStatements as adminStatements } from "better-auth/plugins/admin/access";
import { defaultStatements as organizationStatements } from "better-auth/plugins/organization/access";

export const ENTERPRISE_ROLES = ["owner", "admin", "member", "viewer", "user"];

const appStatements = {
  ...adminStatements,
  ...organizationStatements,
  chat: ["create", "read", "update", "delete", "export"],
  document: ["create", "read", "update", "delete", "download"],
  agent: ["create", "read", "update", "delete", "run"],
  skill: ["create", "read", "update", "delete", "run"],
  memory: ["create", "read", "update", "delete"],
  usage: ["read", "reset"],
  model: ["read", "connect"],
};

export const enterpriseAc = createAccessControl(appStatements);

export const ownerRole = enterpriseAc.newRole({
  user: ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  chat: ["create", "read", "update", "delete", "export"],
  document: ["create", "read", "update", "delete", "download"],
  agent: ["create", "read", "update", "delete", "run"],
  skill: ["create", "read", "update", "delete", "run"],
  memory: ["create", "read", "update", "delete"],
  usage: ["read", "reset"],
  model: ["read", "connect"],
});

export const adminRole = enterpriseAc.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  chat: ["create", "read", "update", "delete", "export"],
  document: ["create", "read", "update", "delete", "download"],
  agent: ["create", "read", "update", "delete", "run"],
  skill: ["create", "read", "update", "delete", "run"],
  memory: ["create", "read", "update", "delete"],
  usage: ["read", "reset"],
  model: ["read", "connect"],
});

export const memberRole = enterpriseAc.newRole({
  user: [],
  session: [],
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  chat: ["create", "read", "update", "delete", "export"],
  document: ["create", "read", "update", "delete", "download"],
  agent: ["create", "read", "update", "delete", "run"],
  skill: ["read", "run"],
  memory: ["create", "read", "update", "delete"],
  usage: ["read"],
  model: ["read", "connect"],
});

export const viewerRole = enterpriseAc.newRole({
  user: [],
  session: [],
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  chat: ["read", "export"],
  document: ["read", "download"],
  agent: ["read"],
  skill: ["read"],
  memory: ["read"],
  usage: ["read"],
  model: ["read"],
});

export const userRole = enterpriseAc.newRole({
  user: [],
  session: [],
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
  chat: ["create", "read", "update", "delete", "export"],
  document: ["create", "read", "update", "delete", "download"],
  agent: ["create", "read", "update", "delete", "run"],
  skill: ["read", "run"],
  memory: ["create", "read", "update", "delete"],
  usage: ["read"],
  model: ["read", "connect"],
});

export const enterpriseRoles = {
  owner: ownerRole,
  admin: adminRole,
  member: memberRole,
  viewer: viewerRole,
  user: userRole,
};

export function normalizeRole(role) {
  return ENTERPRISE_ROLES.includes(role) ? role : "user";
}

export function roleAllows(role, permissions) {
  return String(role || "user")
    .split(",")
    .map((item) => normalizeRole(item.trim()))
    .some((item) => enterpriseRoles[item].authorize(permissions).success);
}
