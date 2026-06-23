export function signingLinkEmail(params: {
  orgName: string
  documentName: string
  signerName: string
  signingLink: string
  senderName?: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 32px 16px;text-align:center;background-color:#10B99A;">
          <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700;">${params.orgName}</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <p style="font-size:14px;color:#374151;margin:0 0 8px;">Hi ${params.signerName},</p>
          <p style="font-size:14px;color:#374151;margin:0 0 16px;">
            ${params.senderName ? `<strong>${params.senderName}</strong> from ` : ''}
            <strong>${params.orgName}</strong> has sent you a document to review and sign:
          </p>
          <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="font-size:15px;font-weight:700;color:#111827;margin:0;">${params.documentName}</p>
          </div>
          <a href="${params.signingLink}" style="display:inline-block;background-color:#10B99A;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Review & Sign Document
          </a>
          <p style="font-size:12px;color:#6b7280;margin:20px 0 0;line-height:1.5;">
            This link is unique to you. Do not share it with others.
            If you did not expect this email, please disregard it.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">
            Higsi 245D Suite &middot; Secure Document Signing
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function alertNotificationEmail(params: {
  orgName: string
  title: string
  message: string
  linkText?: string
  linkUrl?: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;">
        <tr><td style="padding:24px;">
          <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${params.orgName}</p>
          <h2 style="font-size:16px;color:#111827;margin:0 0 8px;">${params.title}</h2>
          <p style="font-size:13px;color:#374151;margin:0 0 12px;line-height:1.5;">${params.message}</p>
          ${params.linkUrl && params.linkText ? `
            <a href="${params.linkUrl}" style="display:inline-block;background-color:#10B99A;color:#fff;font-size:12px;font-weight:600;padding:8px 20px;border-radius:6px;text-decoration:none;">${params.linkText}</a>
          ` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function inviteEmail(params: {
  orgName: string
  inviteLink: string
  role: string
  senderName: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;">
        <tr><td style="padding:32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 12px;">You have been invited to join <strong>${params.orgName}</strong> as <strong>${params.role}</strong>.</p>
          <p style="font-size:13px;color:#6b7280;margin:0 0 16px;">${params.senderName} has sent you an invitation to access the Higsi 245D Suite platform.</p>
          <a href="${params.inviteLink}" style="display:inline-block;background-color:#10B99A;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Accept Invitation</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
