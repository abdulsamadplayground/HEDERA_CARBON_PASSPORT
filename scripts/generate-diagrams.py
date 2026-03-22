"""
Generate modern architecture diagrams with technology logos using Graphviz.
Uses HTML-label nodes with brand colors and icons for a polished look.
"""
import graphviz
import os
import urllib.request
import base64
import struct
import zlib

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "diagrams")
LOGOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "logos")
os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(LOGOS_DIR, exist_ok=True)

# ── Brand colors ──────────────────────────────────────────────────────
COLORS = {
    "nextjs":      {"bg": "#000000", "fg": "#FFFFFF", "icon": "▲"},
    "react":       {"bg": "#20232A", "fg": "#61DAFB", "icon": "⚛"},
    "typescript":  {"bg": "#3178C6", "fg": "#FFFFFF", "icon": "TS"},
    "hedera":      {"bg": "#222222", "fg": "#00BABC", "icon": "ℏ"},
    "hts":         {"bg": "#1B1B3A", "fg": "#00BABC", "icon": "🪙"},
    "hcs":         {"bg": "#1B1B3A", "fg": "#8259EF", "icon": "📋"},
    "hscs":        {"bg": "#1B1B3A", "fg": "#FF6B35", "icon": "📜"},
    "hfs":         {"bg": "#1B1B3A", "fg": "#4ECDC4", "icon": "📁"},
    "mirror":      {"bg": "#1B1B3A", "fg": "#95E1D3", "icon": "🔍"},
    "postgresql":  {"bg": "#336791", "fg": "#FFFFFF", "icon": "🐘"},
    "prisma":      {"bg": "#2D3748", "fg": "#FFFFFF", "icon": "△"},
    "solidity":    {"bg": "#363636", "fg": "#A8A8A8", "icon": "◆"},
    "nodejs":      {"bg": "#339933", "fg": "#FFFFFF", "icon": "⬢"},
    "redis":       {"bg": "#DC382D", "fg": "#FFFFFF", "icon": "◈"},
    "json":        {"bg": "#292929", "fg": "#F5A623", "icon": "{}"},
    "hashscan":    {"bg": "#0A1628", "fg": "#00BABC", "icon": "🔗"},
    "nft":         {"bg": "#7B2FF7", "fg": "#FFFFFF", "icon": "💎"},
    "token":       {"bg": "#F7931A", "fg": "#FFFFFF", "icon": "🪙"},
    "badge":       {"bg": "#10B981", "fg": "#FFFFFF", "icon": "🏅"},
    "user":        {"bg": "#6366F1", "fg": "#FFFFFF", "icon": "👤"},
    "calc":        {"bg": "#0EA5E9", "fg": "#FFFFFF", "icon": "📊"},
    "company":     {"bg": "#8B5CF6", "fg": "#FFFFFF", "icon": "🏢"},
    "passport":    {"bg": "#059669", "fg": "#FFFFFF", "icon": "🛂"},
    "claim":       {"bg": "#D97706", "fg": "#FFFFFF", "icon": "✓"},
    "guardian":    {"bg": "#7C3AED", "fg": "#FFFFFF", "icon": "🛡"},
    "market":      {"bg": "#DC2626", "fg": "#FFFFFF", "icon": "⚖"},
    "captrade":    {"bg": "#2563EB", "fg": "#FFFFFF", "icon": "📈"},
    "supply":      {"bg": "#0D9488", "fg": "#FFFFFF", "icon": "🔗"},
    "report":      {"bg": "#4338CA", "fg": "#FFFFFF", "icon": "📋"},
    "activity":    {"bg": "#78716C", "fg": "#FFFFFF", "icon": "📜"},
    "toast":       {"bg": "#16A34A", "fg": "#FFFFFF", "icon": "🔔"},
    "scope1":      {"bg": "#EF4444", "fg": "#FFFFFF", "icon": "🔥"},
    "scope2":      {"bg": "#F59E0B", "fg": "#FFFFFF", "icon": "⚡"},
    "scope3":      {"bg": "#3B82F6", "fg": "#FFFFFF", "icon": "🌐"},
    "gradeA":      {"bg": "#10B981", "fg": "#FFFFFF", "icon": "A"},
    "gradeB":      {"bg": "#3B82F6", "fg": "#FFFFFF", "icon": "B"},
    "gradeC":      {"bg": "#F59E0B", "fg": "#FFFFFF", "icon": "C"},
    "gradeD":      {"bg": "#F97316", "fg": "#FFFFFF", "icon": "D"},
    "gradeF":      {"bg": "#EF4444", "fg": "#FFFFFF", "icon": "F"},
    "tier1":       {"bg": "#EF4444", "fg": "#FFFFFF", "icon": "1"},
    "tier2":       {"bg": "#F59E0B", "fg": "#FFFFFF", "icon": "2"},
    "tier3":       {"bg": "#10B981", "fg": "#FFFFFF", "icon": "3"},
    "paris":       {"bg": "#1D4ED8", "fg": "#FFFFFF", "icon": "🌍"},
    "euets":       {"bg": "#1E40AF", "fg": "#FFFFFF", "icon": "🇪🇺"},
    "netzero":     {"bg": "#059669", "fg": "#FFFFFF", "icon": "🎯"},
    "lowcarbon":   {"bg": "#16A34A", "fg": "#FFFFFF", "icon": "🌱"},
    "goldstd":     {"bg": "#D97706", "fg": "#FFFFFF", "icon": "⭐"},
    "ccr":         {"bg": "#10B981", "fg": "#FFFFFF", "icon": "₵"},
    "cal":         {"bg": "#6366F1", "fg": "#FFFFFF", "icon": "Ⓐ"},
    "gbt":         {"bg": "#059669", "fg": "#FFFFFF", "icon": "🌿"},
    "reward":      {"bg": "#F59E0B", "fg": "#FFFFFF", "icon": "🏆"},
}


def logo_node(label, style_key, sublabel=""):
    """Generate HTML label for a styled node with icon + text."""
    c = COLORS.get(style_key, {"bg": "#374151", "fg": "#FFFFFF", "icon": "●"})
    icon = c["icon"]
    sub = f'<BR/><FONT POINT-SIZE="9" COLOR="#9CA3AF">{sublabel}</FONT>' if sublabel else ""
    return f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="6">
      <TR>
        <TD BGCOLOR="{c["bg"]}" STYLE="ROUNDED" WIDTH="28" HEIGHT="28">
          <FONT COLOR="{c["fg"]}" POINT-SIZE="16">{icon}</FONT>
        </TD>
        <TD BGCOLOR="{c["bg"]}" STYLE="ROUNDED">
          <FONT COLOR="{c["fg"]}" POINT-SIZE="11"><B>{label}</B></FONT>{sub}
        </TD>
      </TR>
    </TABLE>>'''


def wide_node(label, style_key, sublabel=""):
    """Single-cell styled node (for compact layouts)."""
    c = COLORS.get(style_key, {"bg": "#374151", "fg": "#FFFFFF", "icon": "●"})
    icon = c["icon"]
    sub = f'<BR/><FONT POINT-SIZE="8" COLOR="#9CA3AF">{sublabel}</FONT>' if sublabel else ""
    return f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">
      <TR><TD BGCOLOR="{c["bg"]}" STYLE="ROUNDED">
        <FONT COLOR="{c["fg"]}" POINT-SIZE="14">{icon}</FONT>
        <FONT COLOR="{c["fg"]}" POINT-SIZE="10"> <B>{label}</B></FONT>{sub}
      </TD></TR>
    </TABLE>>'''



# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 1: Platform Architecture
# ═══════════════════════════════════════════════════════════════════════
def build_platform_architecture():
    g = graphviz.Digraph("platform_architecture", format="png")
    g.attr(rankdir="TB", bgcolor="#0F172A", pad="0.5", nodesep="0.4", ranksep="0.8",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="1.5", arrowsize="0.8")

    # Frontend cluster
    with g.subgraph(name="cluster_frontend") as fe:
        fe.attr(label='', style="rounded,filled", fillcolor="#1E293B",
                color="#334155", penwidth="2")
        # Title node
        fe.node("fe_title", label=logo_node("Next.js Frontend", "nextjs", "React 19 + TypeScript"))
        fe.node("fe_po", label=wide_node("Platform Overview", "company"))
        fe.node("fe_cr", label=wide_node("Company Registration", "company"))
        fe.node("fe_ec", label=wide_node("Emissions Calculator", "calc"))
        fe.node("fe_cd", label=wide_node("Compliance Dashboard", "passport"))
        fe.node("fe_mp", label=wide_node("Marketplace", "market"))
        fe.node("fe_ct", label=wide_node("Cap &amp; Trade", "captrade"))
        fe.node("fe_sc", label=wide_node("Supply Chain", "supply"))
        fe.node("fe_al", label=wide_node("Activity Log", "activity"))

    # API cluster
    with g.subgraph(name="cluster_api") as api:
        api.attr(label='', style="rounded,filled", fillcolor="#1E293B",
                 color="#334155", penwidth="2")
        api.node("api_title", label=logo_node("API Routes", "nextjs", "Next.js App Router"))
        api.node("api_companies", label=wide_node("/api/companies", "nodejs"))
        api.node("api_emissions", label=wide_node("/api/emissions", "nodejs"))
        api.node("api_passports", label=wide_node("/api/passports", "nodejs"))
        api.node("api_claims", label=wide_node("/api/claims", "nodejs"))
        api.node("api_marketplace", label=wide_node("/api/marketplace", "nodejs"))
        api.node("api_captrade", label=wide_node("/api/cap-trade", "nodejs"))
        api.node("api_guardian", label=wide_node("/api/guardian", "nodejs"))
        api.node("api_did", label=wide_node("/api/did", "nodejs"))

    # Services cluster
    with g.subgraph(name="cluster_services") as svc:
        svc.attr(label='', style="rounded,filled", fillcolor="#1E293B",
                 color="#334155", penwidth="2")
        svc.node("svc_title", label=logo_node("Service Layer", "typescript", "22 TypeScript Services"))
        svc.node("svc_company", label=wide_node("Company Service", "company"))
        svc.node("svc_emissions", label=wide_node("Emissions Engine", "calc"))
        svc.node("svc_passport", label=wide_node("Passport Service", "passport"))
        svc.node("svc_score", label=wide_node("Carbon Score", "calc"))
        svc.node("svc_claims", label=wide_node("Claims Service", "claim"))
        svc.node("svc_guardian", label=wide_node("Guardian MRV", "guardian"))

    # Hedera cluster
    with g.subgraph(name="cluster_hedera") as hd:
        hd.attr(label='', style="rounded,filled", fillcolor="#0C1222",
                color="#00BABC", penwidth="2")
        hd.node("hd_title", label=logo_node("Hedera Testnet", "hedera", "Hashgraph DLT"))
        hd.node("hd_hts", label=wide_node("HTS — 6 Tokens", "hts"))
        hd.node("hd_hcs", label=wide_node("HCS — 12 Topics", "hcs"))
        hd.node("hd_hscs", label=wide_node("HSCS — 6 Contracts", "hscs"))
        hd.node("hd_hfs", label=wide_node("HFS — File Storage", "hfs"))
        hd.node("hd_mirror", label=wide_node("Mirror Node", "mirror"))

    # Storage cluster
    with g.subgraph(name="cluster_storage") as st:
        st.attr(label='', style="rounded,filled", fillcolor="#1E293B",
                color="#334155", penwidth="2")
        st.node("st_title", label=logo_node("Data Layer", "postgresql", "Persistence"))
        st.node("st_pg", label=wide_node("PostgreSQL", "postgresql", "Prisma ORM"))
        st.node("st_json", label=wide_node("Local JSON Store", "json", "Fallback DB"))

    # Edges between layers
    for fe_node in ["fe_cr", "fe_ec", "fe_cd", "fe_mp"]:
        g.edge(fe_node, "api_title", color="#475569AA")

    for api_node in ["api_companies", "api_emissions", "api_passports"]:
        g.edge(api_node, "svc_title", color="#475569AA")

    g.edge("svc_title", "hd_title", color="#00BABC", penwidth="2.5", label='  Hedera SDK  ',
           fontcolor="#00BABC", fontsize="9", fontname="Segoe UI")
    g.edge("svc_title", "st_title", color="#336791", penwidth="2", label='  Prisma  ',
           fontcolor="#336791", fontsize="9", fontname="Segoe UI")

    return g


# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 2: User Workflow
# ═══════════════════════════════════════════════════════════════════════
def build_user_workflow():
    g = graphviz.Digraph("user_workflow", format="png")
    g.attr(rankdir="LR", bgcolor="#0F172A", pad="0.5", nodesep="0.6", ranksep="1.0",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="2", arrowsize="0.9", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="9")

    g.node("step1", label=logo_node("1. Register Company", "company", "Hedera Account ID"))
    g.node("step2", label=logo_node("2. Calculate Emissions", "calc", "Scope 1 / 2 / 3"))
    g.node("step3", label=logo_node("3. Compliance Dashboard", "passport", "Claims + MRV + Passport"))

    g.node("mint", label=wide_node("Mint CPASS NFT", "nft"))
    g.node("claim", label=wide_node("Submit Claim", "claim"))
    g.node("mrv", label=wide_node("Guardian MRV", "guardian"))
    g.node("verify", label=logo_node("Verify on HashScan", "hashscan", "hashscan.io/testnet"))

    g.edge("step1", "step2", label=" auto-redirect ", color="#10B981")
    g.edge("step2", "step3", label=" auto-redirect ", color="#10B981")
    g.edge("step3", "mint", color="#7B2FF7")
    g.edge("step3", "claim", color="#D97706")
    g.edge("step3", "mrv", color="#7C3AED")
    g.edge("mint", "verify", color="#00BABC")
    g.edge("claim", "verify", color="#00BABC")
    g.edge("mrv", "verify", color="#00BABC")

    return g


# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 3: Transaction Flow
# ═══════════════════════════════════════════════════════════════════════
def build_transaction_flow():
    g = graphviz.Digraph("transaction_flow", format="png")
    g.attr(rankdir="LR", bgcolor="#0F172A", pad="0.5", nodesep="0.5", ranksep="0.7",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="1.8", arrowsize="0.8", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="8")

    g.node("user", label=logo_node("User Browser", "user", "Submit Form"))
    g.node("frontend", label=logo_node("React Component", "react", "Next.js Frontend"))
    g.node("hook", label=logo_node("useApi Hook", "typescript", "API Wrapper"))
    g.node("api", label=logo_node("API Route", "nextjs", "App Router"))
    g.node("service", label=logo_node("Service Layer", "nodejs", "Business Logic"))
    g.node("hedera", label=logo_node("Hedera Testnet", "hedera", "HCS + HTS + HSCS"))
    g.node("txctx", label=logo_node("TransactionContext", "react", "localStorage"))
    g.node("toast", label=logo_node("Toast Notification", "toast", "5s timer bar"))

    g.edge("user", "frontend", label=" submit ")
    g.edge("frontend", "hook", label=" call() ")
    g.edge("hook", "api", label=" POST ")
    g.edge("api", "service", label=" business logic ")
    g.edge("service", "hedera", label=" HCS + HTS ", color="#00BABC", penwidth="2.5")
    g.edge("hedera", "service", label=" txId ", style="dashed", color="#00BABC")
    g.edge("service", "api", label=" response ", style="dashed")
    g.edge("api", "hook", label=" JSON ", style="dashed")
    g.edge("hook", "txctx", label=" addTransaction ")
    g.edge("txctx", "toast", label=" notify ", color="#10B981")

    return g



# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 4: Emissions Calculation
# ═══════════════════════════════════════════════════════════════════════
def build_emissions_calculation():
    g = graphviz.Digraph("emissions_calculation", format="png")
    g.attr(rankdir="TB", bgcolor="#0F172A", pad="0.5", nodesep="0.4", ranksep="0.6",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="1.8", arrowsize="0.8", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="9")

    g.node("input", label=logo_node("User Input", "user", "Emissions Data"))

    # Scope type decision
    g.node("scope_type", label=f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8">
      <TR><TD BGCOLOR="#374151" STYLE="ROUNDED">
        <FONT COLOR="#F9FAFB" POINT-SIZE="11"><B>Scope Type?</B></FONT>
      </TD></TR>
    </TABLE>>''')

    g.node("scope1", label=logo_node("Scope 1 — Direct", "scope1", "tCO₂e = qty × factor ÷ 1000"))
    g.node("scope2", label=logo_node("Scope 2 — Energy", "scope2", "tCO₂e = kWh × grid ÷ 1000"))
    g.node("scope3_type", label=f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8">
      <TR><TD BGCOLOR="#374151" STYLE="ROUNDED">
        <FONT COLOR="#F9FAFB" POINT-SIZE="11"><B>Allocation Method?</B></FONT>
      </TD></TR>
    </TABLE>>''')
    g.node("spend", label=logo_node("Spend-Based", "scope3", "tCO₂e = spend × factor ÷ 1000"))
    g.node("activity", label=logo_node("Activity-Based", "scope3", "tCO₂e = data × factor ÷ 1000"))

    g.node("total", label=logo_node("Total tCO₂e", "calc", "Sum All Scopes"))
    g.node("grade", label=logo_node("Carbon Score A–F", "badge", "Benchmark Ratio"))
    g.node("profile", label=logo_node("Update Company", "company", "Tier + Score"))
    g.node("hcs_log", label=logo_node("HCS Audit Log", "hcs", "Immutable Record"))
    g.node("cpass", label=logo_node("CPASS Metadata", "nft", "Recalculate"))

    g.edge("input", "scope_type")
    g.edge("scope_type", "scope1", label=" Scope 1 ", color="#EF4444")
    g.edge("scope_type", "scope2", label=" Scope 2 ", color="#F59E0B")
    g.edge("scope_type", "scope3_type", label=" Scope 3 ", color="#3B82F6")
    g.edge("scope3_type", "spend")
    g.edge("scope3_type", "activity")
    g.edge("scope1", "total")
    g.edge("scope2", "total")
    g.edge("spend", "total")
    g.edge("activity", "total")
    g.edge("total", "grade", color="#10B981", penwidth="2.5")
    g.edge("grade", "profile")
    g.edge("profile", "hcs_log", color="#8259EF")
    g.edge("profile", "cpass", color="#7B2FF7")

    return g


# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 5: Passport Minting
# ═══════════════════════════════════════════════════════════════════════
def build_passport_minting():
    g = graphviz.Digraph("passport_minting", format="png")
    g.attr(rankdir="TB", bgcolor="#0F172A", pad="0.5", nodesep="0.4", ranksep="0.6",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="1.8", arrowsize="0.8", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="9")

    g.node("select", label=logo_node("Select Company", "company"))
    g.node("summary", label=logo_node("Company Summary", "company", "Name + Sector + Tier"))
    g.node("emissions", label=logo_node("Emissions Summary", "calc", "Scope 1/2/3 Totals"))
    g.node("badges", label=logo_node("Calculate Badges", "badge", "Tier-Based Awards"))

    g.node("tier_check", label=f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8">
      <TR><TD BGCOLOR="#374151" STYLE="ROUNDED">
        <FONT COLOR="#F9FAFB" POINT-SIZE="11"><B>Tier Check</B></FONT>
      </TD></TR>
    </TABLE>>''')

    g.node("paris", label=wide_node("Paris Agreement", "paris"))
    g.node("euets", label=wide_node("EU ETS Compliant", "euets"))
    g.node("netzero", label=wide_node("Net Zero Pathway", "netzero"))
    g.node("lowcarbon", label=wide_node("Low Carbon Leader", "lowcarbon"))
    g.node("goldstd", label=wide_node("Gold Standard", "goldstd"))

    g.node("mint", label=logo_node("Mint CPASS NFT", "nft", "Hedera Token Service"))
    g.node("hfs", label=logo_node("Upload to HFS", "hfs", "Metadata JSON"))
    g.node("contract", label=logo_node("Smart Contract", "hscs", "CompliancePassportManager"))
    g.node("hcs", label=logo_node("HCS Topic Log", "hcs", "PassportCreated Event"))
    g.node("verify", label=logo_node("Verify on HashScan", "hashscan", "hashscan.io/testnet"))

    g.edge("select", "summary")
    g.edge("summary", "emissions")
    g.edge("emissions", "badges")
    g.edge("badges", "tier_check")
    g.edge("tier_check", "paris", label=" Tier 2/3 ", color="#1D4ED8")
    g.edge("tier_check", "euets", label=" Tier 2/3 ", color="#1E40AF")
    g.edge("tier_check", "netzero", label=" Tier 3 ", color="#059669")
    g.edge("tier_check", "lowcarbon", label=" Tier 3 ", color="#16A34A")
    g.edge("tier_check", "goldstd", label=" Tier 3 ", color="#D97706")

    for badge in ["paris", "euets", "netzero", "lowcarbon", "goldstd"]:
        g.edge(badge, "mint", color="#7B2FF7AA")

    g.edge("mint", "hfs", color="#4ECDC4")
    g.edge("hfs", "contract", color="#FF6B35")
    g.edge("contract", "hcs", color="#8259EF")
    g.edge("hcs", "verify", color="#00BABC", penwidth="2.5")

    return g


# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 6: Carbon Score Rating
# ═══════════════════════════════════════════════════════════════════════
def build_carbon_score_rating():
    g = graphviz.Digraph("carbon_score_rating", format="png")
    g.attr(rankdir="LR", bgcolor="#0F172A", pad="0.5", nodesep="0.5", ranksep="0.8",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="2", arrowsize="0.8", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="9")

    g.node("ratio", label=logo_node("emissions ÷ benchmark", "calc", "Sector Ratio"))
    g.node("grade_check", label=f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8">
      <TR><TD BGCOLOR="#374151" STYLE="ROUNDED">
        <FONT COLOR="#F9FAFB" POINT-SIZE="11"><B>Grade?</B></FONT>
      </TD></TR>
    </TABLE>>''')

    g.node("a", label=wide_node("A — Excellent", "gradeA", "Under 500 tCO2e"))
    g.node("b", label=wide_node("B — Good", "gradeB", "500 to 2000 tCO2e"))
    g.node("c", label=wide_node("C — Average", "gradeC", "2000 to 10000 tCO2e"))
    g.node("d", label=wide_node("D — Below Avg", "gradeD", "10000 to 50000 tCO2e"))
    g.node("f", label=wide_node("F — Failing", "gradeF", "Over 50000 tCO2e"))

    g.edge("ratio", "grade_check")
    g.edge("grade_check", "a", label=" under 0.6 ", color="#10B981")
    g.edge("grade_check", "b", label=" 0.6 to 0.8 ", color="#3B82F6")
    g.edge("grade_check", "c", label=" 0.8 to 1.0 ", color="#F59E0B")
    g.edge("grade_check", "d", label=" 1.0 to 1.3 ", color="#F97316")
    g.edge("grade_check", "f", label=" 1.3 plus ", color="#EF4444")

    return g


# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 7: Token Economy
# ═══════════════════════════════════════════════════════════════════════
def build_token_economy():
    g = graphviz.Digraph("token_economy", format="png")
    g.attr(rankdir="LR", bgcolor="#0F172A", pad="0.5", nodesep="0.5", ranksep="0.9",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="2", arrowsize="0.8", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="9")

    g.node("reduce", label=logo_node("Meet Reduction Targets", "reward", "10–100% reduction"))
    g.node("stamps", label=logo_node("Compliance Stamps", "claim", "CSTAMP NFTs"))
    g.node("nature", label=logo_node("Nature-Based Solutions", "lowcarbon", "Reforestation etc."))

    g.node("ccr", label=logo_node("CCR Tokens", "ccr", "Carbon Credit Token"))
    g.node("gbt", label=logo_node("GBT Tokens", "gbt", "Green Bond Token"))

    g.node("marketplace", label=logo_node("Marketplace", "market", "CreditMarketplace.sol"))
    g.node("convert", label=logo_node("CCR ↔ CAL ↔ HBAR", "cal", "Token Exchange"))
    g.node("offsets", label=logo_node("Carbon Offsets", "passport", "Retire Credits"))
    g.node("hashscan", label=logo_node("HashScan Verify", "hashscan", "On-Chain Proof"))

    g.edge("reduce", "ccr", label=" earn ", color="#10B981")
    g.edge("stamps", "ccr", label=" earn ", color="#10B981")
    g.edge("nature", "gbt", label=" earn ", color="#059669")
    g.edge("ccr", "marketplace", label=" trade ", color="#DC2626")
    g.edge("ccr", "convert", label=" convert ", color="#6366F1")
    g.edge("ccr", "offsets", label=" spend ", color="#059669")
    g.edge("marketplace", "hashscan", color="#00BABC", penwidth="2.5")

    return g


# ═══════════════════════════════════════════════════════════════════════
# DIAGRAM 8: Badge System
# ═══════════════════════════════════════════════════════════════════════
def build_badge_system():
    g = graphviz.Digraph("badge_system", format="png")
    g.attr(rankdir="TB", bgcolor="#0F172A", pad="0.5", nodesep="0.4", ranksep="0.6",
           fontname="Segoe UI", dpi="150")
    g.attr("node", shape="none", fontname="Segoe UI")
    g.attr("edge", color="#475569", penwidth="1.8", arrowsize="0.8", fontname="Segoe UI",
           fontcolor="#94A3B8", fontsize="9")

    g.node("tier", label=logo_node("Company Emission Tier", "calc", "Based on Total tCO₂e"))
    g.node("check", label=f'''<
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8">
      <TR><TD BGCOLOR="#374151" STYLE="ROUNDED">
        <FONT COLOR="#F9FAFB" POINT-SIZE="11"><B>Tier Level?</B></FONT>
      </TD></TR>
    </TABLE>>''')

    g.node("paris", label=logo_node("Paris Agreement", "paris", "NDC Targets"))
    g.node("euets", label=logo_node("EU ETS Compliant", "euets", "Sector Benchmarks"))
    g.node("netzero", label=logo_node("Net Zero Pathway", "netzero", "Science-Based"))
    g.node("lowcarbon", label=logo_node("Low Carbon Leader", "lowcarbon", "Below Average"))
    g.node("goldstd", label=logo_node("Gold Standard", "goldstd", "Verified Credits"))

    g.node("nft", label=logo_node("CPASS NFT Metadata", "nft", "On-Chain Badge Record"))

    g.edge("tier", "check")
    g.edge("check", "paris", label=" Tier 2/3 ", color="#1D4ED8")
    g.edge("check", "euets", label=" Tier 2/3 ", color="#1E40AF")
    g.edge("check", "netzero", label=" Tier 3 only ", color="#059669")
    g.edge("check", "lowcarbon", label=" Tier 3 only ", color="#16A34A")
    g.edge("check", "goldstd", label=" Tier 3 only ", color="#D97706")

    for badge in ["paris", "euets", "netzero", "lowcarbon", "goldstd"]:
        g.edge(badge, "nft", color="#7B2FF7AA")

    return g



# ═══════════════════════════════════════════════════════════════════════
# MAIN — Render all diagrams
# ═══════════════════════════════════════════════════════════════════════
BUILDERS = {
    "platform-architecture": build_platform_architecture,
    "user-workflow": build_user_workflow,
    "transaction-flow": build_transaction_flow,
    "emissions-calculation": build_emissions_calculation,
    "passport-minting": build_passport_minting,
    "carbon-score-rating": build_carbon_score_rating,
    "token-economy": build_token_economy,
    "badge-system": build_badge_system,
}

if __name__ == "__main__":
    print("Generating modern Graphviz diagrams with logos...\n")
    success = 0
    for name, builder in BUILDERS.items():
        try:
            print(f"  Building {name}...")
            graph = builder()
            output_path = os.path.join(DOCS_DIR, name)
            graph.render(output_path, cleanup=True)
            png_path = output_path + ".png"
            size = os.path.getsize(png_path)
            print(f"  ✓ {png_path} ({size:,} bytes)")
            success += 1
        except Exception as e:
            print(f"  ✗ {name} failed: {e}")

    print(f"\nDone: {success}/{len(BUILDERS)} diagrams generated in docs/diagrams/")
