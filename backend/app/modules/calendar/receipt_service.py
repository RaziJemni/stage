import html
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import BookingRecordType, BookingStatus, PaymentStatus
from app.modules.calendar.models import Booking
from app.modules.calendar.schemas import BookingReceiptDataResponse
from app.modules.identity.models import Company
from app.modules.properties.models import Property


def get_booking_receipt_data(
    db: Session, company_id: UUID, booking_id: UUID
) -> BookingReceiptDataResponse:
    """Fetch booking, property, and company details to construct a direct booking receipt."""
    booking_stmt = (
        select(Booking)
        .where(
            Booking.company_id == company_id,
            Booking.id == booking_id,
        )
    )
    booking = db.execute(booking_stmt).scalar_one_or_none()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="booking_not_found",
        )

    if booking.record_type == BookingRecordType.BLOCKED_PERIOD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="blocked_periods_have_no_receipt",
        )

    property_stmt = (
        select(Property)
        .where(
            Property.company_id == company_id,
            Property.id == booking.property_id,
        )
    )
    property_obj = db.execute(property_stmt).scalar_one_or_none()
    property_name = property_obj.name if property_obj else "Propriété Vayca"
    property_address = (
        f"{property_obj.address_line1 or ''} {property_obj.address_line2 or ''}".strip()
        if property_obj
        else None
    )
    property_city = property_obj.city if property_obj else None
    check_in_time = (
        property_obj.check_in_time.strftime("%H:%M")
        if property_obj and property_obj.check_in_time
        else "15:00"
    )
    check_out_time = (
        property_obj.check_out_time.strftime("%H:%M")
        if property_obj and property_obj.check_out_time
        else "11:00"
    )

    company_stmt = select(Company).where(Company.id == company_id)
    company_obj = db.execute(company_stmt).scalar_one_or_none()
    company_name = company_obj.name if company_obj else "Vayca Hospitality"
    currency = company_obj.default_currency if company_obj else "TND"

    # Compute stay nights
    delta_days = (booking.check_out.date() - booking.check_in.date()).days
    nights = max(1, delta_days)

    total_amount = booking.total_amount
    unit_nightly_rate = (
        round(total_amount / Decimal(nights), 3)
        if total_amount is not None and nights > 0
        else None
    )

    # Compute effective paid amount and outstanding balance
    if booking.payment_status == PaymentStatus.PAID_IN_FULL and total_amount is not None:
        effective_paid = total_amount
    else:
        effective_paid = booking.paid_amount or Decimal("0.000")

    outstanding_balance = (
        max(Decimal("0.000"), total_amount - effective_paid)
        if total_amount is not None
        else None
    )

    # Generate receipt/invoice number: VAY-YYYYMM-{ID_PREFIX}
    date_prefix = booking.check_in.strftime("%Y%m")
    id_short = str(booking.id)[:8].upper()
    invoice_number = f"VAY-{date_prefix}-{id_short}"

    return BookingReceiptDataResponse(
        invoice_number=invoice_number,
        issue_date=datetime.now(timezone.utc),
        booking_id=booking.id,
        property_id=booking.property_id,
        company_name=company_name,
        property_name=property_name,
        property_address=property_address or None,
        property_city=property_city,
        guest_name=booking.guest_name,
        guest_contact=booking.guest_contact,
        check_in=booking.check_in,
        check_out=booking.check_out,
        check_in_time=check_in_time,
        check_out_time=check_out_time,
        nights=nights,
        currency=currency,
        unit_nightly_rate=unit_nightly_rate,
        total_amount=total_amount,
        paid_amount=effective_paid,
        outstanding_balance=outstanding_balance,
        payment_status=booking.payment_status,
        payment_method=booking.payment_method,
        status=booking.status,
        source_type=booking.source_type,
        notes=booking.notes,
    )


def render_booking_receipt_html(
    receipt: BookingReceiptDataResponse, locale: str = "fr"
) -> str:
    """Render a standalone, beautifully styled printable HTML voucher adhering to Sidi Bou Said palette."""
    is_fr = locale.lower().startswith("fr")

    # Translations dictionary
    t = {
        "doc_title": "REÇU DE RÉSERVATION & FACTURE" if is_fr else "BOOKING RECEIPT & INVOICE",
        "voucher_badge": "VOUCHER CONFIRMÉ" if is_fr else "CONFIRMED VOUCHER",
        "invoice_num": "Réf. Pièce" if is_fr else "Voucher Ref.",
        "issue_date": "Date d'émission" if is_fr else "Issue Date",
        "agency": "Établissement émetteur" if is_fr else "Issuing Agency",
        "guest": "Voyageur / Client" if is_fr else "Guest / Client",
        "guest_contact": "Contact" if is_fr else "Contact",
        "property": "Propriété réservée" if is_fr else "Reserved Property",
        "address": "Adresse" if is_fr else "Address",
        "check_in": "Arrivée (Check-in)" if is_fr else "Check-in",
        "check_out": "Départ (Check-out)" if is_fr else "Check-out",
        "duration": "Durée du séjour" if is_fr else "Duration of stay",
        "nights": "nuits" if is_fr else "nights",
        "night": "nuit" if is_fr else "night",
        "description": "Désignation des prestations" if is_fr else "Item Description",
        "unit_price": "Prix unitaire" if is_fr else "Unit Price",
        "qty": "Qté" if is_fr else "Qty",
        "total": "Total",
        "accommodation_item": "Séjour d'hébergement" if is_fr else "Accommodation Stay",
        "total_amount": "Montant Total" if is_fr else "Total Amount",
        "paid_amount": "Montant Réglé" if is_fr else "Amount Paid",
        "outstanding": "Solde Restant Dû" if is_fr else "Balance Due",
        "payment_status": "Statut du règlement" if is_fr else "Payment Status",
        "payment_method": "Mode de règlement" if is_fr else "Payment Method",
        "payment_unpaid": "Non payé" if is_fr else "Unpaid",
        "payment_deposit": "Acompte versé" if is_fr else "Deposit Received",
        "payment_paid": "Payé en totalité" if is_fr else "Paid in Full",
        "status_confirmed": "Confirmée" if is_fr else "Confirmed",
        "status_tentative": "Optionnelle / En attente" if is_fr else "Tentative",
        "status_cancelled": "ANNULÉE" if is_fr else "CANCELLED",
        "method_cash": "Espèces" if is_fr else "Cash",
        "method_bank_transfer": "Virement bancaire" if is_fr else "Bank Transfer",
        "method_card": "Carte bancaire" if is_fr else "Credit/Debit Card",
        "method_check": "Chèque" if is_fr else "Check",
        "method_other": "Autre moyen" if is_fr else "Other",
        "notes": "Instructions & Remarques" if is_fr else "Instructions & Remarks",
        "stamp_signature": "Cachet & Signature de l'agence" if is_fr else "Agency Stamp & Signature",
        "legal_notice": (
            "Ce reçu certifie la réservation directe et le règlement mentionné. Document non cessible."
            if is_fr
            else "This receipt confirms the direct booking and payment indicated above. Non-transferable."
        ),
        "print_btn": "Imprimer / Enregistrer en PDF" if is_fr else "Print / Save as PDF",
        "close_btn": "Fermer" if is_fr else "Close",
    }

    # Format helpers
    def fmt_date(dt: datetime) -> str:
        return dt.strftime("%d/%m/%Y")

    def fmt_money(val: Decimal | None) -> str:
        if val is None:
            return f"— {receipt.currency}"
        return f"{val:.3f} {receipt.currency}"

    # Payment status labels and colors
    ps_val = receipt.payment_status.value if receipt.payment_status else "unpaid"
    if ps_val == "paid_in_full":
        ps_label = t["payment_paid"]
        ps_color = "#059669"
        ps_bg = "#ECFDF5"
        ps_border = "#A7F3D0"
    elif ps_val == "deposit_received":
        ps_label = t["payment_deposit"]
        ps_color = "#0F3D5E"
        ps_bg = "#F0F6FA"
        ps_border = "#B6DAEA"
    else:
        ps_label = t["payment_unpaid"]
        ps_color = "#D97706"
        ps_bg = "#FFFBEB"
        ps_border = "#FDE68A"

    # Status labels
    is_cancelled = receipt.status == BookingStatus.CANCELLED
    if is_cancelled:
        st_label = t["status_cancelled"]
        st_color = "#DC2626"
        st_bg = "#FEF2F2"
    elif receipt.status == BookingStatus.CONFIRMED:
        st_label = t["status_confirmed"]
        st_color = "#059669"
        st_bg = "#ECFDF5"
    else:
        st_label = t["status_tentative"]
        st_color = "#D97706"
        st_bg = "#FFFBEB"

    # Payment method translation
    pm_map = {
        "cash": t["method_cash"],
        "bank_transfer": t["method_bank_transfer"],
        "card": t["method_card"],
        "check": t["method_check"],
        "other": t["method_other"],
    }
    method_display = (
        pm_map.get(receipt.payment_method, receipt.payment_method)
        if receipt.payment_method
        else "—"
    )

    guest_name_esc = html.escape(receipt.guest_name or ("Client Inconnu" if is_fr else "Unnamed Guest"))
    guest_contact_esc = html.escape(receipt.guest_contact or "—")
    property_name_esc = html.escape(receipt.property_name)
    property_city_esc = html.escape(receipt.property_city or "Tunisie")
    property_address_esc = html.escape(receipt.property_address or "")
    company_name_esc = html.escape(receipt.company_name)
    notes_esc = html.escape(receipt.notes or "")

    watermark_html = (
        """<div class="watermark">ANNULÉE / CANCELLED</div>"""
        if is_cancelled
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="{locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{t["doc_title"]} - {receipt.invoice_number}</title>
  <style>
    @page {{
      size: A4 portrait;
      margin: 15mm 18mm;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1C1B18;
      background-color: #FAF8F5;
      font-size: 13px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }}
    .no-print-bar {{
      position: sticky;
      top: 0;
      z-index: 100;
      background-color: #0F3D5E;
      color: #FFFFFF;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }}
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: opacity 0.2s;
    }}
    .btn-print {{
      background-color: #E8A838;
      color: #1C1B18;
    }}
    .btn-close {{
      background-color: rgba(255,255,255,0.15);
      color: #FFFFFF;
    }}
    .btn:hover {{
      opacity: 0.9;
    }}
    .receipt-wrapper {{
      max-width: 800px;
      margin: 24px auto;
      background: #FFFFFF;
      padding: 40px 48px;
      border-radius: 12px;
      border: 1px solid #EBE6DD;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      position: relative;
      overflow: hidden;
    }}
    .watermark {{
      position: absolute;
      top: 40%;
      left: 10%;
      right: 10%;
      text-align: center;
      font-size: 54px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.12);
      transform: rotate(-25deg);
      pointer-events: none;
      z-index: 1;
      letter-spacing: 4px;
      border: 6px dashed rgba(220, 38, 38, 0.12);
      padding: 20px;
      border-radius: 16px;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #FAF8F5;
      padding-bottom: 24px;
    }}
    .brand {{
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}
    .brand-logo {{
      font-size: 24px;
      font-weight: 800;
      color: #0F3D5E;
      letter-spacing: -0.5px;
    }}
    .brand-tagline {{
      font-size: 11px;
      color: #D96B43;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }}
    .company-sub {{
      font-size: 12px;
      color: #78716C;
      margin-top: 2px;
    }}
    .doc-meta {{
      text-align: right;
    }}
    .doc-badge {{
      display: inline-block;
      padding: 4px 10px;
      background-color: #F0F6FA;
      color: #0F3D5E;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }}
    .doc-num {{
      font-size: 18px;
      font-weight: 800;
      color: #1C1B18;
      font-family: monospace;
    }}
    .doc-date {{
      font-size: 11px;
      color: #78716C;
      margin-top: 2px;
    }}
    .info-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
      padding: 20px;
      background-color: #FAF8F5;
      border: 1px solid #EBE6DD;
      border-radius: 10px;
    }}
    .info-block h3 {{
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #78716C;
      margin-bottom: 6px;
    }}
    .info-block p {{
      font-size: 13px;
      font-weight: 600;
      color: #1C1B18;
    }}
    .info-block .sub {{
      font-size: 12px;
      font-weight: normal;
      color: #57534E;
    }}
    .stay-card {{
      margin-top: 24px;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #B6DAEA;
      background: #F0F6FA;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
      align-items: center;
    }}
    .stay-label {{
      font-size: 11px;
      font-weight: 600;
      color: #0F3D5E;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .stay-val {{
      font-size: 14px;
      font-weight: 700;
      color: #1C1B18;
      margin-top: 2px;
    }}
    .stay-sub {{
      font-size: 11px;
      color: #78716C;
    }}
    .table-section {{
      margin-top: 24px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }}
    th {{
      background-color: #FAF8F5;
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #78716C;
      border-bottom: 1px solid #EBE6DD;
    }}
    td {{
      padding: 14px;
      border-bottom: 1px solid #EBE6DD;
      font-size: 13px;
    }}
    .col-right {{
      text-align: right;
    }}
    .totals-area {{
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }}
    .totals-table {{
      width: 320px;
    }}
    .totals-row {{
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #57534E;
    }}
    .totals-row.grand {{
      border-top: 2px solid #0F3D5E;
      margin-top: 6px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 800;
      color: #0F3D5E;
    }}
    .totals-row.balance {{
      border-top: 1px dashed #EBE6DD;
      padding-top: 8px;
      font-weight: 700;
      color: #D96B43;
    }}
    .badge-pill {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid transparent;
    }}
    .notes-box {{
      margin-top: 24px;
      padding: 14px;
      background: #FAF8F5;
      border-left: 4px solid #D96B43;
      border-radius: 4px;
      font-size: 12px;
      color: #3B3735;
    }}
    .footer {{
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid #EBE6DD;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }}
    .legal {{
      font-size: 11px;
      color: #78716C;
      max-width: 420px;
    }}
    .stamp-box {{
      width: 220px;
      height: 100px;
      border: 1px dashed #B6DAEA;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 10px;
      color: #78716C;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px;
      background-color: #FAF8F5;
    }}
    @media print {{
      body {{
        background-color: #FFFFFF;
      }}
      .no-print-bar {{
        display: none !important;
      }}
      .receipt-wrapper {{
        border: none;
        box-shadow: none;
        margin: 0;
        padding: 0;
        max-width: 100%;
      }}
    }}
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: 700; font-size: 14px;">
      {company_name_esc} &bull; {t["doc_title"]}
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-print" onclick="window.print()">&#128438; {t["print_btn"]}</button>
      <button class="btn btn-close" onclick="window.close()">{t["close_btn"]}</button>
    </div>
  </div>

  <div class="receipt-wrapper">
    {watermark_html}

    <header class="header">
      <div class="brand">
        <div class="brand-logo">VAYCA</div>
        <div class="brand-tagline">Sidi Bou Said Hospitality</div>
        <div class="company-sub">{company_name_esc}</div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">{t["voucher_badge"]}</div>
        <div class="doc-num">{receipt.invoice_number}</div>
        <div class="doc-date">{t["issue_date"]}: {fmt_date(receipt.issue_date)}</div>
      </div>
    </header>

    <div class="info-grid">
      <div class="info-block">
        <h3>{t["guest"]}</h3>
        <p>{guest_name_esc}</p>
        <div class="sub">{t["guest_contact"]}: {guest_contact_esc}</div>
      </div>
      <div class="info-block">
        <h3>{t["property"]}</h3>
        <p>{property_name_esc}</p>
        <div class="sub">{property_city_esc}{f", {property_address_esc}" if property_address_esc else ""}</div>
      </div>
    </div>

    <div class="stay-card">
      <div>
        <div class="stay-label">{t["check_in"]}</div>
        <div class="stay-val">{fmt_date(receipt.check_in)}</div>
        <div class="stay-sub">{receipt.check_in_time or "15:00"}</div>
      </div>
      <div>
        <div class="stay-label">{t["check_out"]}</div>
        <div class="stay-val">{fmt_date(receipt.check_out)}</div>
        <div class="stay-sub">{receipt.check_out_time or "11:00"}</div>
      </div>
      <div>
        <div class="stay-label">{t["duration"]}</div>
        <div class="stay-val">{receipt.nights} {t["nights"] if receipt.nights > 1 else t["night"]}</div>
        <div class="stay-sub">
          <span class="badge-pill" style="background-color: {st_bg}; color: {st_color};">
            {st_label}
          </span>
        </div>
      </div>
    </div>

    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th>{t["description"]}</th>
            <th class="col-right">{t["qty"]}</th>
            <th class="col-right">{t["unit_price"]}</th>
            <th class="col-right">{t["total"]}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>{t["accommodation_item"]}</strong><br>
              <span style="font-size: 11px; color: #78716C;">{property_name_esc} ({fmt_date(receipt.check_in)} &rarr; {fmt_date(receipt.check_out)})</span>
            </td>
            <td class="col-right">{receipt.nights} {t["nights"] if receipt.nights > 1 else t["night"]}</td>
            <td class="col-right">{fmt_money(receipt.unit_nightly_rate)}</td>
            <td class="col-right" style="font-weight: 700;">{fmt_money(receipt.total_amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-area">
      <div class="totals-table">
        <div class="totals-row">
          <span>{t["payment_status"]}:</span>
          <span class="badge-pill" style="background-color: {ps_bg}; color: {ps_color}; border-color: {ps_border};">
            {ps_label}
          </span>
        </div>
        <div class="totals-row">
          <span>{t["payment_method"]}:</span>
          <span style="font-weight: 600; color: #1C1B18;">{method_display}</span>
        </div>
        <div class="totals-row grand">
          <span>{t["total_amount"]}:</span>
          <span>{fmt_money(receipt.total_amount)}</span>
        </div>
        <div class="totals-row" style="font-weight: 600;">
          <span>{t["paid_amount"]}:</span>
          <span style="color: #059669;">{fmt_money(receipt.paid_amount)}</span>
        </div>
        <div class="totals-row balance">
          <span>{t["outstanding"]}:</span>
          <span>{fmt_money(receipt.outstanding_balance)}</span>
        </div>
      </div>
    </div>

    {f'<div class="notes-box"><strong>{t["notes"]}:</strong> {notes_esc}</div>' if notes_esc else ''}

    <footer class="footer">
      <div class="legal">
        <p>{t["legal_notice"]}</p>
        <p style="margin-top: 4px; font-size: 10px; color: #A8A29E;">
          Vayca Operations Platform &bull; Sidi Bou Said, Tunis &bull; {receipt.invoice_number}
        </p>
      </div>
      <div class="stamp-box">
        {t["stamp_signature"]}
      </div>
    </footer>
  </div>
</body>
</html>
"""
