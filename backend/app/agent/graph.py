from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.nodes import classify_node, extract_node, validate_node

def route_classification(state: AgentState) -> str:
    """
    Conditional logic to route based on classification.
    """
    if state['status'] == "ERROR":
        return END
    
    if state['classification'] == "TIMESHEET":
        return "extract"
    else:
        return END # End if not a timesheet (e.g. Receipt)

workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("classify", classify_node)
workflow.add_node("extract", extract_node)
workflow.add_node("validate", validate_node)

# Set Entry Point
workflow.set_entry_point("classify")

# Add Edges
workflow.add_conditional_edges(
    "classify",
    route_classification,
    {
        "extract": "extract",
        END: END
    }
)

workflow.add_edge("extract", "validate")
workflow.add_edge("validate", END)

# Compile Graph
timesheet_processing_app = workflow.compile()
