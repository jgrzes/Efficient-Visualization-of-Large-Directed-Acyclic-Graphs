#include "Graph_Colourer.h"

#include "../logging/boost_logging.hpp"

#define _underlyingValueNotNullptr(_optionalPtr) ((_optionalPtr.has_value() && _optionalPtr.value() != nullptr) || !_optionalPtr.has_value())
#define _findEnabledVerticesFromErodingContainer(_vpl, _graph) (graph_preprocessing::findEnabledVerticesFromErodingContainer(_vpl, _graph))
#define _findEnabledDEdgesFromErodingContainer(_depl, _graph) (graph_preprocessing::findEnabledDisputableEdgesFromErodingContainer(_depl, _graph))

namespace algorithms {


GraphColourer::ColourHierarchyNode& GraphColourer::ColourHierarchyNode::operator=(
    GraphColourer::ColourHierarchyNode&& otherColourHierarchyNode
) {
    if (this == &otherColourHierarchyNode) return *this;
    if (parent != otherColourHierarchyNode.parent) {
        throw std::runtime_error{
            "Colour Hierarchy Node move assignment error: move assignment valid only if parents match"
        };
    }

    colour = otherColourHierarchyNode.colour;
    childrenPtrs = std::move(otherColourHierarchyNode.childrenPtrs);
    verticesOfColour = std::move(otherColourHierarchyNode.verticesOfColour);
    depth = otherColourHierarchyNode.depth;
    return *this;
}


void GraphColourer::resetForNewRun() {
    m_disputableEdgesPerLevel.value().reset(nullptr);
    m_verticesPerLevel.value().reset(nullptr);
}


std::pair<ColouredGraph, GraphColourer::ColourHierarchyNode> GraphColourer::assignColoursToGraph(
    const GraphInterface& graph, bool recursiveColouring, uint32_t maxRecursion, bool forceRecomputation
) {
    
    m_graph = &graph;
    computeDisputableEdgesPerLevel(forceRecomputation);
    computeVerticesPerLevel(forceRecomputation);
    // uint32_t numberOfLevels = m_verticesPerLevel.value()->getNumberOfNestedArrays();
    // for (uint32_t level=0; level<numberOfLevels; ++level) {
    //     std::cout << "Level: " << level << ": ";
    //     auto verticesAtLevel = m_verticesPerLevel.value()->getNestedArrayView(level);
    //     for (auto uIndex : verticesAtLevel) {
    //         std::cout << uIndex << " ";
    //     }
    //     std::cout << "\n";
    // }

    bool startingLevelValid;
    uint32_t startingLevel;
    logging::log_trace(
        "Determining the starting colouring level for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "") + "..."
    );
    std::tie(startingLevelValid, startingLevel) = determineTheStartingLevel(
        m_algorithmParams, *(m_verticesPerLevel.value()), *(m_disputableEdgesPerLevel.value())
    );

    if (!startingLevelValid) {
        return {
            ColouredGraph(const_cast<GraphInterface&>(graph), GraphInterface::GraphImplCopyingMode::SHALLOW_COPY), 
            ColourHierarchyNode()
        };
    }
    logging::log_debug(
        "The starting colouring level for graph "
        + (m_optLogGraphId.has_value() ? ("with id = " + m_optLogGraphId.value() + " ") : " ") 
        + "is " + std::to_string(startingLevel) + "."
    );
    // std::cout << "Starting level: " << startingLevel << "\n";
    PartiallyDisabledGraph graphCutOffAtL = createPartiallyDisabledGraphCutOffAtL(
        const_cast<GraphInterface&>(*m_graph), *(m_verticesPerLevel.value()), startingLevel
    );
    m_graph = &graphCutOffAtL;
    m_maxCurrentColourIndex = 0;
    std::vector<uint32_t> vertexColours(graph.getVertexCount(), 0);
    ColourAcquireFunctionT colourAcquireFunction = ColourAcquireFunctionT(
        [this](uint32_t numberOfNewColours) -> uint32_t {
            // TODO: in concurrent version: lock the mutex.
            uint32_t returnedColour = this->m_maxCurrentColourIndex+1;
            this->m_maxCurrentColourIndex += numberOfNewColours;
            logging::log_debug(
                "Graph "
                + (m_optLogGraphId.has_value() ? ("with id = " + m_optLogGraphId.value() + " ") : " ") 
                + "will have " + std::to_string(m_maxCurrentColourIndex) + "." 
            );
            ++m_greedyColouringApplyCalls;
            return returnedColour;
            // TODO: in concurrent version: free the mutex.
        }
    );

    uint32_t minC, maxC;
    logging::log_trace(
        "Applying intial greedy colouring for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..." 
    );
    std::tie(minC, maxC) = applyGreedyColouring(
        const_cast<GraphInterface&>(*m_graph), 
        m_algorithmParams,
        *(m_verticesPerLevel.value()), 
        startingLevel, vertexColours, 
        std::forward<ColourAcquireFunctionT>(colourAcquireFunction)
    );
    logging::log_info(
        "Applied greedy colouring for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "." 
    );
    
    ColouredGraph colouredGraph = ColouredGraph(
        const_cast<GraphInterface&>(graph), GraphInterface::GraphImplCopyingMode::SHALLOW_COPY
    );
    size_t n = vertexColours.size();
    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        colouredGraph.setVertexColour(uIndex, vertexColours[uIndex]);
    }

    size_t numberOfColoursM1 = maxC - minC;
    ColourHierarchyNode colourHierarchyRoot = ColourHierarchyNode();
    colourHierarchyRoot.childrenPtrs.reserve(numberOfColoursM1);
    uint32_t c = minC;
    for (uint32_t i=0; i<=numberOfColoursM1; ++i) {
        colourHierarchyRoot.addChild(c++);
    }

    bool skipRecursiveColouring = false;
    if (!recursiveColouring || --maxRecursion == 0) {
        skipRecursiveColouring = true;
    }

    if (!skipRecursiveColouring) {
        // Warning: Here the algorithm will 'break' vertices per levels and disputable edges per level. This 'distruction' will later be reverted.

        logging::log_trace(
            "Performing first stage recursive colouring for graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + "..." 
        );

        std::unique_ptr<ArrayOfArraysInterface<uint32_t>> verticesPerLevel = std::move(m_verticesPerLevel.value());
        std::unique_ptr<ArrayOfArraysInterface<Edge>> disputableEdgesPerLevel = std::move(m_disputableEdgesPerLevel.value());
        // m_graph = &colouredGraph;

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

        c = minC;
        for (uint32_t i=0; i<=numberOfColoursM1; ++i) {
            colouredGraph.highlightColour(c);
            ArrayOfArrays<uint32_t> verticesPerLevelInC = _findEnabledVerticesFromErodingContainer(
                *verticesPerLevel, colouredGraph
            );
            ArrayOfArrays<Edge> disputableEdgesPerLevelInC = _findEnabledDEdgesFromErodingContainer(
                *disputableEdgesPerLevel, colouredGraph
            );

            buildColourHierarchyRecursivelyRootedAtColour(
                colouredGraph, m_algorithmParams, 
                verticesPerLevelInC, 
                disputableEdgesPerLevelInC,
                *colourHierarchyRoot.childrenPtrs[i], 
                vertexColours, 
                maxRecursion,
                std::forward<ColourAcquireFunctionT>(colourAcquireFunction)
            );
            ++c;

            // Nested function calls will disable some of these vertices, so we need to manually reenable them
            if (i == numberOfColoursM1) continue;
            for (size_t i=0; i<n; ++i) {
                auto arrayAtI = verticesPerLevel->getNestedArrayView(i);
                size_t m = arrayAtI.size();
                for (size_t j=0; j<m; ++j) {
                    colouredGraph.enableVertex(arrayAtI[j]);
                }
            }
        }

        // Fixing `m_verticesPerLevel` and `m_disputableEdgesPerLevel`
        n = verticesPerLevelArrSizes.size();
        for (size_t i=0; i<n; ++i) {
            verticesPerLevel->resize(i, verticesPerLevelArrSizes[i]);
        }

        n = disputableEdgesPerLevelArrSizes.size();
        for (size_t i=0; i<n; ++i) {
            disputableEdgesPerLevel->resize(i, disputableEdgesPerLevelArrSizes[i]);
        }

        logging::log_trace(
            "Fixed up vertices per level and disputable per edges collections for graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + "..." 
        );

        logging::log_debug(
            "Performed first stage recursive colouring for graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + "." 
        );
    }

    std::vector<ColourHierarchyNode*> colourHierarchyNodes(m_maxCurrentColourIndex+1);
    // colourHierarchyNodes.reserve(m_maxCurrentColourIndex+1);
    fillColourHierarchyNodesVector(
        colourHierarchyRoot, 
        colourHierarchyNodes
    );

    n = colouredGraph.getVertexCount();
    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        // Do not know if should skip them or assign them 0, i.e. no colour.
        if (data_structures::shouldSkipVertex(colouredGraph, uIndex)) continue; 
        colourHierarchyNodes[colouredGraph.getVertexColour(uIndex)]->verticesOfColour.emplace_back(uIndex);
    }

    return {colouredGraph, std::move(colourHierarchyRoot)};
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


std::pair<bool, uint32_t> GraphColourer::determineTheStartingLevel(
    const AlgorithmParams& algorithmParams, 
    ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel
) {

    // const auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
    // const auto& disputableEdgesPerLevelValue = *(m_disputableEdgesPerLevel.value());
    size_t n = verticesPerLevel.getNumberOfNestedArrays() - 1;
    size_t level = 0; 
    uint32_t cumVerticesAtLevelCount = 0;
    uint64_t cumDisputableEdgesAtLevelCount = 0;
    // Skipping the intial ones with no vertices
    while (level < n && verticesPerLevel.getSizeOfArr(level) == 0) {
        ++level;
    }
    size_t emptyLevelsSkipOffset = level;
    ++level; // maybe?
    // Skipping the levels with one or no vertices 
    while (level < n && verticesPerLevel.getSizeOfArr(level) <= 1) {
        cumVerticesAtLevelCount += verticesPerLevel.getSizeOfArr(level);
        cumDisputableEdgesAtLevelCount += disputableEdgesPerLevel.getSizeOfArr(level);
        ++level;
    }

    while (level < n) {
        cumVerticesAtLevelCount += verticesPerLevel.getSizeOfArr(level);
        cumDisputableEdgesAtLevelCount += disputableEdgesPerLevel.getSizeOfArr(level);
        if (algorithmParams.startingLevelFunction(
            // level, m_cumDisputableEdgesPerLevelCounts.value(), m_cumVerticesPerLevelCounts.value()
            level - emptyLevelsSkipOffset, cumDisputableEdgesAtLevelCount, cumVerticesAtLevelCount
        )) break;
        ++level;
    }

    return {level < n, level};
}


PartiallyDisabledGraph GraphColourer::createPartiallyDisabledGraphCutOffAtL(
    GraphInterface& graph, const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, int32_t l
) {
    
    PartiallyDisabledGraph pdGraphWithFirstLLevelsDisabled(
        graph, GraphInterface::GraphImplCopyingMode::SHALLOW_COPY
    );
    for (size_t level=0; level<l; ++level) {
        const auto& indicesOfVerticesAtLevel = const_cast<ArrayOfArraysInterface<uint32_t>&>(
            verticesPerLevel
        ).getNestedArrayView(level);
        size_t n = indicesOfVerticesAtLevel.size();
        for (uint32_t vIndex=0; vIndex<n; ++vIndex) {
            pdGraphWithFirstLLevelsDisabled.disableVertex(indicesOfVerticesAtLevel[vIndex]);
        }
    }

    return std::move(pdGraphWithFirstLLevelsDisabled);
}


std::pair<uint32_t, uint32_t> GraphColourer::applyGreedyColouring(
    GraphInterface& graph, 
    const AlgorithmParams& algorithmParams, 
    ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    // ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel,
    uint32_t startingLevel, 
    std::vector<uint32_t>& vertexColours,
    ColourAcquireFunctionT&& colourAcquirerFunction
) {
    
    // TODO: Determine if we should allow a colour to have vertices lower than its child colours
    NestedArrayView<uint32_t> verticesAtKIndices = verticesPerLevel.getNestedArrayView(startingLevel);
    size_t n = verticesAtKIndices.size();
    std::vector<uint32_t> newlyIntroducedColours;
    // newlyIntroducedColours.reserve(verticesAtKIndices.size());
    uint32_t c = colourAcquirerFunction(n);
    uint32_t minC, maxC;
    minC = c;
    for (size_t i=0; i<n; ++i) {
        // std::cout << "Vertex: " << verticesAtKIndices[i] << " colour: " << c << "\n";
        vertexColours[verticesAtKIndices[i]] = c++;
        // newlyIntroducedColours.emplace_back(vIndex);
    }
    maxC = c-1;

    logging::log_debug(
        "Greedy colouring appliance initiated for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + " at level " + std::to_string(startingLevel) 
        + " (call number " 
        + std::to_string(m_greedyColouringApplyCalls) + ")."
    );

    n = graph.getVertexCount();
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
                    graph, minC, maxC, vIndex, uIndex, k, 
                    vertexMailboxes, vertexColours, Vkr
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
        logging::log_trace(
            "Graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + " has just had its colours computed for k = " + std::to_string(k) 
            + " (intial greedy assignment, call number " 
            + std::to_string(m_greedyColouringApplyCalls) + ")."
        );

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
                if (!algorithmParams.shouldMergeFunction(k, vCount)) continue;
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
                    if (mailboxV.lastPing != -1 || graph.getVertex(vIndex).level <= k) continue;
                    mailboxV.lastPing = k; 
                }
            }

            uint64_t baseScore, bestScore;
            uint32_t bestColour = 0;
            baseScore = calculateSimpleScoreForColouring<std::vector<uint32_t>>(graph, &Vmu, vertexColours);
            baseScore += calculateSimpleScoreForColouring<std::unordered_set<uint32_t>>(graph, &setU, vertexColours);
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
                applyBestColouring<std::vector<uint32_t>>(graph, c, Vmu, vertexColours);
                uint64_t score = 0;
                score += calculateSimpleScoreForColouring<std::vector<uint32_t>>(graph, &Vmu, vertexColours);
                score += calculateSimpleScoreForColouring<std::unordered_set<uint32_t>>(graph, &setU, vertexColours);
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
                applyBestColouring<std::vector<uint32_t>>(graph, bestColour, Vmu, vertexColours);
            }
        }

        logging::log_trace(
            "Graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + " has just had its colours computed for k = " + std::to_string(k) 
            + " (local colour fix up, call number " 
            + std::to_string(m_greedyColouringApplyCalls) + ")."
        );
    }

    return std::make_pair(minC, maxC);
}


void GraphColourer::buildColourHierarchyRecursivelyRootedAtColour(
    GraphInterface& graph, 
    const AlgorithmParams& algorithmParams, 
    ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel,
    ColourHierarchyNode& colourHierarchyRoot, 
    std::vector<uint32_t>& vertexColours, 
    uint32_t leftRecursionLevels,
    ColourAcquireFunctionT&& colourAcquireFunction
    // uint32_t colourOffset
) {

    uint32_t rootColour = colourHierarchyRoot.colour;
    logging::log_trace(
        "Building colour hierarchy recursively rooted at colour " 
        + std::to_string(rootColour) + " for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..." 
    );
    auto [startingLevelValid, startingLevel] = determineTheStartingLevel(
        algorithmParams, verticesPerLevel, disputableEdgesPerLevel
    );
    if (!startingLevelValid) return;
    uint32_t minC, maxC;
    
    // Enable only that part of the graph is of `rootColour`
    static_cast<ColouredGraph&>(graph).disableAllVertices();
    size_t n, m;
    n = verticesPerLevel.getNumberOfNestedArrays();
    for (size_t i=0; i<n; ++i) {
        auto arrayAtI = verticesPerLevel.getNestedArrayView(i);
        m = arrayAtI.size();
        for (size_t j=0; j<m; ++j) {
            static_cast<ColouredGraph&>(graph).enableVertex(arrayAtI[j]);
        }
    }

    std::tie(minC, maxC) = applyGreedyColouring(
        graph, algorithmParams, verticesPerLevel, 
        startingLevel, vertexColours, 
        std::forward<ColourAcquireFunctionT>(colourAcquireFunction)
    );

    n = verticesPerLevel.getNumberOfNestedArrays();
    for (size_t i=0; i<n; ++i) {
        auto arrayAtI = verticesPerLevel.getNestedArrayView(i);
        m = arrayAtI.size();
        for (size_t j=0; j<m; ++j) {
            uint32_t vIndex = arrayAtI[j];
            static_cast<ColouredGraph&>(graph).setVertexColour(vIndex, vertexColours[vIndex]);
        }
    }

    size_t numberOfNewColoursM1 = maxC - minC;
    uint32_t c = minC;
    for (uint32_t i=0; i<=numberOfNewColoursM1; ++i) {
        colourHierarchyRoot.addChild(c++);
    }
    if (c-1 != maxC) {
        throw std::runtime_error{
            "Graph Colourer error: min colour is not equal to max colour after incrementing in the loop"
        };
    }

    // std::unique_ptr<ArrayOfArraysInterface<uint32_t>> verticesPerLevel = std::move(m_verticesPerLevel.value());
    // std::unique_ptr<ArrayOfArraysInterface<Edge>> disputableEdgesPerLevel = std::move(m_disputableEdgesPerLevel.value());
    // const auto& graph = *m_graph;

    if (--leftRecursionLevels == 0) return;
    c = minC;
    for (uint32_t i=0; i<=numberOfNewColoursM1; ++i) {
        static_cast<ColouredGraph&>(graph).highlightColour(c);
        ArrayOfArrays<uint32_t> verticesPerLevelInC = _findEnabledVerticesFromErodingContainer(
            verticesPerLevel, graph
        );
        ArrayOfArrays<Edge> disputableEdgesPerLevelInC _findEnabledDEdgesFromErodingContainer(
            disputableEdgesPerLevel, graph
        );
        buildColourHierarchyRecursivelyRootedAtColour(
            graph, 
            algorithmParams, 
            verticesPerLevelInC, 
            disputableEdgesPerLevelInC,
            *colourHierarchyRoot.childrenPtrs[i], 
            vertexColours, 
            leftRecursionLevels,
            std::forward<ColourAcquireFunctionT>(colourAcquireFunction)
        );
        ++c;

        // Nested function calls will disable some of these vertices, so we need to manually reenable them
        if (i == numberOfNewColoursM1) continue;
        for (size_t i=0; i<n; ++i) {
            auto arrayAtI = verticesPerLevel.getNestedArrayView(i);
            m = arrayAtI.size();
            for (size_t j=0; j<m; ++j) {
                static_cast<ColouredGraph&>(graph).enableVertex(arrayAtI[j]);
            }
        }
    }
}


void GraphColourer::instantlyRerouteOfferPacketsToPreds(
    GraphInterface& graph, uint32_t minValidColour, uint32_t maxValidColour,
    uint32_t vIndex, uint32_t offeringVertexIndex, size_t k, 
    std::vector<ColouringStageMailbox>& vertexMailboxes, 
    const std::vector<uint32_t>& vertexColours, 
    std::vector<uint32_t>& Vkr
) {

    #define _colourValid(_c, _minC, _maxC) (_c >= _minC && _c <= _maxC)
    // if (vIndex == 8) std::cout << vIndex << " receives " << offeringVertexIndex << ", which has colour" << vertexColours[offeringVertexIndex] << "\n";
    vertexMailboxes[vIndex].receivedOfferPackets.emplace_back(offeringVertexIndex);
    for (const uint32_t uIndex : graph.NR(vIndex)) {
        // if (vertexColours[uIndex] != 0 && graph.getVertex(uIndex).level <= k) {
        if (_colourValid(vertexColours[uIndex], minValidColour, maxValidColour) 
            && graph.getVertex(uIndex).level <= k) {

            if (uIndex == offeringVertexIndex) continue;
            if (vertexMailboxes[uIndex].lastPing != k) {
                vertexMailboxes[uIndex].resetForPing(k);
                Vkr.emplace_back(uIndex);
                instantlyRerouteOfferPacketsToPreds(
                    graph, minValidColour, maxValidColour, 
                    vIndex, uIndex, k, 
                    vertexMailboxes, vertexColours, Vkr
                );
            }
            vertexMailboxes[uIndex].receivedOfferPackets.emplace_back(offeringVertexIndex);
        }
    }
    #undef _colourValid
}


void GraphColourer::fillColourHierarchyNodesVector(
    ColourHierarchyNode& colourNode, 
    std::vector<ColourHierarchyNode*>& colourHierarchyNodes
) {

    // std::cout << colourNode.colour << "\n";
    colourHierarchyNodes[colourNode.colour] = &colourNode;
    for (auto& childColourNodePtr : colourNode.childrenPtrs) {
        fillColourHierarchyNodesVector(*childColourNodePtr, colourHierarchyNodes);
    }
}

#undef _underlyingValueNotNullptr
#undef _findEnabledVerticesFromErodingContainer
#undef _findEnabledDEdgesFromErodingContainer

}