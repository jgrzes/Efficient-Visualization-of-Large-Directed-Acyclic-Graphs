#include "Coloured_Graph.h"

#include <functional>

namespace data_structures {

bool ColouredGraph::ColouredGraphNeighbourhoodView::shouldIgnoreAndJumpForward(
    const NeighbourhoodIterator& it
) const {
    const ColouredGraph* castedOwner = static_cast<const ColouredGraph*>(m_owner);
    const auto [anyColourHighlighted, highlightedColour] = castedOwner->m_singleColourHighlight;
    return (castedOwner->m_disabledFlags[*it] 
            || (anyColourHighlighted && castedOwner->m_vertexColours[*it] != highlightedColour));
}    

ColouredGraph::ColouredGraph(
    Graph* graphPtr, std::vector<uint32_t>& vertexColours, 
    GraphStoringPolicy graphStoringPolicy
) : PartiallyDisabledGraph{graphPtr, graphStoringPolicy}, 
    m_vertexColours{vertexColours} {}


ColouredGraph::ColouredGraph(
    Graph* graphPtr, const std::vector<uint32_t>& verticesToDisable, 
    std::vector<uint32_t>& vertexColours,
    GraphStoringPolicy graphStoringPolicy
) : PartiallyDisabledGraph{graphPtr, verticesToDisable, graphStoringPolicy}, 
    m_vertexColours{vertexColours} {}



ColouredGraph::ColouredGraph(GraphInterface& graph, GraphImplCopyingMode graphImplCopyingMode) : 
    PartiallyDisabledGraph{graph, graphImplCopyingMode} {

    if (auto colouredGraphPtr = dynamic_cast<ColouredGraph*>(&graph);
        colouredGraphPtr != nullptr) {

        m_vertexColours = colouredGraphPtr->m_vertexColours;
        return;
    }
    m_vertexColours = std::vector<uint32_t>(getVertexCount(), 0);
}

}