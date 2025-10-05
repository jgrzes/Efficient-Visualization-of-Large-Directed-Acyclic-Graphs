#include "edge_processing_functions.h"

namespace graph_preprocessing {

PDGraph removeDanglingPathsFromGraph(const GraphInterface& graph, PDGraph::GraphStoringPolicy storingPolicy) {
    const std::vector<uint32_t>& leavesIndices = graph.getLeavesList();
    std::vector<uint32_t> verticesToRemoveIndices;
    for (const auto vIndex : leavesIndices) {
        const auto& Nrv = graph.NR(vIndex);
        if (Nrv.size() != 1) continue;
        uint32_t wIndex = *Nrv.begin();
        const auto& Nw = graph.N(wIndex);
        if (Nw.size() != 1) continue;
        verticesToRemoveIndices.emplace_back(vIndex);

        uint32_t xIndex;
        do {
            const auto& Nrw = graph.NR(wIndex);
            const auto& Nw = graph.N(wIndex);
            if (Nw.size() == 1 && Nrw.size() == 1) {
                xIndex = *Nrw.begin();
                if (graph.N(xIndex).size() == 1) {
                    verticesToRemoveIndices.emplace_back(wIndex);
                    wIndex = *Nrw.begin();
                    continue;
                }
            }
            break;
        } while (true);
    }

    return PDGraph{
        const_cast<Graph*>(&graph.getUnderlyingGraphImpl()), 
        verticesToRemoveIndices, storingPolicy
    };
}


std::vector<size_t> findDisputableEdgesPerLevelCounts(const GraphInterface& graph) {
    uint32_t numberOfLevels = 0;
    for (size_t uIndex=0; uIndex<graph.getVertexCount(); ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto& u = graph.getVertex(uIndex);
        if (!u.seeIfLevelComputed()) { 
            throw std::runtime_error{
                "Disputable edge finding error: vertice with index" + 
                std::to_string(uIndex) + " does not have its level computed"
            };
        }
        numberOfLevels = std::max(numberOfLevels, static_cast<uint32_t>(u.level+1));
    }
    std::vector<size_t> disputableEdgesPerLevelCounts(numberOfLevels, 0);
    for (uint32_t uIndex=0; uIndex<graph.getVertexCount(); ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto& Nru = graph.NR(uIndex);
        if (Nru.size() <= 1) continue;
        for (const auto wIndex : Nru) {
            ++disputableEdgesPerLevelCounts[graph.getVertex(wIndex).level];
        }
    }
    return std::move(disputableEdgesPerLevelCounts);
}


ArrayOfArrays<Edge> findDisputableEdgesPerLevel(const GraphInterface& graph) {
    auto disputableEdgesPerLevelCountsSizeT = findDisputableEdgesPerLevelCounts(graph);
    size_t numberOfLevels = disputableEdgesPerLevelCountsSizeT.size();
    ArrayOfArrays<Edge> disputableEdgesPerLevel(std::vector<size_t>(numberOfLevels, 0), disputableEdgesPerLevelCountsSizeT);
    std::vector<ArrayOfArrays<Edge>::NestedArrayView> levelArraysViews;
    levelArraysViews.reserve(numberOfLevels);
    for (size_t level=0; level<numberOfLevels; ++level) {
        levelArraysViews.emplace_back(disputableEdgesPerLevel.getNestedArrayView(level));
    }

    for (uint32_t uIndex=0; uIndex<graph.getVertexCount(); ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto& Nru = graph.NR(uIndex);
        if (Nru.size() <= 1) continue;
        for (const auto wIndex : Nru) {
            int64_t wLevel = graph.getVertex(wIndex).level;
            levelArraysViews[wLevel].push_back({wIndex, uIndex});
        }
    }

    return disputableEdgesPerLevel;
}


std::vector<size_t> findVerticesPerLevelsCounts(const GraphInterface& graph) {
    size_t n = graph.getVertexCount();
    uint32_t numberOfLevels = 0;
    for (size_t uIndex=0; uIndex<n; ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto& u = graph.getVertex(uIndex);
        if (!u.seeIfLevelComputed()) {
            throw std::runtime_error{
                "Vs per levels finding error: vertice with index " +
                std::to_string(uIndex) + " does not have its level computed" 
            };
        }
        numberOfLevels = std::max(numberOfLevels, static_cast<uint32_t>(u.level+1));
    }
    std::vector<size_t> verticesPerLevelsCounts(numberOfLevels, 0);
    for (size_t uIndex=0; uIndex<n; ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto& u = graph.getVertex(uIndex);
        ++verticesPerLevelsCounts[u.level];
    }
    
    return std::move(verticesPerLevelsCounts);
}


ArrayOfArrays<uint32_t> findVerticesPerLevels(const GraphInterface& graph) {
    auto verticesPerLevelsCount = findVerticesPerLevelsCounts(graph);
    size_t numberOfLevels = verticesPerLevelsCount.size();
    ArrayOfArrays<uint32_t> verticesPerLevels(std::vector<size_t>(numberOfLevels, 0), verticesPerLevelsCount);
    std::vector<ArrayOfArrays<uint32_t>::NestedArrayView> levelArrayViews;
    levelArrayViews.reserve(numberOfLevels);
    for (size_t level=0; level<numberOfLevels; ++level) {
        levelArrayViews.emplace_back(verticesPerLevels.getNestedArrayView(level));
    }

    for (uint32_t uIndex=0; uIndex<graph.getVertexCount(); ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto& u = graph.getVertex(uIndex);
        levelArrayViews[u.level].push_back(u.index);
    }

    return verticesPerLevels;
}

}