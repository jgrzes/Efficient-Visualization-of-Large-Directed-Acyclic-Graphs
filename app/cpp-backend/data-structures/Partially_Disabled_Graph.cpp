#include "Partially_Disabled_Graph.h"

#include <stdexcept>
#include <deque>
#include <unordered_set>

#define _emplaceInQueue(_v, _q, _inQ) \
    do { \
        if (_inQ.find(_v) != _inQ.end()) { \ 
            _inQ.emplace(_v); \
            _q.emplace_back(_v); \ 
        } \    
    } while (false)    

namespace data_structures {

bool PartiallyDisabledGraph::PartiallyDisabledNeighbourhoodView::shouldIgnoreAndJumpForward(
    const PartiallyDisabledGraph::NeighbourhoodIterator& it
) const {

    // if (auto castedOwner = dynamic_cast<const PartiallyDisabledGraph*>(m_owner);
    //     castedOwner != nullptr) {

    //     return castedOwner->m_disabledFlags[*it];
    // } else {
    //     throw std::runtime_error{
    //         "Partially Disabled Neighbourhood View error: owner is not of type PartiallyDisabledGraph"
    //     };
    // }
    if (reachedEnd(it)) return false;
    return static_cast<const PartiallyDisabledGraph*>(m_owner)->m_disabledFlags[*it];
}


PartiallyDisabledGraph::PartiallyDisabledGraph(Graph* graphPtr, GraphStoringPolicy storingPolicy) try :
    m_storingPolicy{storingPolicy},
    m_disabledFlags{[graphPtr]() -> std::vector<bool>{
        if (graphPtr == nullptr) throw std::runtime_error{"PD Graph View error: Passed nullptr as graphPtr to graph view"};
        return std::vector<bool>(graphPtr->getVertexCount(), false);
    }()}, 
    m_graphView{[graphPtr, storingPolicy]() -> GraphView{
        switch (storingPolicy) {
            case GraphStoringPolicy::RAW_POINTER_NON_OWNING:
                return graphPtr;
            case GraphStoringPolicy::SHARED_POINTER:
                return std::move(std::shared_ptr<Graph>(graphPtr));
            default:
                throw std::runtime_error{"PD Graph View error: Unknown storing policy value specified"};        
        return nullptr;
        }    
    }()} {} catch (const std::runtime_error& err) {
        std::throw_with_nested(std::move(err));
    }
    
    
PartiallyDisabledGraph::PartiallyDisabledGraph(
    Graph* graphPtr, const std::vector<uint32_t>& verticesToDisable, GraphStoringPolicy storingPolicy
) : PartiallyDisabledGraph{graphPtr, storingPolicy} {
    for (const auto v : verticesToDisable) {
        m_disabledFlags[v] = true;
        // std::cout << "v: " << v << "\n"; 
    }
}


PartiallyDisabledGraph::PartiallyDisabledGraph(GraphInterface& graph, GraphImplCopyingMode graphImplCopyingMode) :
    m_graphView{nullptr} {

    PartiallyDisabledGraph* pdGraphPtr = dynamic_cast<PartiallyDisabledGraph*>(&graph);
    if (graphImplCopyingMode == GraphImplCopyingMode::DEEP_COPY) {
        m_graphView = GraphView(new Graph(graph.getUnderlyingGraphImpl()));
        m_storingPolicy = GraphStoringPolicy::RAW_POINTER_OWNING;
    } else {
        if (pdGraphPtr != nullptr) {

            if (pdGraphPtr->getGraphStroingPolicy() == GraphStoringPolicy::RAW_POINTER_OWNING) {
                Graph* graphImplPtr = &graph.getUnderlyingGraphImpl();
                m_storingPolicy = GraphStoringPolicy::SHARED_POINTER;
                pdGraphPtr->m_storingPolicy = GraphStoringPolicy::SHARED_POINTER;
                m_graphView = GraphView(std::shared_ptr<Graph>(graphImplPtr));
                pdGraphPtr->m_graphView = GraphView(std::shared_ptr<Graph>(graphImplPtr));
            } else {
                m_storingPolicy = pdGraphPtr->m_storingPolicy;
                m_graphView = GraphView(pdGraphPtr->m_graphView);      
            }
        } else {
            m_graphView = &graph.getUnderlyingGraphImpl();
            m_storingPolicy = GraphStoringPolicy::RAW_POINTER_NON_OWNING;
        }
    }
    if (pdGraphPtr == nullptr) {
        m_disabledFlags = std::vector<bool>(getVertexCount(), false);
        return;
    }
    m_disabledFlags = pdGraphPtr->m_disabledFlags;
}


const Graph& PartiallyDisabledGraph::getUnderlyingGraphImpl() const {
    Graph* underlyingGraphImplPtr = m_graphView.operator->();
    if (underlyingGraphImplPtr == nullptr) {
        throw std::runtime_error{"PD Graph error: stored graph pointer is nullptr"};
    }
    return *underlyingGraphImplPtr;
}


Graph& PartiallyDisabledGraph::getUnderlyingGraphImpl() {
    return const_cast<Graph&>(
        const_cast<const PartiallyDisabledGraph*>(this)->getUnderlyingGraphImpl()
    );
}


const PartiallyDisabledGraph::Neighbourhood PartiallyDisabledGraph::N(uint32_t vIndex) const {
    return PartiallyDisabledGraph::Neighbourhood(
        new PartiallyDisabledNeighbourhoodView(this, NAsVertexAdjSet(vIndex))
    );
}


PartiallyDisabledGraph::Neighbourhood PartiallyDisabledGraph::N(uint32_t vIndex) {
    return PartiallyDisabledGraph::Neighbourhood(
        new PartiallyDisabledNeighbourhoodView(this, NAsVertexAdjSet(vIndex))
    );
}


const PartiallyDisabledGraph::Neighbourhood PartiallyDisabledGraph::N(const Vertex& v) const {
    return PartiallyDisabledGraph::Neighbourhood(
        new PartiallyDisabledNeighbourhoodView(this, NAsVertexAdjSet(v.index))
    );
}


const PartiallyDisabledGraph::Neighbourhood PartiallyDisabledGraph::NR(uint32_t vIndex) const {
    return PartiallyDisabledGraph::Neighbourhood(
        new PartiallyDisabledNeighbourhoodView(this, NRAsVertexAdjSet(vIndex))
    );
}


PartiallyDisabledGraph::Neighbourhood PartiallyDisabledGraph::NR(uint32_t vIndex) {
    return PartiallyDisabledGraph::Neighbourhood(
        new PartiallyDisabledNeighbourhoodView(this, NRAsVertexAdjSet(vIndex))
    );
}


const PartiallyDisabledGraph::Neighbourhood PartiallyDisabledGraph::NR(const Vertex& v) const {
    return PartiallyDisabledGraph::Neighbourhood(
        new PartiallyDisabledNeighbourhoodView(this, NRAsVertexAdjSet(v.index))
    );
}


std::vector<uint32_t> PartiallyDisabledGraph::getDisabledVerticesList() const {
    std::vector<uint32_t> disabledVerticesList;
    size_t disabledVerticesCount = 0;
    for (const auto d : m_disabledFlags) if (d) ++disabledVerticesCount; 
    disabledVerticesList.reserve(disabledVerticesCount);
    for (size_t u=0; u<m_disabledFlags.size(); ++u) {
        if (m_disabledFlags[u]) disabledVerticesList.emplace_back(u);
    }

    return disabledVerticesList;
}


void PartiallyDisabledGraph::disableVertices(const std::vector<uint32_t>& verticesToDisable) {
    for (const auto v : verticesToDisable) m_disabledFlags[v] = true;
}


void PartiallyDisabledGraph::enableVertices(const std::vector<uint32_t>& verticesToEnable) {
    for (const auto v : verticesToEnable) m_disabledFlags[v] = false;
}


void PartiallyDisabledGraph::changeStateOfVertices(const std::vector<std::pair<uint32_t, bool>>& newVerticesState) {
    for (const auto [v, newState] : newVerticesState) {
        m_disabledFlags[v] = newState;
    }
}


PartiallyDisabledGraph::~PartiallyDisabledGraph() {
    if (m_storingPolicy == GraphStoringPolicy::RAW_POINTER_OWNING) {
        delete m_graphView.operator->();
    }
}


void PartiallyDisabledGraph::recomputeRootsIfNeeded() const {
    // TODO: Try to fix the better implementation
    auto& rootList = const_cast<Graph&>(getUnderlyingGraphImpl()).m_rootList;
    rootList.clear();
    uint32_t n = getVertexCount();
    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        if (NR(uIndex).size() == 0) rootList.emplace_back(uIndex);
    }

    return;

    // #define _extractFront(_v, _q) (_v = _q.front(), _q.pop_front())
    // std::deque<uint32_t> Q;
    // std::unordered_set<uint32_t> vertexIndicesInQ;
    // std::unordered_set<uint32_t> verticesToIgnoreIndices;
    // auto& underlyingGraphImpl = const_cast<Graph&>(getUnderlyingGraphImpl());
    // auto& rootList = underlyingGraphImpl.m_rootList;
    // std::vector<uint32_t> enabledPredsOfVertex;

    // for (auto it=rootList.begin(); it!=rootList.end(); ) {
    //     uint32_t rIndex = *it;
    //     bool rDisabled = m_disabledFlags[rIndex];
    //     auto Nrr = NR(rIndex);
    //     enabledPredsOfVertex.clear();
    //     for (const auto pIndex : Nrr) {
    //         enabledPredsOfVertex.emplace_back(pIndex);
    //     }
    //     if (!rDisabled && enabledPredsOfVertex.empty()) {
    //         ++it;
    //         verticesToIgnoreIndices.emplace(rIndex);
    //         vertexIndicesInQ.emplace(rIndex);
    //     } else if (!rDisabled) {
    //         for (const auto pIndex : enabledPredsOfVertex) {
    //             _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
    //         }
    //         it = rootList.erase(it);
    //     } else if (rDisabled) {
    //         for (const auto pIndex : enabledPredsOfVertex) {
    //             _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
    //         }
    //         for (const auto sIndex : N(rIndex)) {
    //             _emplaceInQueue(sIndex, Q, vertexIndicesInQ);
    //         }
    //         it = rootList.erase(it);
    //     }
    // }

    // while (!Q.empty()) {
    //     uint32_t uIndex;
    //     _extractFront(uIndex, Q);
    //     if (verticesToIgnoreIndices.find(uIndex) != verticesToIgnoreIndices.end()) continue;
    //     verticesToIgnoreIndices.emplace(uIndex);
    //     enabledPredsOfVertex.clear();
    //     for (const auto pIndex : NR(uIndex)) {
    //         enabledPredsOfVertex.emplace_back(pIndex);
    //     }
    //     if (enabledPredsOfVertex.empty()) {
    //         rootList.emplace_back(uIndex);
    //     } else {
    //         for (const auto pIndex : enabledPredsOfVertex) {
    //             _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
    //         }
    //     }
    // }
    // #undef _extractFront
}


void PartiallyDisabledGraph::recomputeLeavesIfNeeded() const {
    #define _extractFront(_v, _q) (_v = _q.front(), _q.pop_front())
    std::deque<uint32_t> Q;
    std::unordered_set<uint32_t> vertexIndicesInQ;
    std::unordered_set<uint32_t> verticesToIgnoreIndices;
    auto& underlyingGraphImpl = const_cast<Graph&>(getUnderlyingGraphImpl());
    auto& leavesList = underlyingGraphImpl.m_leavesList;
    std::vector<uint32_t> enabledSuccsOfVertex;
    for (auto it=leavesList.begin(); it!=leavesList.end(); ) {
        uint32_t lIndex = *it;
        bool lDisabled = m_disabledFlags[lIndex];
        enabledSuccsOfVertex.clear();
        for (const auto sIndex : N(lIndex)) {
            enabledSuccsOfVertex.emplace_back(sIndex);
        }
        if (!lDisabled && enabledSuccsOfVertex.empty()) {
            ++it;
            verticesToIgnoreIndices.emplace(lIndex);
            vertexIndicesInQ.emplace(lIndex);
        } else if (!lDisabled) {
            for (const auto pIndex : enabledSuccsOfVertex) {
                _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
            }
            it = leavesList.erase(it);
        } else if (lDisabled) {
            for (const auto pIndex : enabledSuccsOfVertex) {
                _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
            }
            for (const auto pIndex : NR(lIndex)) {
                _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
            }
            it = leavesList.erase(it);
        }
    }

    while (!Q.empty()) {
        uint32_t uIndex;
        _extractFront(uIndex, Q);
        if (verticesToIgnoreIndices.find(uIndex) != verticesToIgnoreIndices.end()) continue;
        verticesToIgnoreIndices.emplace(uIndex);
        enabledSuccsOfVertex.clear();
        for (const auto pIndex : N(uIndex)) {
            enabledSuccsOfVertex.emplace_back(pIndex);
        }
        if (enabledSuccsOfVertex.empty()) {
            leavesList.emplace_back(uIndex);
        } else {
            for (const auto pIndex : enabledSuccsOfVertex) {
                _emplaceInQueue(pIndex, Q, vertexIndicesInQ);
            }
        }
    }
    #undef _extractFront
}


Graph* PartiallyDisabledGraph::GraphView::operator->() const {
    return const_cast<GraphView*>(this)->operator->();
}


// TODO: consider simplifying if such implementation proves inefficient
Graph* PartiallyDisabledGraph::GraphView::operator->() {
    BaseClass& thisRefAsBaseClass = static_cast<BaseClass&>(*this);
    return (std::holds_alternative<Graph*>(thisRefAsBaseClass)) 
        ? std::get<Graph*>(thisRefAsBaseClass)
        : std::get<std::shared_ptr<Graph>>(thisRefAsBaseClass).get();
}

#undef _emplaceInQueue

}