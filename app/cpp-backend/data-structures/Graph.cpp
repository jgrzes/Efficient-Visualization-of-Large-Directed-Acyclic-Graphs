#include "Graph.h"

#include "Partially_Disabled_Graph.h"

namespace data_structures {

Graph::Graph(uint32_t numberOfVertex, const ArgEdgeList& edgeList, bool isDirected) :
    GraphInterface{}, m_isDirected{isDirected} {

    m_V.reserve(numberOfVertex);
    for (size_t i=0; i<numberOfVertex; ++i) {
        m_V.emplace_back(i);
    }

    m_E = AdjList(numberOfVertex, VertexAdjSet{});
    m_ER = AdjList(numberOfVertex, VertexAdjSet{});
    if (m_isDirected) {
        for (const auto [u, v] : edgeList) {
            m_E[u].emplace(v);
            m_ER[v].emplace(u);
        }
    } else {
        for (const auto [u, v] : edgeList) {
            if (u > v) continue; 
            m_E[u].emplace(v);
            m_E[v].emplace(u);
            m_ER[v].emplace(u);
            m_ER[u].emplace(v);
        }
    } 
    if (!m_isDirected) return;
    createRootsList();
    createLeavesList();
}


Graph::Graph(uint32_t numberOfVertex, const ArgAdjList& adjList, bool isDirected) :
    GraphInterface{}, m_isDirected{isDirected} {

    m_V.reserve(numberOfVertex);
    for (size_t i=0; i<numberOfVertex; ++i) {
        m_V.emplace_back(i);
    }

    m_E = AdjList(numberOfVertex, VertexAdjSet{});
    m_ER = AdjList(numberOfVertex, VertexAdjSet{});
    if (m_isDirected) {
        for (size_t u=0; u<adjList.size(); ++u) {
            for (const auto v : adjList[u]) {
                m_E[u].emplace(v);
                m_ER[v].emplace(u);
            }
        }
    } else {
        for (size_t u=0; u<adjList.size(); ++u) {
            for (const auto v : adjList[u]) {
                if (u > v) continue;
                m_E[u].emplace(v);
                m_E[v].emplace(u);
                m_ER[v].emplace(u);
                m_ER[u].emplace(v);
            }
        }
    }
    if (!m_isDirected) return;
    createRootsList();
    createLeavesList();
}


void Graph::createRootsList() {
    m_rootList.clear();
    size_t rootCount = 0;
    for (size_t u=0; u<m_V.size(); ++u) {
        if (m_ER[u].empty()) ++rootCount;
    }
    m_rootList.reserve(rootCount);
    for (size_t u=0; u<m_V.size(); ++u) {
        if (m_ER[u].empty()) m_rootList.emplace_back(u);
    }
}


void Graph::createLeavesList() {
    m_leavesList.clear();
    size_t leavesCount = 0;
    for (size_t u=0; u<m_V.size(); ++u) {
        if (m_ER[u].empty()) ++leavesCount;
    }
    m_leavesList.reserve(leavesCount);
    for (size_t u=0; u<m_V.size(); ++u) {
        if (m_E[u].empty()) m_leavesList.emplace_back(u);
    }
}

}