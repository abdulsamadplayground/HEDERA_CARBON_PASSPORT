"""
Generate clean, simple architecture diagrams using Graphviz.
No logos, no HTML labels — just clean boxes and arrows.
"""
import graphviz
import os

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "diagrams")
os.makedirs(DOCS_DIR, exist_ok=True)

# Shared graph defaults
GRAPH_ATTRS = dict(bgcolor="white", pad="0.4", fontname="Helvetica", dpi="150")
NODE_ATTRS = dict(shape="box", style="rounded,filled", fontname="Helvetica", fontsize="11", penwidth="1.5")
EDGE_ATTRS = dict(fontname="Helvetica", fontsize="9", penwidth="1.5", arrowsize="0.8")

# Color palette
GREEN = "#10B981"
BLUE = "#3B82F6"
PURPLE = "#8B5CF6"
ORANGE = "#F59E0B"
RED = "#EF4444"
TEAL = "#14B8A6"
GRAY = "#64748B"
LIGHT_GREEN = "#D1FAE5"
LIGHT_BLUE = "#DBEAFE"
LIGHT_PURPLE = "#EDE9FE"
LIGHT_ORANGE = "#FEF3C7"
LIGHT_RED = "#FEE2E2"
LIGHT_TEAL = "#CCFBF1"
LIGHT_GRAY = "#F1F5F9"


def new_graph(name, direction="TB"):
    g = graphviz.Digraph(name, format="png")
    g.attr(rankdir=direction, **GRAPH_ATTRS)
    g.attr("node", **NODE_ATTRS)
    g.attr("edge", **EDGE_ATTRS)
    return g


# 1. Platform Architecture
def build_platform_architecture():
    g = new_graph("platform_architecture")
    g.attr(nodesep="0.5", ranksep="0.7")

    with g.subgraph(name="cluster_fe") as c:
        c.attr(label="Frontend (Next.js + React)", style="rounded,dashed", color=GRAY, fontcolor=GRAY, fontsize="10")
        c.node("overview", "Platform\nOverview", fillcolor=LIGHT_GREEN, color=GREEN)
        c.node("company", "Company\nRegistration", fillcolor=LIGHT_PURPLE, color=PURPLE)
        c.node("emissions", "Emissions\nCalculator", fillcolor=LIGHT_BLUE, color=BLUE)
        c.node("compliance", "Compliance\nDashboard", fillcolor=LIGHT_TEAL, color=TEAL)
        c.node("guardian_ui", "Guardian\nPolicies", fillcolor=LIGHT_PURPLE, color=PURPLE)
        c.node("trading", "Trading &\nMarketplace", fillcolor=LIGHT_ORANGE, color=ORANGE)
        c.node("supply", "Supply\nChain", fillcolor=LIGHT_TEAL, color=TEAL)

    with g.subgraph(name="cluster_api") as c:
        c.attr(label="API Layer (Next.js Routes)", style="rounded,dashed", color=GRAY, fontcolor=GRAY, fontsize="10")
        c.node("api", "REST API\nRoutes", fillcolor=LIGHT_GRAY, color=GRAY)
        c.node("services", "22 TypeScript\nServices", fillcolor=LIGHT_BLUE, color=BLUE)

    with g.subgraph(name="cluster_hedera") as c:
        c.attr(label="Hedera Testnet", style="rounded,dashed", color=TEAL, fontcolor=TEAL, fontsize="10")
        c.node("hts", "HTS\n6 Tokens", fillcolor=LIGHT_GREEN, color=GREEN)
        c.node("hcs", "HCS\n12 Topics", fillcolor=LIGHT_PURPLE, color=PURPLE)
        c.node("hscs", "HSCS\n6 Contracts", fillcolor=LIGHT_ORANGE, color=ORANGE)
        c.node("hfs", "HFS\nFile Storage", fillcolor=LIGHT_TEAL, color=TEAL)

    with g.subgraph(name="cluster_ext") as c:
        c.attr(label="External", style="rounded,dashed", color=GRAY, fontcolor=GRAY, fontsize="10")
        c.node("guardian", "Hedera\nGuardian", fillcolor=LIGHT_PURPLE, color=PURPLE)
        c.node("db", "PostgreSQL /\nJSON Store", fillcolor=LIGHT_GRAY, color=GRAY)

    for n in ["company", "emissions", "compliance", "guardian_ui", "trading", "supply"]:
        g.edge(n, "api", color=GRAY, style="dashed")
    g.edge("api", "services", color=BLUE)
    g.edge("services", "hts", color=GREEN)
    g.edge("services", "hcs", color=PURPLE)
    g.edge("services", "hscs", color=ORANGE)
    g.edge("services", "hfs", color=TEAL)
    g.edge("services", "guardian", color=PURPLE, style="dashed", label="REST API")
    g.edge("services", "db", color=GRAY)
    return g


# 2. User Workflow
def build_user_workflow():
    g = new_graph("user_workflow", "LR")
    g.attr(nodesep="0.6", ranksep="0.9")

    g.node("login", "Connect\nWallet", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("register", "Register\nCompany", fillcolor=LIGHT_PURPLE, color=PURPLE)
    g.node("calc", "Calculate\nEmissions", fillcolor=LIGHT_GREEN, color=GREEN)
    g.node("comply", "Compliance\nDashboard", fillcolor=LIGHT_TEAL, color=TEAL)
    g.node("trade", "Trade\nCredits", fillcolor=LIGHT_ORANGE, color=ORANGE)
    g.node("verify", "Verify on\nHashScan", fillcolor=LIGHT_GREEN, color=GREEN)

    g.edge("login", "register", color=BLUE, label="MetaMask")
    g.edge("register", "calc", color=PURPLE, label="auto-redirect")
    g.edge("calc", "comply", color=GREEN, label="auto-redirect")
    g.edge("comply", "trade", color=TEAL)
    g.edge("trade", "verify", color=ORANGE)
    g.edge("comply", "verify", color=TEAL, style="dashed")
    return g


# 3. Transaction Flow
def build_transaction_flow():
    g = new_graph("transaction_flow", "LR")
    g.attr(nodesep="0.5", ranksep="0.7")

    g.node("user", "User\nAction", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("component", "React\nComponent", fillcolor=LIGHT_PURPLE, color=PURPLE)
    g.node("hook", "useApi\nHook", fillcolor=LIGHT_GRAY, color=GRAY)
    g.node("api", "API\nRoute", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("service", "Service\nLayer", fillcolor=LIGHT_GREEN, color=GREEN)
    g.node("hedera", "Hedera\nTestnet", fillcolor=LIGHT_TEAL, color=TEAL)
    g.node("toast", "Toast\nNotification", fillcolor=LIGHT_ORANGE, color=ORANGE)

    g.edge("user", "component", label="submit")
    g.edge("component", "hook", label="call()")
    g.edge("hook", "api", label="POST")
    g.edge("api", "service", label="logic")
    g.edge("service", "hedera", label="HCS/HTS", color=TEAL)
    g.edge("hedera", "service", label="txId", style="dashed", color=TEAL)
    g.edge("service", "hook", label="response", style="dashed", color=GRAY)
    g.edge("hook", "toast", label="notify", color=ORANGE)
    return g


# 4. Emissions Calculation
def build_emissions_calculation():
    g = new_graph("emissions_calculation")
    g.attr(nodesep="0.4", ranksep="0.5")

    g.node("input", "User Input\n(Emissions Data)", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("scope1", "Scope 1\nDirect Emissions", fillcolor=LIGHT_RED, color=RED)
    g.node("scope2", "Scope 2\nEnergy Indirect", fillcolor=LIGHT_ORANGE, color=ORANGE)
    g.node("scope3", "Scope 3\nValue Chain", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("total", "Total tCO2e", fillcolor=LIGHT_GREEN, color=GREEN, penwidth="2")
    g.node("score", "Carbon Score\nA - F", fillcolor=LIGHT_TEAL, color=TEAL)
    g.node("hcs", "HCS\nAudit Log", fillcolor=LIGHT_PURPLE, color=PURPLE)

    g.edge("input", "scope1", color=RED)
    g.edge("input", "scope2", color=ORANGE)
    g.edge("input", "scope3", color=BLUE)
    g.edge("scope1", "total", color=GREEN)
    g.edge("scope2", "total", color=GREEN)
    g.edge("scope3", "total", color=GREEN)
    g.edge("total", "score", color=TEAL, penwidth="2")
    g.edge("score", "hcs", color=PURPLE)
    return g


# 5. Passport Minting
def build_passport_minting():
    g = new_graph("passport_minting")
    g.attr(nodesep="0.4", ranksep="0.5")

    g.node("select", "Select\nCompany", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("data", "Emissions +\nTier + Score", fillcolor=LIGHT_GREEN, color=GREEN)
    g.node("badges", "Calculate\nBadges", fillcolor=LIGHT_ORANGE, color=ORANGE)
    g.node("mint", "Mint CPASS\nNFT (HTS)", fillcolor=LIGHT_PURPLE, color=PURPLE, penwidth="2")
    g.node("hfs", "Upload Metadata\n(HFS)", fillcolor=LIGHT_TEAL, color=TEAL)
    g.node("contract", "Smart Contract\n(HSCS)", fillcolor=LIGHT_ORANGE, color=ORANGE)
    g.node("hcs", "Log Event\n(HCS)", fillcolor=LIGHT_PURPLE, color=PURPLE)
    g.node("hashscan", "Verify on\nHashScan", fillcolor=LIGHT_GREEN, color=GREEN)

    g.edge("select", "data", color=BLUE)
    g.edge("data", "badges", color=GREEN)
    g.edge("badges", "mint", color=PURPLE, penwidth="2")
    g.edge("mint", "hfs", color=TEAL)
    g.edge("mint", "contract", color=ORANGE)
    g.edge("contract", "hcs", color=PURPLE)
    g.edge("hcs", "hashscan", color=GREEN)
    return g


# 6. Carbon Score Rating
def build_carbon_score_rating():
    g = new_graph("carbon_score_rating", "LR")
    g.attr(nodesep="0.4", ranksep="0.7")

    g.node("ratio", "Emissions /\nBenchmark", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("a", "A  Excellent\n< 0.6", fillcolor="#D1FAE5", color="#059669")
    g.node("b", "B  Good\n0.6 - 0.8", fillcolor="#DBEAFE", color="#2563EB")
    g.node("c", "C  Average\n0.8 - 1.0", fillcolor="#FEF3C7", color="#D97706")
    g.node("d", "D  Below Avg\n1.0 - 1.3", fillcolor="#FFEDD5", color="#EA580C")
    g.node("f", "F  Failing\n> 1.3", fillcolor="#FEE2E2", color="#DC2626")

    g.edge("ratio", "a", color="#059669")
    g.edge("ratio", "b", color="#2563EB")
    g.edge("ratio", "c", color="#D97706")
    g.edge("ratio", "d", color="#EA580C")
    g.edge("ratio", "f", color="#DC2626")
    return g


# 7. Token Economy
def build_token_economy():
    g = new_graph("token_economy", "LR")
    g.attr(nodesep="0.5", ranksep="0.8")

    g.node("reduce", "Meet Reduction\nTargets", fillcolor=LIGHT_GREEN, color=GREEN)
    g.node("comply", "Policy\nCompliance", fillcolor=LIGHT_TEAL, color=TEAL)
    g.node("ccr", "CCR\nCarbon Credits", fillcolor=LIGHT_GREEN, color=GREEN, penwidth="2")
    g.node("market", "Marketplace\nTrading", fillcolor=LIGHT_RED, color=RED)
    g.node("captrade", "Cap & Trade\nAllowances", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("offsets", "Carbon\nOffsets", fillcolor=LIGHT_TEAL, color=TEAL)
    g.node("hashscan", "HashScan\nVerification", fillcolor=LIGHT_GREEN, color=GREEN)

    g.edge("reduce", "ccr", label="earn", color=GREEN)
    g.edge("comply", "ccr", label="reward", color=TEAL)
    g.edge("ccr", "market", label="trade", color=RED)
    g.edge("ccr", "captrade", label="allocate", color=BLUE)
    g.edge("ccr", "offsets", label="retire", color=TEAL)
    g.edge("market", "hashscan", color=GREEN)
    g.edge("captrade", "hashscan", color=GREEN, style="dashed")
    return g


# 8. Badge System
def build_badge_system():
    g = new_graph("badge_system")
    g.attr(nodesep="0.4", ranksep="0.5")

    g.node("tier", "Company\nEmission Tier", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("paris", "Paris\nAgreement", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("euets", "EU ETS\nCompliant", fillcolor=LIGHT_BLUE, color=BLUE)
    g.node("netzero", "Net Zero\nPathway", fillcolor=LIGHT_GREEN, color=GREEN)
    g.node("lowcarbon", "Low Carbon\nLeader", fillcolor=LIGHT_GREEN, color=GREEN)
    g.node("goldstd", "Gold\nStandard", fillcolor=LIGHT_ORANGE, color=ORANGE)
    g.node("nft", "CPASS NFT\nMetadata", fillcolor=LIGHT_PURPLE, color=PURPLE, penwidth="2")

    g.edge("tier", "paris", label="Tier 2/3", color=BLUE)
    g.edge("tier", "euets", label="Tier 2/3", color=BLUE)
    g.edge("tier", "netzero", label="Tier 3", color=GREEN)
    g.edge("tier", "lowcarbon", label="Tier 3", color=GREEN)
    g.edge("tier", "goldstd", label="Tier 3", color=ORANGE)
    for b in ["paris", "euets", "netzero", "lowcarbon", "goldstd"]:
        g.edge(b, "nft", color=PURPLE, style="dashed")
    return g


# Main
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
    print("Generating clean diagrams...\n")
    ok = 0
    for name, builder in BUILDERS.items():
        try:
            g = builder()
            out = os.path.join(DOCS_DIR, name)
            g.render(out, cleanup=True)
            size = os.path.getsize(out + ".png")
            print(f"  OK  {name}.png ({size:,} bytes)")
            ok += 1
        except Exception as e:
            print(f"  FAIL  {name}: {e}")
    print(f"\nDone: {ok}/{len(BUILDERS)} diagrams")
