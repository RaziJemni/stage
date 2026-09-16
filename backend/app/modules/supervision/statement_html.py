import html
from datetime import datetime, timezone
from decimal import Decimal

from app.modules.supervision.schemas import OwnerMonthlyStatementResponse

FRENCH_MONTHS = [
    "",
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
]


def render_owner_statement_html(
    statement: OwnerMonthlyStatementResponse,
    company_name: str = "Vayca Operations",
    generated_at: datetime | None = None,
) -> str:
    """Renders a branded, print-ready HTML monthly owner payout statement."""
    gen_time = generated_at or datetime.now(timezone.utc)
    date_str = gen_time.strftime("%d/%m/%Y %H:%M UTC")

    month_name = (
        FRENCH_MONTHS[statement.month]
        if 1 <= statement.month <= 12
        else f"Mois {statement.month}"
    )
    period_label = f"{month_name} {statement.year}"
    ref_code = f"STMT-{statement.year}{statement.month:02d}-{str(statement.owner_id)[:8].upper()}"

    # Format numbers
    gross_str = f"{statement.gross_revenue:.3f} {statement.currency}"
    comm_str = f"-{statement.commission_amount:.3f} {statement.currency}"
    maint_str = f"-{statement.maintenance_expenses:.3f} {statement.currency}"
    net_str = f"{statement.net_payout:.3f} {statement.currency}"

    # Build booking rows
    booking_rows_html = ""
    if not statement.bookings:
        booking_rows_html = """
        <tr>
            <td colspan="7" class="empty-cell">Aucune réservation terminée au cours de cette période.</td>
        </tr>
        """
    else:
        for b in statement.bookings:
            try:
                ci = datetime.fromisoformat(b.check_in).strftime("%d/%m/%Y")
                co = datetime.fromisoformat(b.check_out).strftime("%d/%m/%Y")
                nights = max(1, (datetime.fromisoformat(b.check_out).date() - datetime.fromisoformat(b.check_in).date()).days)
            except Exception:
                ci = b.check_in
                co = b.check_out
                nights = 1

            booking_rows_html += f"""
            <tr>
                <td class="prop-name">{html.escape(b.property_name)}</td>
                <td>{html.escape(b.guest_name)}</td>
                <td>{ci} &rarr; {co}</td>
                <td class="text-center">{nights}</td>
                <td><span class="badge badge-source">{html.escape(b.source_type.replace('_', ' ').title())}</span></td>
                <td><span class="badge badge-status">{html.escape(b.payment_status or 'N/A')}</span></td>
                <td class="text-right font-mono font-bold">{b.total_amount:.3f} {statement.currency}</td>
            </tr>
            """

    # Build ticket rows
    ticket_rows_html = ""
    if not statement.maintenance_tickets:
        ticket_rows_html = """
        <tr>
            <td colspan="5" class="empty-cell">Aucune intervention de maintenance déductible enregistrée pour ce mois.</td>
        </tr>
        """
    else:
        for t in statement.maintenance_tickets:
            res_date = "N/A"
            if t.resolved_at:
                try:
                    res_date = datetime.fromisoformat(t.resolved_at).strftime("%d/%m/%Y")
                except Exception:
                    res_date = t.resolved_at

            ticket_rows_html += f"""
            <tr>
                <td>{res_date}</td>
                <td class="prop-name">{html.escape(t.property_name)}</td>
                <td>{html.escape(t.title)}</td>
                <td><span class="badge badge-cat">{html.escape(t.category or 'Général')}</span></td>
                <td class="text-right font-mono font-bold text-danger">-{t.cost:.3f} {statement.currency}</td>
            </tr>
            """

    # Build property breakdown rows if multiple properties
    prop_rows_html = ""
    for p in statement.properties:
        prop_rows_html += f"""
        <tr>
            <td class="prop-name font-bold">{html.escape(p.property_name)}</td>
            <td class="text-center">{p.bookings_count}</td>
            <td class="text-right font-mono">{p.gross_revenue:.3f} {statement.currency}</td>
            <td class="text-right font-mono text-muted">-{p.commission_amount:.3f} ({p.commission_percentage:.0f}%)</td>
            <td class="text-right font-mono text-danger">-{p.maintenance_expenses:.3f}</td>
            <td class="text-right font-mono font-bold text-success">{p.net_payout:.3f} {statement.currency}</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relevé Propriétaire - {period_label} - {html.escape(statement.owner_name)}</title>
    <style>
        :root {{
            --primary: #1E3A8A;
            --primary-accent: #2563EB;
            --success: #059669;
            --danger: #DC2626;
            --dark: #0F172A;
            --light-bg: #F8FAFC;
            --border: #E2E8F0;
            --text-muted: #64748B;
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1E293B;
            background: #F1F5F9;
            padding: 24px;
            font-size: 14px;
            line-height: 1.5;
        }}
        .no-print {{
            max-width: 960px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .print-btn {{
            background: var(--primary-accent);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .print-btn:hover {{
            background: var(--primary);
        }}
        .statement-card {{
            max-width: 960px;
            margin: 0 auto;
            background: white;
            padding: 36px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
            border: 1px solid var(--border);
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284C7;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }}
        .brand h1 {{
            font-size: 24px;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: -0.5px;
        }}
        .brand p {{
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 2px;
        }}
        .meta {{
            text-align: right;
        }}
        .meta-tag {{
            display: inline-block;
            background: #EFF6FF;
            color: var(--primary-accent);
            padding: 4px 12px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }}
        .meta-ref {{
            font-family: monospace;
            font-size: 13px;
            color: var(--dark);
            font-weight: 600;
        }}
        .meta-date {{
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 4px;
        }}
        .owner-box {{
            background: var(--light-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 24px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }}
        .owner-field label {{
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--text-muted);
            margin-bottom: 2px;
        }}
        .owner-field value {{
            display: block;
            font-size: 15px;
            font-weight: 600;
            color: var(--dark);
        }}
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }}
        .kpi-card {{
            background: var(--light-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }}
        .kpi-card.highlight {{
            background: #ECFDF5;
            border-color: #A7F3D0;
        }}
        .kpi-label {{
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 6px;
        }}
        .kpi-value {{
            font-size: 18px;
            font-weight: 800;
            font-family: monospace;
            color: var(--dark);
        }}
        .kpi-value.danger {{
            color: var(--danger);
        }}
        .kpi-value.success {{
            color: var(--success);
            font-size: 20px;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: 700;
            color: var(--dark);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .table-wrap {{
            margin-bottom: 28px;
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 8px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }}
        th {{
            background: #F8FAFC;
            color: var(--text-muted);
            font-weight: 600;
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
            text-transform: uppercase;
        }}
        td {{
            padding: 10px 14px;
            border-bottom: 1px solid var(--border);
            color: #334155;
        }}
        tr:last-child td {{
            border-bottom: none;
        }}
        .prop-name {{
            font-weight: 600;
            color: var(--dark);
        }}
        .text-center {{
            text-align: center;
        }}
        .text-right {{
            text-align: right;
        }}
        .font-mono {{
            font-family: monospace;
        }}
        .font-bold {{
            font-weight: 700;
        }}
        .text-danger {{
            color: var(--danger);
        }}
        .text-success {{
            color: var(--success);
        }}
        .text-muted {{
            color: var(--text-muted);
        }}
        .empty-cell {{
            text-align: center;
            color: var(--text-muted);
            padding: 24px;
            font-style: italic;
        }}
        .badge {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }}
        .badge-source {{
            background: #E0F2FE;
            color: #0369A1;
        }}
        .badge-status {{
            background: #F1F5F9;
            color: #475569;
        }}
        .badge-cat {{
            background: #FEF3C7;
            color: #B45309;
        }}
        .footer {{
            border-top: 1px solid var(--border);
            padding-top: 20px;
            font-size: 12px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .no-print {{
                display: none !important;
            }}
            .statement-card {{
                box-shadow: none;
                border: none;
                padding: 0;
            }}
            @page {{
                size: A4 portrait;
                margin: 12mm 15mm;
            }}
            .table-wrap {{
                page-break-inside: auto;
            }}
            tr {{
                page-break-inside: avoid;
                page-break-after: auto;
            }}
        }}
    </style>
</head>
<body>
    <div class="no-print">
        <span style="font-weight: 600; color: #475569;">Vayca &bull; Relevé Mensuel du Propriétaire</span>
        <button onclick="window.print()" class="print-btn">
            <span>&#128438;</span> Imprimer / Enregistrer en PDF
        </button>
    </div>

    <div class="statement-card">
        <header class="header">
            <div class="brand">
                <h1>{html.escape(company_name)}</h1>
                <p>Gestion Locative & Conciergerie Opérationnelle</p>
            </div>
            <div class="meta">
                <span class="meta-tag">{period_label}</span>
                <div class="meta-ref">{ref_code}</div>
                <div class="meta-date">Émis le {date_str}</div>
            </div>
        </header>

        <section class="owner-box">
            <div class="owner-field">
                <label>Propriétaire Partenaire</label>
                <value>{html.escape(statement.owner_name)}</value>
            </div>
            <div class="owner-field">
                <label>Email & Téléphone</label>
                <value>{html.escape(statement.email or 'Non renseigné')}{f' &bull; {html.escape(statement.phone)}' if statement.phone else ''}</value>
            </div>
            <div class="owner-field">
                <label>Taux de Commission Agence</label>
                <value>{statement.commission_percentage:.2f} %</value>
            </div>
            <div class="owner-field">
                <label>Biens Associés</label>
                <value>{statement.properties_count} propriété(s)</value>
            </div>
        </section>

        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Revenus Bruts ({statement.bookings_count} séjour{'' if statement.bookings_count <= 1 else 's'})</div>
                <div class="kpi-value">{gross_str}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Commission Agence</div>
                <div class="kpi-value danger">{comm_str}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Dépenses Maintenance</div>
                <div class="kpi-value danger">{maint_str}</div>
            </div>
            <div class="kpi-card highlight">
                <div class="kpi-label">Net à Verser au Propriétaire</div>
                <div class="kpi-value success">{net_str}</div>
            </div>
        </section>

        {f'''
        <div class="section-title">Récapitulatif par Propriété</div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Propriété</th>
                        <th class="text-center">Séjours</th>
                        <th class="text-right">Revenu Brut</th>
                        <th class="text-right">Commission</th>
                        <th class="text-right">Maintenance</th>
                        <th class="text-right">Net Propriétaire</th>
                    </tr>
                </thead>
                <tbody>
                    {prop_rows_html}
                </tbody>
            </table>
        </div>
        ''' if len(statement.properties) > 1 else ''}

        <div class="section-title">Détail des Séjours Terminés ({len(statement.bookings)})</div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Propriété</th>
                        <th>Client</th>
                        <th>Dates de Séjour</th>
                        <th class="text-center">Nuits</th>
                        <th>Canal</th>
                        <th>Statut Folio</th>
                        <th class="text-right">Montant Brut</th>
                    </tr>
                </thead>
                <tbody>
                    {booking_rows_html}
                </tbody>
            </table>
        </div>

        <div class="section-title">Dépenses de Maintenance Déductibles ({len(statement.maintenance_tickets)})</div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Date Résolution</th>
                        <th>Propriété</th>
                        <th>Intervention / Incident</th>
                        <th>Catégorie</th>
                        <th class="text-right">Coût Déductible</th>
                    </tr>
                </thead>
                <tbody>
                    {ticket_rows_html}
                </tbody>
            </table>
        </div>

        <footer class="footer">
            <div>
                Ce document constitue le relevé d'activité certifié émis par <strong>{html.escape(company_name)}</strong> via la plateforme Vayca.
            </div>
            <div style="font-family: monospace;">
                ID: {ref_code}
            </div>
        </footer>
    </div>
</body>
</html>
"""
