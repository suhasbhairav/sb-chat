import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getEnterpriseIntegrationStatus } from "@/lib/auth-enterprise-integrations";
import { getAdminStatus, claimFirstOwner } from "@/lib/enterprise-admin";
import { json } from "@/lib/chat-request";
import { requireServerSession } from "@/lib/auth-session";
import { recordAuditEvent } from "@/lib/compliance-store";

async function callAuthApi(fn, options = {}) {
  try {
    return { data: await fn({ headers: await headers(), ...options }), error: null };
  } catch (error) {
    return { data: null, error: error.message || "Enterprise action failed." };
  }
}

async function getEnterpriseOverview(session) {
  const adminStatus = await getAdminStatus();
  const organizations = await callAuthApi(auth.api.listOrganizations);
  const activeOrganization = await callAuthApi(auth.api.getFullOrganization, {
    query: {},
  });
  const activeMember = await callAuthApi(auth.api.getActiveMember);
  const activeMemberRole = await callAuthApi(auth.api.getActiveMemberRole);
  const users = await callAuthApi(auth.api.listUsers, {
    query: {
      limit: 100,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });

  return {
    currentUser: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role || "user",
    },
    adminStatus,
    organizations: organizations.data || [],
    activeOrganization: activeOrganization.data,
    activeMember: activeMember.data,
    activeMemberRole: activeMemberRole.data?.role || activeMember.data?.role || null,
    users: users.data?.users || users.data || [],
    integrations: getEnterpriseIntegrationStatus(),
    usersError: users.error,
    organizationError: organizations.error,
    activeOrganizationError: activeOrganization.error,
  };
}

export async function GET() {
  const { session, response } = await requireServerSession();
  if (response) return response;

  return json(await getEnterpriseOverview(session));
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerSession();
    if (response) return response;
    const headerList = await headers();

    const body = await request.json();
    const action = body.action;
    let result;

    if (action === "claimFirstOwner") {
      result = await claimFirstOwner(session.user.id);
      if (!result.claimed) return json({ error: result.reason }, 409);
      await recordAuditEvent({
        category: "admin",
        action,
        outcome: "success",
        actor: { ...session.user, role: "owner" },
        target: { type: "user", id: session.user.id },
        ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
        userAgent: headerList.get("user-agent"),
      }).catch(() => {});
      return json({ result, overview: await getEnterpriseOverview({ ...session, user: { ...session.user, role: "owner" } }) });
    }

    if (action === "createOrganization") {
      result = await auth.api.createOrganization({
        headers: await headers(),
        body: {
          name: body.name,
          slug: body.slug,
          metadata: body.metadata || { platform: "batuk" },
        },
      });
    } else if (action === "createUser") {
      result = await auth.api.createUser({
        headers: await headers(),
        body: {
          email: body.email,
          name: body.name,
          password: body.password,
          role: body.role || "user",
          data: body.data || undefined,
        },
      });
    } else if (action === "updateUser") {
      result = await auth.api.adminUpdateUser({
        headers: await headers(),
        body: {
          userId: body.userId,
          data: {
            name: body.name,
            email: body.email,
            role: body.role,
          },
        },
      });
    } else if (action === "setUserPassword") {
      result = await auth.api.setUserPassword({
        headers: await headers(),
        body: {
          userId: body.userId,
          newPassword: body.password,
        },
      });
    } else if (action === "banUser") {
      result = await auth.api.banUser({
        headers: await headers(),
        body: {
          userId: body.userId,
          banReason: body.banReason || "Administrative action",
          banExpiresIn: body.banExpiresIn ? Number(body.banExpiresIn) : undefined,
        },
      });
    } else if (action === "unbanUser") {
      result = await auth.api.unbanUser({
        headers: await headers(),
        body: {
          userId: body.userId,
        },
      });
    } else if (action === "deleteUser") {
      result = await auth.api.removeUser({
        headers: await headers(),
        body: {
          userId: body.userId,
        },
      });
    } else if (action === "setActiveOrganization") {
      result = await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: body.organizationId,
        },
      });
    } else if (action === "createTeam") {
      result = await auth.api.createTeam({
        headers: await headers(),
        body: {
          name: body.name,
          organizationId: body.organizationId,
        },
      });
    } else if (action === "inviteMember") {
      result = await auth.api.createInvitation({
        headers: await headers(),
        body: {
          email: body.email,
          role: body.role || "member",
          organizationId: body.organizationId,
          teamId: body.teamId || undefined,
          resend: Boolean(body.resend),
        },
      });
    } else if (action === "updateMemberRole") {
      result = await auth.api.updateMemberRole({
        headers: await headers(),
        body: {
          memberId: body.memberId,
          role: body.role,
          organizationId: body.organizationId,
        },
      });
    } else if (action === "setUserRole") {
      result = await auth.api.setRole({
        headers: await headers(),
        body: {
          userId: body.userId,
          role: body.role,
        },
      });
    } else {
      return json({ error: "Unsupported enterprise action." }, 400);
    }

    await recordAuditEvent({
      category: "admin",
      action,
      outcome: "success",
      actor: session.user,
      target: {
        type: action.includes("Organization") ? "organization" : action.includes("Team") ? "team" : action.includes("Member") ? "member" : "user",
        id: body.organizationId || body.teamId || body.memberId || body.userId || result?.id || null,
      },
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
      metadata: { role: body.role, email: body.email, name: body.name },
    }).catch(() => {});

    return json({ result, overview: await getEnterpriseOverview(session) });
  } catch (error) {
    return json({ error: error.message || "Enterprise action failed." }, 500);
  }
}
