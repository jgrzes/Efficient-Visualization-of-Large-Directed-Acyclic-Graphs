#include "Graph_Colourer.h"

#define _underlyingValueNotNullptr(_optionalPtr) ((_optionalPtr.has_value() && _optionalPtr.value() != nullptr) || !_optionalPtr.has_value())

namespace algorithms {

std::pair<ColouredGraph, GraphColourer::ColourHierarchyNode> GraphColourer::assignColoursToGraph(
    const GraphInterface& graph, bool recursiveColouring, bool forceRecomputation
) {
    
    computeDisputableEdgesPerLevel(forceRecomputation);
    computeVerticesPerLevel(forceRecomputation);
    m_graph = &graph;
    bool startingLevelValid;
    uint32_t startingLevel;
    std::tie(startingLevelValid, startingLevel) = determineTheStartingLevel();
    // if (startingLevel == m_cumVerticesPerLevelCounts.value().size()-1) {
    if (startingLevelValid) {
        return {
            ColouredGraph(const_cast<GraphInterface&>(graph), GraphInterface::GraphImplCopyingMode::SHALLOW_COPY), 
            ColourHierarchyNode()
        };
    }
    PartiallyDisabledGraph graphCutOffAtL = createPartiallyDisabledGraphCutOffAtL(startingLevel);
    m_graph = &graphCutOffAtL;
    std::vector<uint32_t> vertexColours(graph.getVertexCount(), 0);
    std::vector<uint32_t> introducedColours = applyInitialGreedyColouring(startingLevel, vertexColours);
    
    ColouredGraph colouredGraph = ColouredGraph(
        const_cast<GraphInterface&>(graph), GraphInterface::GraphImplCopyingMode::SHALLOW_COPY
    );
    size_t n = vertexColours.size();
    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        colouredGraph.setVertexColour(uIndex, vertexColours[uIndex]);
    }

    size_t numberOfColours = introducedColours.size();
    ColourHierarchyNode colourHierarchyRoot = ColourHierarchyNode();
    colourHierarchyRoot.childrenPtrs.reserve(numberOfColours);
    for (uint32_t i=0; i<numberOfColours; ++i) {
        colourHierarchyRoot.addChild(introducedColours[i]);
    }

    if (!recursiveColouring) {
        return {
            std::move(colouredGraph), 
            colourHierarchyRoot
        };
    }

    // Warning: Here the algorithm will 'break' vertices per levels and disputable edges per level. This 'distruction' will later be reverted.
    std::unique_ptr<ArrayOfArraysInterface<uint32_t>> verticesPerLevel = std::move(m_verticesPerLevel.value());
    std::unique_ptr<ArrayOfArraysInterface<Edge>> disputableEdgesPerLevel = std::move(m_disputableEdgesPerLevel.value());
    m_graph = &colouredGraph;

    std::vector<size_t> verticesPerLevelArrSizes;
    std::vector<size_t> disputableEdgesPerLevelArrSizes;

    n = verticesPerLevel->getNumberOfNestedArrays();
    verticesPerLevelArrSizes.reserve(n);
    for (size_t i=0; i<n; ++i) {
        verticesPerLevelArrSizes.emplace_back(verticesPerLevel->getSizeOfArr(i));
    }

    n = disputableEdgesPerLevel->getNumberOfNestedArrays();
    disputableEdgesPerLevelArrSizes.reserve(n);
    for (size_t i=0; i<n; ++i) {
        disputableEdgesPerLevelArrSizes.emplace_back(disputableEdgesPerLevel->getSizeOfArr(i));
    }

    for (uint32_t i=0; i<numberOfColours; ++i) {
        uint32_t colour = introducedColours[i];
        colouredGraph.highlightColour(colour);
        m_verticesPerLevel.value().reset(
            new ArrayOfArrays<uint32_t>(std::move(
                graph_preprocessing::findEnabledVerticesFromErodingContainer(
                    *verticesPerLevel, 
                    colouredGraph
                )
            ))
        );
        m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArrays<Edge>(std::move(
                graph_preprocessing::findEnabledDisputableEdgesFromErodingContainer(
                    *disputableEdgesPerLevel, 
                    colouredGraph
                )
            ))
        );
        buildColourHierarchyRecursivelyRootedAtColour(
            colourHierarchyRoot.childrenPtrs[i], 
            vertexColours
        );
    }

    n = verticesPerLevelArrSizes.size();
    for (size_t i=0; i<n; ++i) {
        verticesPerLevel->resize(i, verticesPerLevelArrSizes[i]);
    }

    n = disputableEdgesPerLevelArrSizes.size();
    for (size_t i=0; i<n; ++i) {
        disputableEdgesPerLevel->resize(i, disputableEdgesPerLevelArrSizes[i]);
    }

    return {colouredGraph, colourHierarchyRoot};
}    


void GraphColourer::presetDisputableEdgesPerLevel(const ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel) {
    if (auto arrayOfArraysPtr = dynamic_cast<const ArrayOfArrays<Edge>*>(&disputableEdgesPerLevel);
        arrayOfArraysPtr != nullptr) {

        // if (m_disputableEdgesPerLevel.value_or(nullptr) == nullptr) m_disputableEdgesPerLevel.value().reset(
        if (_underlyingValueNotNullptr(m_disputableEdgesPerLevel)) m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArrays<Edge>(*arrayOfArraysPtr)
        );
    } else if (
        auto arrayOfArraysViewPtr = dynamic_cast<const ArrayOfArraysView<Edge>*>(&disputableEdgesPerLevel);
        arrayOfArraysViewPtr != nullptr
    ) {

        if (_underlyingValueNotNullptr(m_disputableEdgesPerLevel)) m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArraysView<Edge>(*arrayOfArraysViewPtr)
        );
    }

    // TODO: extract to seperate function
    auto& disputableEdgesPerLevelValue = *(m_disputableEdgesPerLevel.value());
    size_t n = disputableEdgesPerLevelValue.getNumberOfNestedArrays();
    // m_cumDisputableEdgesPerLevelCounts = std::vector<size_t>(n, 0);
    // auto& cumDisputableEdgesPerLevelCountsValue = m_cumDisputableEdgesPerLevelCounts.value();
    // cumDisputableEdgesPerLevelCountsValue[0] = disputableEdgesPerLevelValue.getSizeOfArr(0);
    // for (size_t level=1; level<n; ++level) {
    //     cumDisputableEdgesPerLevelCountsValue[level] = cumDisputableEdgesPerLevelCountsValue[level-1] + disputableEdgesPerLevelValue.getSizeOfArr(level);
    // }
}


void GraphColourer::presetDisputableEdgesPerLevel(ArrayOfArraysInterface<Edge>&& disputableEdgesPerLevel) {
    if (auto arrayOfArraysPtr = dynamic_cast<const ArrayOfArrays<Edge>*>(&disputableEdgesPerLevel);
        arrayOfArraysPtr != nullptr) {

        if (_underlyingValueNotNullptr(m_disputableEdgesPerLevel)) m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArrays<Edge>(std::move(*arrayOfArraysPtr))
        );
    } else if (
        auto arrayOfArraysViewPtr = dynamic_cast<const ArrayOfArraysView<Edge>*>(&disputableEdgesPerLevel);
        arrayOfArraysViewPtr != nullptr
    ) {

        if (_underlyingValueNotNullptr(m_disputableEdgesPerLevel)) m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArraysView<Edge>(std::move(*arrayOfArraysViewPtr))
        );
    }

    // TODO: extract to seperate function
    auto& disputableEdgesPerLevelValue = *(m_disputableEdgesPerLevel.value());
    size_t n = disputableEdgesPerLevelValue.getNumberOfNestedArrays();
    // m_cumDisputableEdgesPerLevelCounts = std::vector<size_t>(n, 0);
    // auto& cumDisputableEdgesPerLevelCountsValue = m_cumDisputableEdgesPerLevelCounts.value();
    // cumDisputableEdgesPerLevelCountsValue[0] = disputableEdgesPerLevelValue.getSizeOfArr(0);
    // for (size_t level=1; level<n; ++level) {
    //     cumDisputableEdgesPerLevelCountsValue[level] = cumDisputableEdgesPerLevelCountsValue[level-1] + disputableEdgesPerLevelValue.getSizeOfArr(level);
    // }
}


void GraphColourer::presetVerticesPerLevel(const ArrayOfArraysInterface<uint32_t>& verticesPerLevels) {
    if (auto arrayOfArraysPtr = dynamic_cast<const ArrayOfArrays<uint32_t>*>(&verticesPerLevels);
        arrayOfArraysPtr != nullptr) {

        // if (m_verticesPerLevel.value_or(nullptr) == nullptr) m_verticesPerLevel.value().reset(
        if (_underlyingValueNotNullptr(m_verticesPerLevel)) m_verticesPerLevel.value().reset(
            new ArrayOfArrays<uint32_t>(*arrayOfArraysPtr)
        );
    } else if (
        auto arrayOfArraysViewPtr = dynamic_cast<const ArrayOfArraysView<uint32_t>*>(&verticesPerLevels);
        arrayOfArraysViewPtr != nullptr
    ) {

        if (_underlyingValueNotNullptr(m_verticesPerLevel)) m_verticesPerLevel.value().reset(
            new ArrayOfArraysView<uint32_t>(*arrayOfArraysViewPtr)
        );
    }

    // TODO: extract to seperate function
    auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
    size_t n = m_verticesPerLevel.value()->getNumberOfNestedArrays();
    // m_cumVerticesPerLevelCounts = std::vector<size_t>(n, 0);
    // auto& cumVerticesPerLevelCountsValue = m_cumVerticesPerLevelCounts.value();
    // cumVerticesPerLevelCountsValue[0] = verticesPerLevelValue.getSizeOfArr(0);
    // for (size_t level=1; level<n; ++level) {
    //     cumVerticesPerLevelCountsValue[level] = cumVerticesPerLevelCountsValue[level-1] + verticesPerLevelValue.getSizeOfArr(level);
    // }
}


void GraphColourer::presetVerticesPerLevel(ArrayOfArraysInterface<uint32_t>&& verticesPerLevels) {
    if (auto arrayOfArraysPtr = dynamic_cast<const ArrayOfArrays<uint32_t>*>(&verticesPerLevels);
        arrayOfArraysPtr != nullptr) {

        if (_underlyingValueNotNullptr(m_verticesPerLevel)) m_verticesPerLevel.value().reset(
            new ArrayOfArrays<uint32_t>(std::move(*arrayOfArraysPtr))
        );
    } else if (
        auto arrayOfArraysViewPtr = dynamic_cast<const ArrayOfArraysView<uint32_t>*>(&verticesPerLevels);
        arrayOfArraysViewPtr != nullptr
    ) {

        // if (m_verticesPerLevel.value_or(nullptr) == nullptr) m_verticesPerLevel.value().reset(
        if (_underlyingValueNotNullptr(m_verticesPerLevel)) m_verticesPerLevel.value().reset(
            new ArrayOfArraysView<uint32_t>(std::move(*arrayOfArraysViewPtr))
        );
    }

    // TODO: extract to seperate function
    auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
    size_t n = m_verticesPerLevel.value()->getNumberOfNestedArrays();
    // m_cumVerticesPerLevelCounts = std::vector<size_t>(n, 0);
    // auto& cumVerticesPerLevelCountsValue = m_cumVerticesPerLevelCounts.value();
    // cumVerticesPerLevelCountsValue[0] = verticesPerLevelValue.getSizeOfArr(0);
    // for (size_t level=1; level<n; ++level) {
    //     cumVerticesPerLevelCountsValue[level] = cumVerticesPerLevelCountsValue[level-1] + verticesPerLevelValue.getSizeOfArr(level);
    // }
}


std::pair<bool, uint32_t> GraphColourer::determineTheStartingLevel() const {
    const auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
    const auto& disputableEdgesPerLevelValue = *(m_disputableEdgesPerLevel.value());
    size_t n = verticesPerLevelValue.getNumberOfNestedArrays() - 1;
    size_t level = 0;
    uint32_t cumVerticesAtLevelCount = 0;
    uint64_t cumDisputableEdgesAtLevelCount = 0;
    // Skipping the levels with one or no vertices 
    while (level < n && verticesPerLevelValue.getSizeOfArr(level) <= 1) {
        cumVerticesAtLevelCount += verticesPerLevelValue.getSizeOfArr(level);
        cumDisputableEdgesAtLevelCount += disputableEdgesPerLevelValue.getSizeOfArr(level);
        ++level;
    }

    while (level < n) {
        cumVerticesAtLevelCount += verticesPerLevelValue.getSizeOfArr(level);
        cumDisputableEdgesAtLevelCount += disputableEdgesPerLevelValue.getSizeOfArr(level);
        if (m_algorithmParams.startingLevelFunction(
            // level, m_cumDisputableEdgesPerLevelCounts.value(), m_cumVerticesPerLevelCounts.value()
            level, cumDisputableEdgesAtLevelCount, cumVerticesAtLevelCount
        )) break;
        ++level;
    }

    return {level != n, level};
}


PartiallyDisabledGraph GraphColourer::createPartiallyDisabledGraphCutOffAtL(uint32_t l) {
    PartiallyDisabledGraph pdGraphWithFirstLLevelsDisabled(
        const_cast<GraphInterface&>(*m_graph), 
        GraphInterface::GraphImplCopyingMode::SHALLOW_COPY
    );
    for (size_t level=0; level<l; ++level) {
        const auto& indicesOfVerticesAtLevel = (m_verticesPerLevel.value())->getNestedArrayView(level);
        size_t n = indicesOfVerticesAtLevel.size();
        for (uint32_t vIndex=0; vIndex<n; ++n) {
            pdGraphWithFirstLLevelsDisabled.disableVertex(indicesOfVerticesAtLevel[vIndex]);
        }
    }

    return std::move(pdGraphWithFirstLLevelsDisabled);
}


std::vector<uint32_t> GraphColourer::applyInitialGreedyColouring(
    uint32_t startingLevel, 
    std::vector<uint32_t>& vertexColours
) {
    
    GraphInterface& graph = const_cast<GraphInterface&>(*m_graph); 
    size_t n = graph.getVertexCount();
    ArrayOfArraysInterface<uint32_t>& verticesPerLevel = *m_verticesPerLevel.value();
    // std::vector<uint32_t> vertexColours(n, 0);
    NestedArrayView<uint32_t> verticesAtKIndices = verticesPerLevel.getNestedArrayView(startingLevel);
    std::vector<uint32_t> newlyIntroducedColours;
    newlyIntroducedColours.reserve(verticesAtKIndices.size());
    for (size_t i=0; i<verticesAtKIndices.size(); ++i) {
        const uint32_t vIndex = verticesAtKIndices[i];
        vertexColours[vIndex] = vIndex;
        newlyIntroducedColours.emplace_back(vIndex);
    }

    std::vector<ColouringStageMailbox> vertexMailboxes(n, ColouringStageMailbox{}); 
    std::vector<uint32_t> Vkr;
    std::vector<uint32_t> Vnu;
    std::vector<uint32_t> Vmu;
    std::unordered_set<uint32_t> C;
    std::unordered_map<uint32_t, uint64_t> vertexOfferSummaryMap;
    // TODO: come up with a better way of merge set management than shared pointers.
    // Could implement Union/Find.
    std::vector<std::shared_ptr<std::unordered_set<uint32_t>>> mergeSetsPointers(n, nullptr);

    n = verticesPerLevel.getNumberOfNestedArrays();
    for (size_t k=startingLevel; k<n; ++k) {
        verticesAtKIndices = verticesPerLevel.getNestedArrayView(k); // could be optimized
        Vkr.clear();
        Vnu.clear();
        size_t nk = verticesAtKIndices.size();
        for (size_t i=0; i<nk; ++i) {
            uint32_t uIndex = verticesAtKIndices[i];
            Vkr.emplace_back(uIndex);
            vertexMailboxes[uIndex].resetForPing(k);
        }

        for (size_t i=0; i<nk; ++i) {
            uint32_t uIndex = verticesAtKIndices[i];
            for (const uint32_t vIndex : graph.N(uIndex)) {
                if (vertexMailboxes[vIndex].lastPing != k) {
                    Vnu.emplace_back(vIndex);
                    vertexMailboxes[vIndex].resetForPing(k);
                }
                instantlyRerouteOfferPacketsToPreds(
                    vIndex, uIndex, k, vertexMailboxes, vertexColours, Vkr
                );
            }
        }

        for (const uint32_t vIndex : Vnu) {
            vertexOfferSummaryMap.clear();
            for (const uint32_t vIndex : vertexMailboxes[vIndex].receivedOfferPackets) {
                uint32_t c = vertexColours[vIndex];
                ++vertexOfferSummaryMap[c]; // uint64_t{} == 0, so explicit vertexOfferSummaryMap[c] = 0 is not needed
            }

            uint32_t chosenColour = 0;
            uint64_t bestOfferCount = 0;
            for (const auto& [c, cCount] : vertexOfferSummaryMap) {
                if (cCount > bestOfferCount) {
                    chosenColour = c;
                    bestOfferCount = cCount;
                }
            }

            vertexColours[vIndex] = chosenColour;
        }

        for (const uint32_t uIndex : Vkr) {
            mergeSetsPointers[uIndex] = std::make_shared<std::unordered_set<uint32_t>>(
                std::initializer_list<uint32_t>{uIndex}
            );
        }
        
        for (const uint32_t uIndex : Vkr) {
            vertexOfferSummaryMap.clear();
            for (const uint32_t vIndex : vertexMailboxes[uIndex].receivedOfferPackets) {
                ++vertexOfferSummaryMap[vIndex];
            }

            for (const auto& [vIndex, vCount] : vertexOfferSummaryMap) {
                if (!m_algorithmParams.shouldMergeFunction(k, vCount)) continue;
                auto& setUPtr = mergeSetsPointers[uIndex];
                auto& setVPtr = mergeSetsPointers[vIndex];
                if (setUPtr != setVPtr) {
                    if (setVPtr->size() <= setUPtr->size()) {
                        for (const uint32_t xIndex : *setVPtr) setUPtr->emplace(xIndex);
                        setVPtr = setUPtr;
                    } else {
                        for (const uint32_t xIndex : *setUPtr) setVPtr->emplace(xIndex);
                        setUPtr = setVPtr;
                    }
                }
            }
        }

        for (const uint32_t uIndex : Vkr) {
            auto& setU = *mergeSetsPointers[uIndex];
            if (setU.size() <= 1) continue; 
            C.clear();
            for (const uint32_t vIndex : setU) {
                C.emplace(vertexColours[vIndex]);
            }

            if (C.size() == 1) continue;
            Vmu.clear();
            for (const uint32_t xIndex : setU) {
                for (const uint32_t vIndex : graph.N(xIndex)) {
                    auto& mailboxV = vertexMailboxes[vIndex];
                    if (mailboxV.lastPing != k || graph.getVertex(vIndex).level <= k) continue;
                    if (mailboxV.lastPing != -1) {
                        mailboxV.lastPing = -1; 
                        Vmu.emplace_back(vIndex);
                    }
                }
            }

            // Resetting -1 pings
            for (const uint32_t xIndex : setU) {
                for (const uint32_t vIndex : graph.N(xIndex)) {
                    auto& mailboxV = vertexMailboxes[vIndex];
                    if (mailboxV.lastPing != k || graph.getVertex(vIndex).level <= k) continue;
                    mailboxV.lastPing = k; 
                }
            }

            uint64_t baseScore, bestScore;
            uint32_t bestColour = 0;
            baseScore = calculateSimpleScoreForColouring<std::vector<uint32_t>>(&Vmu, vertexColours);
            baseScore += calculateSimpleScoreForColouring<std::unordered_set<uint32_t>>(&setU, vertexColours);
            bestScore = baseScore;

            std::vector<std::pair<uint32_t, uint32_t>> baseColouring;
            baseColouring.reserve(setU.size() + Vmu.size());
            for (const uint32_t xIndex : setU) {
                baseColouring.emplace_back(xIndex, vertexColours[xIndex]);
            }
            for (const uint32_t vIndex : Vmu) {
                baseColouring.emplace_back(vIndex, vertexColours[vIndex]);
            }

            for (const uint32_t c : C) {
                for (const uint32_t xIndex : setU) vertexColours[xIndex] = c;
                applyBestColouring<std::vector<uint32_t>>(c, Vmu, vertexColours);
                uint64_t score = 0;
                score += calculateSimpleScoreForColouring<std::vector<uint32_t>>(&Vmu, vertexColours);
                score += calculateSimpleScoreForColouring<std::unordered_set<uint32_t>>(&setU, vertexColours);
                if (score < bestScore) {
                    bestScore = score;
                    bestColour = c;
                }
                // rollback colours
                for (const auto [xIndex, xColour] : baseColouring) {
                    vertexColours[xIndex] = xColour;
                }
            }

            if (bestColour != 0) {
                for (const uint32_t xIndex : setU) vertexColours[xIndex] = bestColour;
                applyBestColouring<std::vector<uint32_t>>(bestColour, Vmu, vertexColours);
            }
        }


    }

    // return vertexColours;
    return newlyIntroducedColours;
}


void GraphColourer::buildColourHierarchyRecursivelyRootedAtColour(
    ColourHierarchyNode& colourHierarchyRoot, 
    std::vector<uint32_t>& vertexColours
    // uint32_t colourOffset
) {

    uint32_t rootColour = colourHierarchyRoot.colour;
    auto [startingLevelValid, startingLevel] = determineTheStartingLevel();
    if (!startingLevelValid) return;
    auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
    std::vector<uint32_t> introducedColours = applyInitialGreedyColouring(startingLevel, vertexColours);
    // maxColourIndex += verticesPerLevelValue.getSizeOfArr(startingLevel);
    size_t numberOfNewColours = verticesPerLevelValue.getSizeOfArr(startingLevel);
    for (uint32_t i=0; i<numberOfNewColours; ++i) {
        colourHierarchyRoot.addChild(introducedColours[i]);
    }

    std::unique_ptr<ArrayOfArraysInterface<uint32_t>> verticesPerLevel = std::move(m_verticesPerLevel.value());
    std::unique_ptr<ArrayOfArraysInterface<Edge>> disputableEdgesPerLevel = std::move(m_disputableEdgesPerLevel.value());

    const auto& graph = *m_graph;

    for (uint32_t i=0; i<=numberOfNewColours; ++i) {
        const uint32_t colour = introducedColours[i];
        const_cast<ColouredGraph&>(
            static_cast<const ColouredGraph&>(*m_graph)
        ).highlightColour(colour);
        m_verticesPerLevel.value().reset(
            new ArrayOfArrays<uint32_t>(std::move(
                graph_preprocessing::findEnabledVerticesFromErodingContainer(
                    *verticesPerLevel, 
                    graph
                )
            ))
        );
        m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArrays<Edge>(std::move(
                graph_preprocessing::findEnabledDisputableEdgesFromErodingContainer(
                    *disputableEdgesPerLevel, 
                    graph
                )
            ))
        );
        buildColourHierarchyRecursivelyRootedAtColour(
            colourHierarchyRoot.childrenPtrs[i], 
            vertexColours
        );
    }
}


void GraphColourer::instantlyRerouteOfferPacketsToPreds(
    uint32_t vIndex, uint32_t offeringVertexIndex, size_t k, 
    std::vector<ColouringStageMailbox>& vertexMailboxes, 
    const std::vector<uint32_t>& vertexColours, 
    std::vector<uint32_t>& Vkr
) {

    const GraphInterface& graph = *m_graph;
    vertexMailboxes[vIndex].receivedOfferPackets.emplace_back(offeringVertexIndex);
    for (const uint32_t uIndex : graph.NR(vIndex)) {
        if (vertexColours[uIndex] != 0 && graph.getVertex(uIndex).level <= k) {
            if (uIndex == offeringVertexIndex) continue;
            if (vertexMailboxes[uIndex].lastPing != k) {
                vertexMailboxes[uIndex].resetForPing(k);
                Vkr.emplace_back(uIndex);
                instantlyRerouteOfferPacketsToPreds(
                    vIndex, uIndex, k, vertexMailboxes, vertexColours, Vkr
                );
            }
            vertexMailboxes[uIndex].receivedOfferPackets.emplace_back(offeringVertexIndex);
        }
    }
}

#undef _underlyingValueNotNullptr

}