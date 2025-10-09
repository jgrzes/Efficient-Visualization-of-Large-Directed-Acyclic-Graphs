#ifndef DATA_STRUCTURES__COLOURED_GRAPH_H
#define DATA_STRUCTURES__COLOURED_GRAPH_H

#include "Partially_Disabled_Graph.h"

namespace data_structures {

class ColouredGraph : public PartiallyDisabledGraph {

public:

    using GraphStoringPolicy = PartiallyDisabledGraph::GraphStoringPolicy;    
    using GraphImplCopyingMode = GraphInterface::GraphImplCopyingMode;
    using VertexAdjSet = std::unordered_set<uint32_t>;

    class ColouredGraphNeighbourhoodView : public BaseNeighbourhoodView {

    public:

        friend ColouredGraph;

    protected:

        bool shouldIgnoreAndJumpForward(const NeighbourhoodIterator& it) const;

        ColouredGraphNeighbourhoodView(const GraphInterface* owner, VertexAdjSet& N) : 
            BaseNeighbourhoodView{owner, N} {}

        ColouredGraphNeighbourhoodView(const GraphInterface* owner, const VertexAdjSet& N) : 
            BaseNeighbourhoodView{owner, const_cast<VertexAdjSet&>(N)} {}

    };
    
    ColouredGraph(
        Graph* graphPtr, 
        std::vector<uint32_t>& vertexColours,
        GraphStoringPolicy graphStoringPolicy = GraphStoringPolicy::SHARED_POINTER    
    );

    ColouredGraph(
        Graph* graphPtr, 
        const std::vector<uint32_t>& verticesToDisable,
        std::vector<uint32_t>& vertexColours,
        GraphStoringPolicy graphStoringPolicy = GraphStoringPolicy::SHARED_POINTER     
    );

    ColouredGraph(
        GraphInterface& graph, 
        GraphImplCopyingMode graphImplCopyingMode
    );

    const Neighbourhood N(uint32_t vIndex) const override;
    Neighbourhood N(uint32_t vIndex) override;
    const Neighbourhood N(const Vertex& v) const override;
    Neighbourhood N(const Vertex& v) override {return std::move(N(v.index));}

    const Neighbourhood NR(uint32_t vIndex) const override;
    Neighbourhood NR(uint32_t vIndex) override;
    const Neighbourhood NR(const Vertex& v) const override;
    Neighbourhood NR(const Vertex& v) override {return std::move(NR(v.index));}

    bool shouldSkipVertex(uint32_t vIndex) const override {
        if (PartiallyDisabledGraph::shouldSkipVertex(vIndex)) return true;
        return (m_singleColourHighlight.anyColourHighlighted
                && m_singleColourHighlight.highlightedColour != m_vertexColours[vIndex]);
    }

    bool shouldSkipVertex(const Vertex& v) const override {
        if (PartiallyDisabledGraph::shouldSkipVertex(v)) return true;
        return (m_singleColourHighlight.anyColourHighlighted
                && m_singleColourHighlight.highlightedColour != m_vertexColours[v.index]);
    }
    
    inline uint32_t getVertexColour(uint32_t vIndex) const {return m_vertexColours[vIndex];}
    inline uint32_t getVertexColour(uint32_t vIndex) {return m_vertexColours[vIndex];} 
    inline uint32_t getVertexColour(const Vertex& v) const {return m_vertexColours[v.index];}
    inline uint32_t getVertexColour(const Vertex& v) {return m_vertexColours[v.index];} 

    inline void setVertexColour(uint32_t vIndex, uint32_t colour) {
        m_vertexColours[vIndex] = colour;
    }

    inline void setVertexColour(const Vertex& v, uint32_t colour) {
        m_vertexColours[v.index] = colour;
    } 

    bool isAnyColourHighlighted() const {return m_singleColourHighlight.anyColourHighlighted;}
    uint32_t getHighlightedColour() const {return m_singleColourHighlight.highlightedColour;}

    void highlightColour(uint32_t newHighlightedColour) {m_singleColourHighlight = {newHighlightedColour};}
    void disableColourHighlighting() {m_singleColourHighlight = {};}

protected:

    struct SingleColourHighlight {
        bool anyColourHighlighted;
        uint32_t highlightedColour;

        SingleColourHighlight() : anyColourHighlighted{false} {}
        SingleColourHighlight(uint32_t highlightedColour) : anyColourHighlighted{true}, highlightedColour{highlightedColour} {}
    };

    // `0` is treated as a lack of colour, in a fully coloured graph all vertices should be assigned `1` or more. 
    std::vector<uint32_t> m_vertexColours; 
    SingleColourHighlight m_singleColourHighlight;

}; 

}

#endif