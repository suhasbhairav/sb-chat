import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { json } from "@/lib/chat-request";
import { requireServerPermission, requireServerSession } from "@/lib/auth-session";
import { getOrganizationBranding, removeOrganizationLogo, saveOrganizationBranding, saveOrganizationLogo } from "@/lib/branding-store";
import { recordAuditEvent } from "@/lib/compliance-store";

export const runtime = "nodejs";

async function activeOrganizationContext() {
  try {
    const organization = await auth.api.getFullOrganization({
      headers: await headers(),
      query: {},
    });
    return {
      organizationId: organization?.id || "global",
      organizationName: organization?.name || "Batuk",
    };
  } catch {
    return {
      organizationId: "global",
      organizationName: "Batuk",
    };
  }
}

export async function GET() {
  const { response } = await requireServerSession();
  if (response) return response;

  const organization = await activeOrganizationContext();
  const branding = await getOrganizationBranding(organization);
  return json({
    ...organization,
    branding,
    footerLocked: "Batuk, created by Suhas Bhairav",
  });
}

export async function PATCH(request) {
  try {
    const { session, response } = await requireServerPermission({ organization: ["update"] });
    if (response) return response;

    const payload = await request.json();
    const organization = await activeOrganizationContext();
    const branding = await saveOrganizationBranding({
      ...organization,
      branding: payload,
    });
    const headerList = await headers();
    await recordAuditEvent({
      category: "admin",
      action: "branding.update",
      outcome: "success",
      actor: session.user,
      target: { type: "organization", id: organization.organizationId },
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
      metadata: {
        enabled: branding.enabled,
        productName: branding.productName,
        accentColor: branding.accentColor,
        footerLocked: true,
      },
    }).catch(() => {});

    return json({
      ...organization,
      branding,
      footerLocked: "Batuk, created by Suhas Bhairav",
    });
  } catch (error) {
    return json({ error: error.message || "Could not save branding." }, 400);
  }
}

export async function POST(request) {
  try {
    const { session, response } = await requireServerPermission({ organization: ["update"] });
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get("logo");
    const organization = await activeOrganizationContext();
    const branding = await saveOrganizationLogo({
      ...organization,
      file,
    });
    const headerList = await headers();
    await recordAuditEvent({
      category: "admin",
      action: "branding.logo.upload",
      outcome: "success",
      actor: session.user,
      target: { type: "organization", id: organization.organizationId },
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
      metadata: {
        logoName: branding.logoName,
        logoUrl: branding.logoUrl,
        footerLocked: true,
      },
    }).catch(() => {});

    return json({
      ...organization,
      branding,
      footerLocked: "Batuk, created by Suhas Bhairav",
    });
  } catch (error) {
    return json({ error: error.message || "Could not upload logo." }, 400);
  }
}

export async function DELETE() {
  try {
    const { session, response } = await requireServerPermission({ organization: ["update"] });
    if (response) return response;

    const organization = await activeOrganizationContext();
    const branding = await removeOrganizationLogo(organization);
    const headerList = await headers();
    await recordAuditEvent({
      category: "admin",
      action: "branding.logo.remove",
      outcome: "success",
      actor: session.user,
      target: { type: "organization", id: organization.organizationId },
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip"),
      userAgent: headerList.get("user-agent"),
      metadata: {
        footerLocked: true,
      },
    }).catch(() => {});

    return json({
      ...organization,
      branding,
      footerLocked: "Batuk, created by Suhas Bhairav",
    });
  } catch (error) {
    return json({ error: error.message || "Could not remove logo." }, 400);
  }
}
