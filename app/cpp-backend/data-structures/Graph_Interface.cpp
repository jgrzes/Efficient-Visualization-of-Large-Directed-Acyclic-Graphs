#include "Graph_Interface.h"

#include "Graph.h"
#include "Coloured_Graph.h"

namespace data_structures {

using NeighbourhoodIterator = GraphInterface::NeighbourhoodIterator;      


bool NeighbourhoodIterator::operator!=(const NeighbourhoodIterator& otherBaseNeighbourhoodIt) const {
    return m_it != otherBaseNeighbourhoodIt.m_it;
}


bool NeighbourhoodIterator::operator==(const NeighbourhoodIterator& otherBaseNeighbourhoodIt) const {
    return m_it == otherBaseNeighbourhoodIt.m_it;
}


NeighbourhoodIterator& NeighbourhoodIterator::operator++() {
    do {
        ++m_it;
    } while (m_owner->shouldIgnoreAndJumpForward(*this));
    return *this;
}


NeighbourhoodIterator NeighbourhoodIterator::operator++(int) {
    auto beforeIncrementing = *this;
    do {
        ++m_it;
    } while (m_owner->shouldIgnoreAndJumpForward(*this));
    return std::move(beforeIncrementing);
}


NeighbourhoodIterator::NeighbourhoodIterator(const BaseNeighbourhoodView* const owner, VertexAdjSet& N) :
    m_owner{owner}, m_it{std::move(N.begin())} {}
    

NeighbourhoodIterator::NeighbourhoodIterator(const BaseNeighbourhoodView* const owner, VertexAdjSet& N, size_t n) :
    m_owner{owner}, m_it{N.begin()} {

    if (n == N.size()) m_it = N.end();
    else if (n > N.size()) {
        throw std::runtime_error{
            "Base Neighbourhood It error: trying to create an object breaching the container"
        };
    } else m_it = std::next(std::move(m_it), n); 
}  


const GraphInterface::Neighbourhood GraphInterface::N(uint32_t vIndex) const {
    return GraphInterface::Neighbourhood(
        new BaseNeighbourhoodView(this, NAsVertexAdjSet(vIndex))
    );
}


GraphInterface::Neighbourhood GraphInterface::N(uint32_t vIndex) {
    return GraphInterface::Neighbourhood(
        new BaseNeighbourhoodView(this, NAsVertexAdjSet(vIndex))
    );
}


const GraphInterface::Neighbourhood GraphInterface::N(const Vertex& v) const {
    return GraphInterface::Neighbourhood(
        new BaseNeighbourhoodView(this, NAsVertexAdjSet(v.index))
    );
}


const GraphInterface::Neighbourhood GraphInterface::NR(uint32_t vIndex) const {
    return GraphInterface::Neighbourhood(
        new BaseNeighbourhoodView(this, NRAsVertexAdjSet(vIndex))
    );
}


GraphInterface::Neighbourhood GraphInterface::NR(uint32_t vIndex) {
    return GraphInterface::Neighbourhood(
        new BaseNeighbourhoodView(this, NRAsVertexAdjSet(vIndex))
    );
}


const GraphInterface::Neighbourhood GraphInterface::NR(const Vertex& v) const {
    return GraphInterface::Neighbourhood(
        new BaseNeighbourhoodView(this, NRAsVertexAdjSet(v.index))
    );
}


std::ostream& operator<<(std::ostream& os, const GraphInterface& graph) {
    os << "{\n";
    for (size_t u=0; u<graph.getVertexCount(); ++u) {
        if (shouldSkipVertex(graph, u)) {
            std::cout << " {" << u << " disabled}\n";
            continue;
        }
        auto uLevel = graph.getVertex(u).level;
        os << " {" << u << ": level(u) = " << uLevel << ", N(u) = {";
        const auto Nu = graph.N(u);
        for (auto it=Nu.begin(); it!=Nu.end(); ) {
            os << *it << ((++it == Nu.end()) ? "" : ", "); 
        }
        os << "}}\n";
    }
    os << "}";
    return os;
}


const GraphInterface::VertexAdjSet& GraphInterface::NAsVertexAdjSet(uint32_t vIndex) const {
    return getUnderlyingGraphImpl().NAsVertexAdjSet(vIndex);
}

    
GraphInterface::VertexAdjSet& GraphInterface::NAsVertexAdjSet(uint32_t vIndex) {
    return getUnderlyingGraphImpl().NAsVertexAdjSet(vIndex);
}


const GraphInterface::VertexAdjSet& GraphInterface::NRAsVertexAdjSet(uint32_t vIndex) const {
    auto nrvIndex = getUnderlyingGraphImpl().NRAsVertexAdjSet(vIndex);
    // std::cout << "v = " << vIndex << ":\n";
    // for (auto aIndex : nrvIndex) {
        // std::cout << aIndex << " ";
    // }
    // std::cout << "\n";
    return getUnderlyingGraphImpl().NRAsVertexAdjSet(vIndex);
}


GraphInterface::VertexAdjSet& GraphInterface::NRAsVertexAdjSet(uint32_t vIndex) {
    auto nrvIndex = getUnderlyingGraphImpl().NRAsVertexAdjSet(vIndex);
    // std::cout << "v = " << vIndex << ":\n";
    // for (auto aIndex : nrvIndex) {
    //     std::cout << aIndex << " ";
    // }
    // std::cout << "\n";
    return getUnderlyingGraphImpl().NRAsVertexAdjSet(vIndex);
}

}