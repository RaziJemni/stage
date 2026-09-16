import html


def render_invitation_email(
    recipient_name: str,
    company_name: str,
    inviter_name: str,
    invitation_url: str,
    language: str = "fr",
) -> tuple[str, str, str]:
    """Renders bilingual (French/English) invitation email.

    Returns:
        tuple of (subject, html_body, text_body)
    """
    lang = language.lower() if language else "fr"
    if lang not in {"fr", "en"}:
        lang = "fr"

    safe_recipient = html.escape(recipient_name)
    safe_company = html.escape(company_name)
    safe_inviter = html.escape(inviter_name)
    safe_url = html.escape(invitation_url, quote=True)

    if lang == "fr":
        subject = f"Invitation à rejoindre {company_name} sur Vayca"
        headline = "Bienvenue sur Vayca"
        greeting = f"Bonjour {safe_recipient},"
        intro = (
            f"<strong>{safe_inviter}</strong> vous a invité(e) à rejoindre l'équipe de "
            f"<strong>{safe_company}</strong> sur Vayca, la plateforme de gestion opérationnelle "
            f"des résidences et locations saisonnières."
        )
        instructions = "Pour finaliser votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :"
        button_text = "Accepter l'invitation"
        expiry_notice = "Ce lien d'invitation sécurisé expire dans 72 heures."
        fallback_notice = "Si le bouton ne fonctionne pas, copiez et collez l'adresse suivante dans votre navigateur :"
        security_warning = "Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message en toute sécurité."
        footer_text = "© Vayca — Gestion Opérationnelle Immobilière. Tous droits réservés."

        text_body = f"""Bonjour {recipient_name},

{inviter_name} vous a invité(e) à rejoindre l'équipe de {company_name} sur Vayca.

Pour finaliser la création de votre compte et définir votre mot de passe, ouvrez le lien suivant dans votre navigateur :
{invitation_url}

Ce lien est sécurisé et expire dans 72 heures.

Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message.

--
Vayca — Opérations Immobilières
"""
    else:
        subject = f"Invitation to join {company_name} on Vayca"
        headline = "Welcome to Vayca"
        greeting = f"Hello {safe_recipient},"
        intro = (
            f"<strong>{safe_inviter}</strong> has invited you to join the "
            f"<strong>{safe_company}</strong> team on Vayca, the operational management platform "
            f"for vacation rentals and properties."
        )
        instructions = "To activate your account and set your password, please click the button below:"
        button_text = "Accept Invitation"
        expiry_notice = "This secure invitation link expires in 72 hours."
        fallback_notice = "If the button above does not work, copy and paste this URL into your browser:"
        security_warning = "If you were not expecting this invitation, you can safely ignore this email."
        footer_text = "© Vayca — Vacation Property Operations. All rights reserved."

        text_body = f"""Hello {recipient_name},

{inviter_name} has invited you to join the {company_name} team on Vayca.

To activate your account and set your password, open the following link in your browser:
{invitation_url}

This secure link expires in 72 hours.

If you were not expecting this invitation, you can safely ignore this email.

--
Vayca — Vacation Property Operations
"""

    html_body = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1B18; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EBE6DD; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 61, 94, 0.05);">
          <!-- Header with Sidi Bou Said Deep Blue -->
          <tr>
            <td style="background-color: #0F3D5E; padding: 28px 32px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">Vayca</span>
                    <span style="display: inline-block; width: 8px; height: 8px; background-color: #E8A838; border-radius: 50%; margin-left: 4px;"></span>
                  </td>
                  <td align="right" style="font-size: 12px; color: #B6DAEA; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                    {html.escape(headline)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0F3D5E;">
                {greeting}
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #3B3735;">
                {intro}
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; color: #78716C;">
                {instructions}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center" style="background-color: #0F3D5E; border-radius: 12px;">
                    <a href="{safe_url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px;">
                      {button_text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F6FA; border: 1px solid #B6DAEA; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 12px; color: #0F3D5E; line-height: 1.5;">
                    &#9432; <strong>{expiry_notice}</strong>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #78716C;">
                {fallback_notice}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; word-break: break-all; color: #0F3D5E;">
                <a href="{safe_url}" style="color: #0F3D5E; text-decoration: underline;">{safe_url}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #EBE6DD; margin: 24px 0;" />

              <p style="margin: 0; font-size: 11px; color: #A8A29E; line-height: 1.4;">
                {security_warning}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 20px 32px; border-top: 1px solid #EBE6DD; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #78716C;">
                {footer_text}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, html_body, text_body


def render_owner_statement_email(
    recipient_name: str,
    company_name: str,
    year: int,
    month: int,
    currency: str,
    gross_revenue: float | str,
    commission_amount: float | str,
    maintenance_expenses: float | str,
    net_payout: float | str,
    portal_url: str,
    language: str = "fr",
) -> tuple[str, str, str]:
    """Renders bilingual (French/English) owner monthly payout statement notification email.

    Returns:
        tuple of (subject, html_body, text_body)
    """
    lang = language.lower() if language else "fr"
    if lang not in {"fr", "en"}:
        lang = "fr"

    safe_recipient = html.escape(recipient_name)
    safe_company = html.escape(company_name)
    safe_url = html.escape(portal_url, quote=True)

    french_months = [
        "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ]
    english_months = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    month_name = (
        french_months[month] if lang == "fr" and 1 <= month <= 12
        else (english_months[month] if 1 <= month <= 12 else str(month))
    )
    period_label = f"{month_name} {year}"

    gross_str = f"{gross_revenue} {currency}"
    comm_str = f"-{commission_amount} {currency}"
    maint_str = f"-{maintenance_expenses} {currency}"
    net_str = f"{net_payout} {currency}"

    if lang == "fr":
        subject = f"Relevé de gestion {period_label} — {company_name}"
        headline = "Relevé Propriétaire"
        greeting = f"Bonjour {safe_recipient},"
        intro = (
            f"Votre relevé mensuel de gestion locative pour <strong>{period_label}</strong> "
            f"est disponible pour vos biens administrés par <strong>{safe_company}</strong>."
        )
        gross_label = "Revenus Bruts Locatifs"
        comm_label = "Commission de Gestion"
        maint_label = "Frais de Maintenance"
        net_label = "Net à Vous Verser"
        instructions = "Pour consulter le détail complet de vos réservations, interventions et télécharger le document PDF ou CSV, cliquez ci-dessous :"
        button_text = "Consulter mon Relevé Détaillé"
        notice = "Ce lien sécurisé permet d'accéder directement à votre relevé sans mot de passe."
        fallback_notice = "Si le bouton ne fonctionne pas, copiez ce lien :"
        footer_text = "© Vayca — Gestion Opérationnelle Immobilière. Document certifié."

        text_body = f"""Bonjour {recipient_name},

Votre relevé de gestion locative pour {period_label} ({company_name}) est disponible :

- Revenus bruts : {gross_str}
- Commission de gestion : {comm_str}
- Maintenance déductible : {maint_str}
----------------------------------------
Net à vous verser : {net_str}

Consultez et téléchargez votre relevé complet via ce lien sécurisé :
{portal_url}

--
{company_name} via Vayca
"""
    else:
        subject = f"Monthly Statement {period_label} — {company_name}"
        headline = "Owner Statement"
        greeting = f"Hello {safe_recipient},"
        intro = (
            f"Your monthly property management statement for <strong>{period_label}</strong> "
            f"is now available for your properties managed by <strong>{safe_company}</strong>."
        )
        gross_label = "Gross Rental Revenue"
        comm_label = "Management Commission"
        maint_label = "Maintenance Deductions"
        net_label = "Net Payout Due"
        instructions = "To view the complete itemized breakdown of bookings, maintenance expenses, and download your statement, click below:"
        button_text = "View Detailed Statement"
        notice = "This secure link provides direct confidential access to your monthly statement."
        fallback_notice = "If the button above does not work, copy this link:"
        footer_text = "© Vayca — Vacation Property Operations. Certified statement."

        text_body = f"""Hello {recipient_name},

Your monthly management statement for {period_label} ({company_name}) is now available:

- Gross rental revenue: {gross_str}
- Management commission: {comm_str}
- Maintenance deductions: {maint_str}
----------------------------------------
Net payout: {net_str}

View and download your complete statement via this secure link:
{portal_url}

--
{company_name} via Vayca
"""

    html_body = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1B18; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EBE6DD; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 61, 94, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0F3D5E; padding: 28px 32px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">Vayca</span>
                    <span style="display: inline-block; width: 8px; height: 8px; background-color: #E8A838; border-radius: 50%; margin-left: 4px;"></span>
                  </td>
                  <td align="right" style="font-size: 12px; color: #B6DAEA; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                    {html.escape(headline)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0F3D5E;">
                {greeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #3B3735;">
                {intro}
              </p>

              <!-- KPI Card Breakdown -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">
                    {gross_label}
                  </td>
                  <td align="right" style="padding: 14px 20px; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: 700; font-family: monospace; color: #0F172A;">
                    {gross_str}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">
                    {comm_label}
                  </td>
                  <td align="right" style="padding: 14px 20px; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: 700; font-family: monospace; color: #DC2626;">
                    {comm_str}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">
                    {maint_label}
                  </td>
                  <td align="right" style="padding: 14px 20px; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: 700; font-family: monospace; color: #DC2626;">
                    {maint_str}
                  </td>
                </tr>
                <tr style="background-color: #ECFDF5;">
                  <td style="padding: 16px 20px; font-size: 14px; font-weight: 700; color: #065F46;">
                    {net_label}
                  </td>
                  <td align="right" style="padding: 16px 20px; font-size: 18px; font-weight: 800; font-family: monospace; color: #059669;">
                    {net_str}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 14px; color: #78716C;">
                {instructions}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #0F3D5E; border-radius: 12px;">
                    <a href="{safe_url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px;">
                      {button_text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0F6FA; border: 1px solid #B6DAEA; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #0F3D5E; line-height: 1.5;">
                    &#9432; {notice}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #78716C;">
                {fallback_notice}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; word-break: break-all; color: #0F3D5E;">
                <a href="{safe_url}" style="color: #0F3D5E; text-decoration: underline;">{safe_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 20px 32px; border-top: 1px solid #EBE6DD; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #78716C;">
                {footer_text}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, html_body, text_body

