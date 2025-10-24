#include "edge_and_vertex_processing_functions.h"

namespace graph_preprocessing {

PDGraph removeDanglingPathsFromGraph(const GraphInterface& graph, PDGraph::GraphStoringPolicy storingPolicy) {
    const std::vector<uint32_t>& leavesIndices = graph.getLeavesList();
    std::vector<uint32_t> verticesToRemoveIndices;
    for (const auto vIndex : leavesIndices) {
        const auto& Nrv = graph.NR(vIndex);
        if (Nrv.size() != 1) continue;
        // std::cout << "Leaf: " << vIndex << "\n";
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

    // for (const auto vIndex : verticesToRemoveIndices) {
    //     std::cout << vIndex << "\n";
    // }
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
    // std::cout << "In counts: \n";
    std::vector<size_t> disputableEdgesPerLevelCounts(numberOfLevels, 0);
    for (uint32_t uIndex=0; uIndex<graph.getVertexCount(); ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto Nru = graph.NR(uIndex);
        if (Nru.size() <= 1) continue;
        // std::cout << "u: " << uIndex << "\n";
        for (const auto wIndex : Nru) {
            // std::cout << "w = " << wIndex << " " << graph.getVertex(wIndex).level << "\n";
            ++disputableEdgesPerLevelCounts[graph.getVertex(wIndex).level];
        }
    }
    // std::cout << "Overall counts: " << "\n";
    // for (const size_t iSize : disputableEdgesPerLevelCounts) {
        // std::cout << iSize << " ";
    // }
    // std::cout << "\n";
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

    // std::cout << "In array of arrays creation: \n";
    for (uint32_t uIndex=0; uIndex<graph.getVertexCount(); ++uIndex) {
        // std::cout << "\nuIndex = " << uIndex << "\n";
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        const auto Nru = graph.NR(uIndex);
        if (Nru.size() <= 1) continue;
        // std::cout << "u: " << uIndex << "\n";
        for (const auto wIndex : Nru) {
            // std::cout << "wIndex = " << wIndex << "\n";
            // std::cout << "w = " << wIndex << " " << graph.getVertex(wIndex).level << "\n";
            int64_t wLevel = graph.getVertex(wIndex).level;
            // std::cout << "wLevel = " << wLevel << ", levels = " << levelArraysViews.size() << "\n";
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
        levelArrayViews[u.level].push_back(uIndex);
    }

    return verticesPerLevels;
}


std::vector<size_t> findEnabledDisputableEdgesCountsFromContainer(
    const ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel, 
    const GraphInterface& graph
) {
    
    size_t n = disputableEdgesPerLevel.getNumberOfNestedArrays();
    std::vector<size_t> enabledVerticesCountsPerLevel;
    enabledVerticesCountsPerLevel.reserve(n);
    for (size_t i=0; i<n; ++i) {
        size_t& countAtI = enabledVerticesCountsPerLevel.emplace_back(0);
        auto arrayViewI = const_cast<ArrayOfArraysInterface<Edge>&>(disputableEdgesPerLevel).getNestedArrayView(i);
        size_t m = arrayViewI.size();
        for (size_t j=0; j<m; ++j) {
            auto [uIndex, vIndex] = arrayViewI[j];
            if (data_structures::shouldSkipVertex(graph, uIndex) || data_structures::shouldSkipVertex(graph, vIndex)) continue;
            ++countAtI;
        }
    }

    return std::move(enabledVerticesCountsPerLevel);
}


ArrayOfArrays<Edge> findEnabledDisputableEdgesFromErodingContainer(
    ArrayOfArraysInterface<Edge>& erodingDisputableEdgesPerLevel, 
    const GraphInterface& graph
) {

    std::vector<size_t> enabledVerticesCountsPerLevel = findEnabledDisputableEdgesCountsFromContainer(
        const_cast<const ArrayOfArraysInterface<Edge>&>(erodingDisputableEdgesPerLevel), graph
    );
    size_t n = erodingDisputableEdgesPerLevel.getNumberOfNestedArrays();
    ArrayOfArrays<Edge> enabledDisputableEdgesPerLevel(std::vector<size_t>(n, 0), enabledVerticesCountsPerLevel);
    for (size_t i=0; i<n; ++i) {
        auto arrayViewI = enabledDisputableEdgesPerLevel.getNestedArrayView(i);
        auto erodingViewI = erodingDisputableEdgesPerLevel.getNestedArrayView(i);
        size_t m = erodingViewI.size();
        size_t j = 0;
        while (j < m) {
            auto [uIndex, vIndex] = erodingViewI[j];
            if (data_structures::shouldSkipVertex(graph, uIndex) || data_structures::shouldSkipVertex(graph, vIndex)) {
                ++j;
            } else {
                arrayViewI.emplace_back(uIndex, vIndex);
                erodingViewI.eraseBySwappingWithLast(j);
                m = erodingViewI.size();
            }
        }
    }

    return enabledDisputableEdgesPerLevel;
}


std::vector<size_t> findEnabledVerticesCountsFromContainer(
    const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    const GraphInterface& graph
) {
    
    size_t n = verticesPerLevel.getNumberOfNestedArrays();
    std::vector<size_t> enabledVerticesCountsPerLevel;
    enabledVerticesCountsPerLevel.reserve(n);
    for (size_t i=0; i<n; ++i) {
        size_t& countAtI = enabledVerticesCountsPerLevel.emplace_back(0);
        auto arrayViewI = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(i);
        size_t m = arrayViewI.size();
        for (size_t j=0; j<m; ++j) {
            if (data_structures::shouldSkipVertex(graph, arrayViewI[j])) continue;
            ++countAtI;
        }
    }

    return std::move(enabledVerticesCountsPerLevel);
}


ArrayOfArrays<uint32_t> findEnabledVerticesFromErodingContainer(
    ArrayOfArraysInterface<uint32_t>& erodingVerticesPerLevel, 
    const GraphInterface& graph
) {

    std::vector<size_t> enabledVerticesCountsPerLevel = findEnabledVerticesCountsFromContainer(
        const_cast<const ArrayOfArraysInterface<uint32_t>&>(erodingVerticesPerLevel), graph
    );
    size_t n = erodingVerticesPerLevel.getNumberOfNestedArrays();
    ArrayOfArrays<uint32_t> enabledVerticesPerLevel(std::vector<size_t>(n, 0), enabledVerticesCountsPerLevel);
    for (size_t i=0; i<n; ++i) {
        auto arrayViewI = enabledVerticesPerLevel.getNestedArrayView(i);
        auto erodingViewI = erodingVerticesPerLevel.getNestedArrayView(i);
        size_t m = erodingViewI.size();
        size_t j = 0;
        while (j < m) {
            uint32_t vIndex = erodingViewI[j];
            if (data_structures::shouldSkipVertex(graph, vIndex)) {
                ++j;
            } else {
                arrayViewI.emplace_back(vIndex);
                erodingViewI.eraseBySwappingWithLast(j);
                m = erodingViewI.size();
            }
        }
    }

    return enabledVerticesPerLevel;
}


std::vector<size_t> findVerticesPerLevelsCounts(
    const std::vector<uint32_t>& verticesPerLevelVector, 
    const GraphInterface& graph
) {

    size_t n = verticesPerLevelVector.size();
    uint32_t numberOfLevels = 0;
    for (uint32_t i=0; i<n; ++i) {
        uint32_t vIndex = verticesPerLevelVector[i];
        if (data_structures::shouldSkipVertex(graph, vIndex)) continue;
        numberOfLevels = std::max(
            numberOfLevels, 
            static_cast<uint32_t>(graph.getVertex(vIndex).level+1)
        );
    }

    std::vector<size_t> verticesPerLevelCounts(numberOfLevels, 0);
    for (uint32_t vIndex : verticesPerLevelVector) {
        if (data_structures::shouldSkipVertex(graph, vIndex)) continue;
        ++verticesPerLevelCounts[graph.getVertex(vIndex).level];
    }

    return verticesPerLevelCounts;
}


ArrayOfArrays<uint32_t> findVerticesPerLevels(
    const std::vector<uint32_t>& verticesPerLevelVector, 
    const GraphInterface& graph, 
    bool trimFrontLevelsWithNoVertices 
) {
    auto verticesPerLevelCounts = findVerticesPerLevelsCounts(verticesPerLevelVector, graph);
    size_t numberOfLevels = verticesPerLevelCounts.size();

    int levelOffset = 0;
    if (trimFrontLevelsWithNoVertices) {
        size_t startingLevelAfterTrimming = 0;
        while (startingLevelAfterTrimming < numberOfLevels) {
            if (verticesPerLevelCounts[startingLevelAfterTrimming] != 0) break;
            ++startingLevelAfterTrimming;
        }
        levelOffset = startingLevelAfterTrimming;

        verticesPerLevelCounts.erase(
            verticesPerLevelCounts.begin(), 
            std::next(verticesPerLevelCounts.begin(), startingLevelAfterTrimming)
        );
    }

    numberOfLevels = verticesPerLevelCounts.size();
    ArrayOfArrays<uint32_t> verticesPerLevel(std::vector<size_t>(numberOfLevels, 0), verticesPerLevelCounts);
    std::vector<ArrayOfArrays<uint32_t>::NestedArrayView> levelArrayViews;
    levelArrayViews.reserve(numberOfLevels);
    for (size_t level=0; level<numberOfLevels; ++level) {
        levelArrayViews.emplace_back(verticesPerLevel.getNestedArrayView(level));
    }
    
    for (uint32_t vIndex : verticesPerLevelVector) {
        if (data_structures::shouldSkipVertex(graph, vIndex)) continue;
        levelArrayViews[graph.getVertex(vIndex).level - levelOffset].push_back(vIndex);
    }

    return verticesPerLevel;
}

}