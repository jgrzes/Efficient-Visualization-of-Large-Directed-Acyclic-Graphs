#ifndef DATA_STRUCTURES__GRAPH_H
#define DATA_STRUCTURES__GRAPH_H

#include "Graph_Interface.h"

namespace data_structures {

using size_t = std::size_t;
using ArgEdgeList = std::vector<std::pair<uint32_t, uint32_t>>;
// TODO: create a more optimized data structure for AdjList
using ArgAdjList = std::vector<std::unordered_set<uint32_t>>; 

class PartiallyDisabledGraph;

// TODO: Change the implementation to adhere to what is written below.
// For now everything is just added to the `m_V`, `m_E` and `m_ER`. 
//
// Graph stores vertices in two different modes - vertices created in constructor
// are kept in `m_V` (and their neighbourhoods in `m_E` and `m_ER`).
// Vertices added to the graph after it has been constructed are stored in `m_VAdd`
// (and their neighbourhoods are kept in `m_EAdd` and `m_ERAdd`).
// Such a solution is employed mainly to avoid memory moving for vertices in created at construction time.
class Graph : public GraphInterface {

public:

    friend GraphInterface;
    friend PartiallyDisabledGraph;

    using Vertex = GraphInterface::Vertex;
    using Neighbourhood = GraphInterface::Neighbourhood;
    using VertexAdjSet = std::unordered_set<uint32_t>;
    using AdjList = std::vector<VertexAdjSet>;

    Graph(uint32_t numberOfVertex, const ArgEdgeList& edgeList, bool isDirected = true);
    Graph(uint32_t numberOfVertex, const ArgAdjList& adjList, bool isDirected = true);

    const Graph& getUnderlyingGraphImpl() const override {return *this;}
    Graph& getUnderlyingGraphImpl() override {return *this;}

    size_t getVertexCount() const override {return m_V.size();}
    bool isDirected() const override {return m_isDirected;}

    const Vertex& getVertex(uint32_t vIndex) const override {return m_V[vIndex];}
    Vertex& getVertex(uint32_t vIndex) override {return m_V[vIndex];}
    const std::vector<uint32_t>& getRootList() const override {return m_rootList;}
    const std::vector<uint32_t>& getLeavesList() const override {return m_leavesList;}

    void setLevelForVertex(uint32_t vIndex, int level) override {m_V[vIndex].level = level;}

    void addNewEdge(uint32_t uIndex, uint32_t vIndex) override {m_E[uIndex].emplace(vIndex); m_ER[vIndex].emplace(uIndex);}
    void addNewEdge(const Vertex& u, const Vertex& v) override {addNewEdge(u.index, v.index);}
    void addNewVertex() override;

protected:

    void createRootsList();
    void createLeavesList();

    const VertexAdjSet& NAsVertexAdjSet(uint32_t vIndex) const override {return m_E[vIndex];}
    VertexAdjSet& NAsVertexAdjSet(uint32_t vIndex) override {return m_E[vIndex];}

    const VertexAdjSet& NRAsVertexAdjSet(uint32_t vIndex) const override {return m_ER[vIndex];}
    VertexAdjSet& NRAsVertexAdjSet(uint32_t vIndex) override {return m_ER[vIndex];}

    std::vector<Vertex> m_V;
    AdjList m_E;
    AdjList m_ER; // reversed adjecency list
    bool m_isDirected;
    mutable std::vector<uint32_t> m_rootList;
    mutable std::vector<uint32_t> m_leavesList;

    // Fields for additional vertices 
    std::vector<Vertex> m_VAdd;
    AdjList m_EAdd;
    AdjList m_ERAdd;

}; 

}

#endif 