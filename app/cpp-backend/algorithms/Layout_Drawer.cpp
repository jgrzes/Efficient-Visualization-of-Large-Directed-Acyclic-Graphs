#include "Layout_Drawer.h"

#include <limits>
#include <execution>
#include <random>

#include "../utils/input_generation_for_qap.h"
#include "../graph-preprocessing/assign_levels.h"

namespace algorithms {

#define EPS_FOR_SIGNUM 1e-6
#define _signum(_x) ((std::abs(_x) < EPS_FOR_SIGNUM ? 0 : (_x < 0 ? -1 : 1)))

#define MIN_ARR_SIZE_TO_SORT_WITH_MULTITHREADING 80

auto& findMaxColourIndexInColourHierarchy = utils::findMaxColourIndexInColourHierarchy;
auto& assignLevelsInGraph = graph_preprocessing::assignLevelsInGraph;

std::vector<CartesianCoords> LayoutDrawer::findLayoutForGraph(
    ColouredGraph& graph, ColourHierarchyNode& rootColourNode, double defaultEpsilon
) {
    logging::log_trace(
        "Computing layout for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    m_graph = &graph;
    m_rootColourNode = &rootColourNode;

    size_t n = graph.getVertexCount();
    uint32_t maxColourIndex = findMaxColourIndexInColourHierarchy(rootColourNode);
    m_pinkIndices = std::vector<uint32_t>(maxColourIndex+1);
    m_blueIndices = std::vector<uint32_t>(maxColourIndex+1);
    m_maxColour = maxColourIndex;
    logging::log_trace(
        "Performing pink and blue indices construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    
    std::string pinkIndicesString{}, blueIndicesString{};
    constexpr logging::layout_service_severity_level pinkAndBlueIndicesStrLoggingLevel = logging::layout_service_severity_level::debug;
    uint32_t pinkIndex{0}, blueIndex{0};
    if (logging::getConsoleLoggingLevel() <= pinkAndBlueIndicesStrLoggingLevel
        || logging::getFileLoggingLevel() <= pinkAndBlueIndicesStrLoggingLevel) {

        performPinkIndicesConstruction(pinkIndex, std::ref(pinkIndicesString));
        performBlueIndicesConstruction(blueIndex, std::ref(blueIndicesString));
    } else {
        performPinkIndicesConstruction(pinkIndex);
        performBlueIndicesConstruction(blueIndex);
    }
    
    logging::log_debug(
        "Successfully performed pink and blue indices construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + ", pinkIndices = " + pinkIndicesString
        + ", blueIndices = " + blueIndicesString + "."
    );

    ArrayOfArrays<uint32_t> verticesPerLevel = graph_preprocessing::findVerticesPerLevels(graph);
    m_maxYCoordForALevel = std::vector<double>(verticesPerLevel.getNumberOfNestedArrays(), 0.0);
    m_cumYCoordDiffForLevels = std::vector<long double>(verticesPerLevel.getNumberOfNestedArrays(), 0.0);
    m_termCountForLevels = std::vector<uint32_t>(verticesPerLevel.getNumberOfNestedArrays(), 0);

    logging::log_trace(
        "Performing cumulative interspring force array construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    emplaceColourNodesInArray();
    maxColourIndex = m_colourNodesPtrs.size() - 1;
    for (uint32_t c=0; c<=maxColourIndex; ++c) {
        std::sort(
            m_colourNodesPtrs[c]->verticesOfColour.begin(), 
            m_colourNodesPtrs[c]->verticesOfColour.end(), 
            [&graph](const uint32_t& a, const uint32_t& b) -> bool {
                return (graph.getVertex(a).level < graph.getVertex(b).level);
            }
        );
    }

    buildfirstVertexOfColourForLevelMarkers();
    std::string colourNodesArrayStr = "[";
    uint32_t colourNodesArrayN = m_colourNodesPtrs.size();
    for (uint32_t i=0; i<colourNodesArrayN; ++i) {
        colourNodesArrayStr += (colourNodesArrayStr.size() > 1 ? ", " : "");
        colourNodesArrayStr += "<index=" + std::to_string(i) + ", ";
        if (m_colourNodesPtrs[i] == nullptr) colourNodesArrayStr += "null";
        else colourNodesArrayStr += std::to_string(m_colourNodesPtrs[i]->colour);
        colourNodesArrayStr += ">";
    }
    colourNodesArrayStr += "]";

    logging::log_debug(
        "Finished emplacing colour nodes in array, this being the final result: " +
        colourNodesArrayStr + "."
    );

    auto equalColourDepthColourFinder = [this](uint32_t uColour, uint32_t vColour) -> std::pair<uint32_t, uint32_t> {
        uint32_t uDepth = (this->m_colourNodesPtrs)[uColour]->depth;
        uint32_t vDepth = (this->m_colourNodesPtrs)[vColour]->depth;
        if (uDepth == vDepth) return {uColour, vColour};
        else if (uDepth > vDepth) {
            ColourHierarchyNode* nu = (this->m_colourNodesPtrs)[uColour];
            while (nu->depth != vDepth) {
                nu = const_cast<ColourHierarchyNode*>(nu->parent);
            }

            return {nu->colour, vColour};
        } else {
            ColourHierarchyNode* nv = (this->m_colourNodesPtrs)[vColour];
            while (nv->depth != uDepth) {
                nv = const_cast<ColourHierarchyNode*>(nv->parent);
            }

            return {uColour, nv->colour};
        }
    };

    buildBaseCumFInterspring(
        std::forward<EqualColourDepthColourFinderT>(equalColourDepthColourFinder)
    );
    transferFInterspringUpwards(verticesPerLevel);

    logging::log_debug(
        "Performed cumulative interspring force array construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "."
    );

    m_epsilonsForVertices = SparseArray<double>(n, defaultEpsilon);
    findEpsilonsForColourRoots();

    // Layout positions vector initialization
    n = graph.getVertexCount();
    m_layoutPositions = std::vector<std::pair<double, double>>(n, {0, 0});
    m_layoutXPositionsWrapperPtr.reset(
        new OnePairFieldArrayWrapper<double, double, double, 1>(m_layoutPositions)
    );
    m_lastFpIndices = std::vector<std::pair<int64_t, std::vector<uint32_t>>>(n, {-1, {}});

    #define _getColourRoot(_colourNode) (_colourNode.verticesOfColour.front())
    double leftBoxBoudForUncoloured = 0;
    double rightBoxBoundForUncoloured = 0;
    double offsetFromZero = 0;
    double previousRightXBorder = 0;
    
    // Drawing coloured subgraphs
    for (const auto& firstLevelColourNodePtr : rootColourNode.childrenPtrs) {
        if (firstLevelColourNodePtr->verticesOfColour.empty()) continue;
        ArrayOfArrays<uint32_t> verticesPerLevelForColour = graph_preprocessing::findVerticesPerLevels(
            firstLevelColourNodePtr->verticesOfColour, graph, true
        );

        // if (verticesPerLevelForColour.getSizeOfArr(0) != 1) {
        //     throw std::runtime_error{
        //         "Layout Drawer error: after graph modifications each colour should have exactly one colour root"
        //     };
        // }

        double WColour = 0.5 * m_epsilonsForVertices.dataAtOrDefault(_getColourRoot((*firstLevelColourNodePtr)));
        offsetFromZero += std::max(previousRightXBorder - (offsetFromZero - WColour) + m_algorithmParams.firstLevelChildPadding, 0.0);
        double fixedChildRightBoxBound = findLayoutForColouredSubgraph(
            verticesPerLevelForColour, {offsetFromZero, 0}, 
            {offsetFromZero - WColour, offsetFromZero + WColour}
        );
        // previousRightXBorder = offsetFromZero + WColour + m_algorithmParams.firstLevelChildPadding;
        previousRightXBorder = fixedChildRightBoxBound + m_algorithmParams.firstLevelChildPadding;
        offsetFromZero += (2.0 * WColour) + m_algorithmParams.firstLevelChildPadding;
        rightBoxBoundForUncoloured = offsetFromZero;
    }
    fixUpwardPointingEdgesInColourNodeChildren(rootColourNode);
    #undef _getColourRoot

    if (!rootColourNode.childrenPtrs.empty()) {
        std::vector<uint32_t> colourOrder;
        colourOrder.reserve(m_maxColour);
        for (uint32_t c=1; c<=m_maxColour; ++c) {
            colourOrder.emplace_back(c);
        }

        std::vector<std::optional<uint32_t>> startingLevelForChildrenColoursCache(m_maxColour+1, std::nullopt);
        if (!colourOrder.empty()) {
            std::sort(
                colourOrder.begin(), colourOrder.end(), 
                [this, &startingLevelForChildrenColoursCache, &graph](uint32_t c1, uint32_t c2) -> bool {
                    ColourHierarchyNode *c1Node, *c2Node;
                    if ((c1Node = m_colourNodesPtrs[c1])->childrenPtrs.empty() 
                        && (c2Node = m_colourNodesPtrs[c2])->childrenPtrs.empty()) {

                        return c1 < c2;
                    }
                    else if ((c1Node = m_colourNodesPtrs[c1])->childrenPtrs.empty()) return true;
                    else if ((c2Node = m_colourNodesPtrs[c2])->childrenPtrs.empty()) return false;
                    else {
                        uint32_t startingLevelForChildrenC1 = std::numeric_limits<uint32_t>::max();
                        if (startingLevelForChildrenColoursCache[c1].has_value()) {
                            startingLevelForChildrenC1 = startingLevelForChildrenColoursCache[c1].value();
                        } else {
                            for (const auto& childC1NodePtr : c1Node->childrenPtrs) {
                                if (childC1NodePtr->verticesOfColour.empty()) continue;
                                startingLevelForChildrenC1 = std::min(
                                    startingLevelForChildrenC1, 
                                    static_cast<uint32_t>(graph.getVertex(childC1NodePtr->verticesOfColour.front()).level)
                                );
                            }
                            startingLevelForChildrenColoursCache[c1] = startingLevelForChildrenC1;
                        }

                        uint32_t startingLevelForChildrenC2 = std::numeric_limits<uint32_t>::max();
                        if (startingLevelForChildrenColoursCache[c2].has_value()) {
                            startingLevelForChildrenC2 = startingLevelForChildrenColoursCache[c2].value();
                        } else {
                            for (const auto& childC2NodePtr : c2Node->childrenPtrs) {
                                if (childC2NodePtr->verticesOfColour.empty()) continue;
                                startingLevelForChildrenC2 = std::min(
                                    startingLevelForChildrenC2, 
                                    static_cast<uint32_t>(graph.getVertex(childC2NodePtr->verticesOfColour.front()).level)
                                );
                            }
                            startingLevelForChildrenColoursCache[c2] = startingLevelForChildrenC2;
                        }

                        return startingLevelForChildrenC1 < startingLevelForChildrenC2;
                    }
                }
            );

            drawNestedColourSubgraphs(colourOrder);
        }
    }

    // Drawing coloured subgraphs concluded

    n = verticesPerLevel.getNumberOfNestedArrays();
    uint32_t maxWidthOfUncoloured = 0;
    for (uint32_t i=0; i<n; ++i) {
        maxWidthOfUncoloured = std::max(
            maxWidthOfUncoloured, 
            static_cast<uint32_t>(verticesPerLevel.getNestedArrayView(i).size())
        );
    }

    rightBoxBoundForUncoloured = std::max(
        std::max(
            m_algorithmParams.minBoxWidthForUncoloured, 
            rightBoxBoundForUncoloured - leftBoxBoudForUncoloured
        ), 
        leftBoxBoudForUncoloured + m_algorithmParams.epsilonForColourRootCalculator(maxWidthOfUncoloured)
    );

    uint32_t lastLevelWithNoColoured = 0;
    for (size_t i=0; i<n; ++i) {
        auto levelViewI = verticesPerLevel.getNestedArrayView(i);
        bool terminateLoop = false;
        for (uint32_t vIndex : levelViewI) {
            if (graph.getVertexColour(vIndex) != 0) {
                terminateLoop = true;
                break;
            }
        }
        if (terminateLoop) break;
        lastLevelWithNoColoured = i;
    }

    logging::log_trace(
        "Computing layout for uncoloured part of the graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    // std::cout << "Last level with no coloured: " << lastLevelWithNoColoured << "\n";
    if (lastLevelWithNoColoured == n-1) {
        findLayoutForColouredSubgraph(
            verticesPerLevel, {0, 0}, {leftBoxBoudForUncoloured, rightBoxBoundForUncoloured}
        );
        return m_layoutPositions;
    }

    drawUncolouredPartOfGraph(
        verticesPerLevel, lastLevelWithNoColoured, 
        {leftBoxBoudForUncoloured, rightBoxBoundForUncoloured}
    );
    logging::log_info(
        "Concluded computing layout for uncoloured part of the graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );

    bool nestedColoursExist = (m_maxColour - (rootColourNode.childrenPtrs.size()));
    if (nestedColoursExist) adjustAllYCoordinatesToSatisifyDownwardFlow();

    return m_layoutPositions;
}


void LayoutDrawer::performPinkIndicesConstruction(
    uint32_t& currentPink,
    std::optional<std::reference_wrapper<std::string>> optPinkIndicesStrRef, 
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;

    uint32_t colour = colourNode.colour;
    if (optPinkIndicesStrRef.has_value()) {
        optPinkIndicesStrRef.value().get() += std::to_string(colour) + "->" + std::to_string(currentPink) + " ";
    }
    m_pinkIndices[colour] = currentPink++;
    size_t n = colourNode.childrenPtrs.size();
    for (size_t i=0; i<n; ++i) {
        auto& colourNodeChild = *colourNode.childrenPtrs[i];
        performPinkIndicesConstruction(
            currentPink, optPinkIndicesStrRef, 
            std::ref(colourNodeChild)
        );
    }
}


void LayoutDrawer::performBlueIndicesConstruction(
    uint32_t& currentBlue, 
    std::optional<std::reference_wrapper<std::string>> optBlueIndicesStrRef, 
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;

    uint32_t colour = colourNode.colour;
    if (optBlueIndicesStrRef.has_value()) {
        optBlueIndicesStrRef.value().get() += std::to_string(colour) + "->" + std::to_string(currentBlue) + " ";
    }
    m_blueIndices[colour] = currentBlue++;
    int64_t n = colourNode.childrenPtrs.size();
    for (int64_t i=n-1; i>=0; --i) {
        auto& colourNodeChild = *colourNode.childrenPtrs[i];
        performBlueIndicesConstruction(
            currentBlue, optBlueIndicesStrRef, 
            std::ref(colourNodeChild)
        );
    }
}


void LayoutDrawer::performEmplacingColourNodesInArrayForColourSubtree(
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;

    m_colourNodesPtrs[colourNode.colour] = &colourNode;    
    for (auto& colourNodeChildPtr : colourNode.childrenPtrs) {
        performEmplacingColourNodesInArrayForColourSubtree(std::ref(*colourNodeChildPtr));
    }
}


void LayoutDrawer::emplaceColourNodesInArray() {
    // m_colourNodesPtrs.resize(m_maxColour+1);
    auto maxColourP1 = m_maxColour+1;
    m_colourNodesPtrs = std::vector<ColourHierarchyNode*>(maxColourP1, nullptr);
    m_colourSubgraphAlreadyDrawn = std::vector<bool>(maxColourP1, false);
    m_colourSubgraphsXBoxBounds.resize(maxColourP1);
    m_colourSubgraphsLargestYCoords.resize(maxColourP1);
    performEmplacingColourNodesInArrayForColourSubtree();
}


void LayoutDrawer::buildfirstVertexOfColourForLevelMarkers() {
    auto& graph = *m_graph;
    uint32_t n = graph.getVertexCount();
    uint32_t maxLevelInGraph = 0;
    for (uint32_t i=0; i<n; ++i) {
        maxLevelInGraph = std::max(
            maxLevelInGraph, 
            static_cast<uint32_t>(graph.getVertex(i).level)
        );
    }

    m_firstVertexOfColourForLevelMarkers = SparseMatrix<uint32_t, false>(m_maxColour+1, maxLevelInGraph+1);
    for (uint32_t c=0; c<=m_maxColour; ++c) {
        const ColourHierarchyNode& colourNodeC = *(m_colourNodesPtrs[c]);
        const std::vector<uint32_t>& verticesOfColourC = colourNodeC.verticesOfColour;

        int64_t m = verticesOfColourC.size();
        if (m == 0) continue;
        uint32_t previousLevel = graph.getVertex(verticesOfColourC[0]).level;
        m_firstVertexOfColourForLevelMarkers.at(c, previousLevel) = 0;

        for (int64_t i=1; i<m; ++i) {
            uint32_t currentLevel = graph.getVertex(verticesOfColourC[i]).level;
            if (currentLevel != previousLevel) {
                m_firstVertexOfColourForLevelMarkers.at(c, currentLevel) = i;
            }

            previousLevel = currentLevel;
        }
    }
}


void LayoutDrawer::buildBaseCumFInterspring(EqualColourDepthColourFinderT&& equalColourDepthColourFinder) {
    auto& graph = *m_graph;
    size_t n = graph.getVertexCount();
    m_cumFInterspring = SparseArray<std::pair<double, double>>(n, {0, 0});

    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        uint32_t uLevel = graph.getVertex(uIndex).level;
        uint32_t uColour = graph.getVertexColour(uIndex);
        if (uColour == 0) continue;

        uint32_t uPinkIndex = m_pinkIndices[uColour];
        uint32_t uBlueIndex = m_blueIndices[uColour];

        const auto Nu = graph.N(uIndex);
        for (uint32_t vIndex : Nu) {
            uint32_t vColour = graph.getVertexColour(vIndex);
            if (vColour == 0) continue;
            // else if (!(m_pinkIndices[vColour] > uPinkIndex || m_blueIndices[vColour] > uBlueIndex)) continue;
            uint32_t vPinkIndex = m_pinkIndices[vColour];
            uint32_t vBlueIndex = m_blueIndices[vColour];
            if (!((
                vPinkIndex > uPinkIndex && vBlueIndex < uBlueIndex        
            ) || (vPinkIndex < uPinkIndex && vBlueIndex > uBlueIndex))) {
                // logging::log_trace(
                //     "Failed to compute F interspring between " + std::to_string(uIndex) + 
                //     " <- " + std::to_string(vIndex) + ", uColour = " + 
                //     std::to_string(uColour) + ", vColour = " +
                //     std::to_string(vColour) + " (u_pink, u_blue) = (" + 
                //     std::to_string(uPinkIndex) + ", " + std::to_string(uBlueIndex) +
                //     "), (v_pink, v_blue) = (" + std::to_string(vPinkIndex) + ", "
                //     + std::to_string(vBlueIndex) + ")."
                // );
                continue;
            }

            uint32_t uColourFixed, vColourFixed;
            std::tie(uColourFixed, vColourFixed) = equalColourDepthColourFinder(uColour, vColour);

            // m_cumFInterspring[uIndex] += m_algorithmParams.FInterspringCalculator(
            //     uColourFixed, uLevel, vColourFixed, graph.getVertex(vIndex).level
            // );
            auto uAdditionalInterspring = m_algorithmParams.FInterspringCalculator(
                uColourFixed, uLevel, vColourFixed, graph.getVertex(vIndex).level
            );
            logging::log_trace_v(
                "For u = " + std::to_string(uIndex) + ", v = " + std::to_string(vIndex) + " adding (" +
                std::to_string(uAdditionalInterspring.first) + ", " +
                std::to_string(uAdditionalInterspring.second) + ") to u cum interspring."
            );
            m_cumFInterspring[uIndex] += uAdditionalInterspring;
        }

        const auto Nru = graph.NR(uIndex);
        for (uint32_t wIndex : Nru) {
            uint32_t wColour = graph.getVertexColour(wIndex);
            if (!(m_pinkIndices[wColour] > uPinkIndex || m_blueIndices[wColour] > uBlueIndex)) continue;
            
            uint32_t uColourFixed, wColourFixed;
            std::tie(uColourFixed, wColourFixed) = equalColourDepthColourFinder(uColour, wColour);

            m_cumFInterspring[uIndex] += m_algorithmParams.FInterspringCalculator(
                uColourFixed, uLevel, wColourFixed, graph.getVertex(wIndex).level
            );
        }
    }
}


void LayoutDrawer::transferFInterspringUpwards(const ArrayOfArraysInterface<uint32_t>& verticesPerLevel) {
    auto& graph = *m_graph;
    int64_t n = verticesPerLevel.getNumberOfNestedArrays();
    for (int64_t k=n-1; k>=0; --k) {
        auto Vk = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(k);
        size_t nk = Vk.size();

        for (size_t i=0; i<nk; ++i) {
            uint32_t uIndex = Vk[i];
            uint32_t uColour = graph.getVertexColour(uIndex);
            auto cumFInterspringU = m_cumFInterspring.dataAtOr(uIndex, {0, 0});

            for (uint32_t wIndex : graph.NR(uIndex)) {
                if (uColour != graph.getVertexColour(wIndex)) continue;
                m_cumFInterspring[wIndex] += m_algorithmParams.FInterspringPushUpwardsValueCalculator(
                    cumFInterspringU
                );
            }
        }
    }
}


uint32_t LayoutDrawer::findMaxWidthForColourSubgraphNotNested(uint32_t colourRootIndex) {
    auto& graph = *m_graph;
    uint32_t colour = graph.getVertexColour(colourRootIndex);
    auto& colourNode = *m_colourNodesPtrs[colour];
    uint32_t numberOfLevels = 0;
    for (uint32_t vIndex : colourNode.verticesOfColour) {
        if (data_structures::shouldSkipVertex(graph, vIndex)) continue;
        numberOfLevels = std::max(
            numberOfLevels, static_cast<uint32_t>(graph.getVertex(vIndex).level+1)
        );
    }

    SparseArray<uint32_t> verticesPerLevelCountsForColour(numberOfLevels, 0);
    for (uint32_t vIndex : colourNode.verticesOfColour) {
        if (data_structures::shouldSkipVertex(graph, vIndex)) continue;
        ++verticesPerLevelCountsForColour[graph.getVertex(vIndex).level];
    }

    uint32_t maxVertexCountOnASingleLevel = 0;
    for (uint32_t i=0; i<numberOfLevels; ++i) {
        maxVertexCountOnASingleLevel = std::max(
            maxVertexCountOnASingleLevel, 
            verticesPerLevelCountsForColour.dataAtOr(i, 0)
        );
    }

    return maxVertexCountOnASingleLevel;
    // return m_algorithmParams.epsilonForColourRootCalculator(maxVertexCountOnASingleLevel);
}


void LayoutDrawer::findEpsilonsForColourRoots(
    // SparseArray<double>& epsilonsForVertices, 
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    #define _getColourRoot(_colourNode) (_colourNode.verticesOfColour.front())
    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;
        
    // std::cout << "Colour node: " << colourNode.colour << "\n";
    for (auto& colourNodeChildPtr : colourNode.childrenPtrs) {
        findEpsilonsForColourRoots(std::ref(*colourNodeChildPtr));
    }
    if (colourNode.verticesOfColour.size() == 0) return;

    if (colourNode.parent != nullptr && !colourNode.verticesOfColour.empty()) {
        uint32_t colourRootIndex = _getColourRoot(colourNode);
        double epsilon = m_algorithmParams.epsilonForColourRootCalculator(
            findMaxWidthForColourSubgraphNotNested(colourRootIndex)
        );
        double childrenEpsilonSum = 0;
        for (auto& colourNodeChild : colourNode.childrenPtrs) {
            if (colourNodeChild->verticesOfColour.size() == 0) continue;
            childrenEpsilonSum += m_epsilonsForVertices[_getColourRoot((*colourNodeChild))];
        }
        m_epsilonsForVertices[colourRootIndex] = std::max(
            epsilon, childrenEpsilonSum + (std::max(
                int64_t(0), static_cast<int64_t>(colourNode.childrenPtrs.size()) - 1
            ) * m_algorithmParams.nestedColourChildPadding
        ));
    }
    #undef _getColourRoot
}


double LayoutDrawer::findLayoutForColouredSubgraph(
    const ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
    const std::pair<double, double>& startingPositionForColourRoot, 
    const std::pair<double, double>& boxBounds
) {

    auto& graph = *m_graph;
    uint32_t colour = graph.getVertexColour(
        const_cast<ArrayOfArraysInterface<uint32_t>&>(
            verticesPerLevelForColour
        ).getNestedArrayView(0)[0]
    );

    logging::log_debug(
        "Finding layout for coloured subgraph (colour = " + std::to_string(colour)
        + " in graph" + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + ", starting position for colour root = (" + std::to_string(startingPositionForColourRoot.first) 
        + ", " + std::to_string(startingPositionForColourRoot.second) + "), box bounds along x axis: ("
        + std::to_string(boxBounds.first) + ", " + std::to_string(boxBounds.second) + ")..."
    );

    double largestYCoord = findInitialLayoutForColouredSubgraph(
        const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevelForColour), 
        startingPositionForColourRoot, boxBounds
    ); 

    logging::log_trace(
        "Found initial layout for subgraph (colour = " + std::to_string(colour)
        + " for graph" + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + ")."
    );

    return boxBounds.second;
}


void LayoutDrawer::drawNestedColourSubgraphs(const std::vector<uint32_t>& colourOrder) {
    uint32_t n = colourOrder.size();
    const auto& graph = *m_graph;
    #define _getColourRoot(_colourNode) (_colourNode.verticesOfColour.front())

    std::string colourOrderStr = "<";
    for (uint32_t colour : colourOrder) {
        if (colourOrderStr.size() > 1) colourOrderStr += ", ";
        colourOrderStr += std::to_string(colour);
    }
    colourOrderStr += ">";
    
    logging::log_debug(
        "Colour ordering in drawing nested for graph" +
        std::string(m_optLogGraphId.has_value() ? " with id = " + m_optLogGraphId.value() : "") +
        ": " + colourOrderStr + "."
    );
    
    for (uint32_t i=0; i<n; ++i) {
        auto colourNodeI = m_colourNodesPtrs[colourOrder[i]];
        if (colourNodeI->childrenPtrs.empty()) continue;
        uint32_t colourI = colourNodeI->colour;
        logging::log_trace("Now logging " + std::to_string(colourOrder[i]) + "...");

        double maxAbsDistanceAlongXAxis = 0;
        double nestedLeftBoxBound = m_colourSubgraphsXBoxBounds[colourI].first;
        for (const auto& childNodePtr : colourNodeI->childrenPtrs) {
            if (childNodePtr->verticesOfColour.empty()) continue;
            uint32_t childColourRootIndex = _getColourRoot((*childNodePtr));
            double childSubboxWidth = m_epsilonsForVertices.dataAtOrDefault(childColourRootIndex);
            double nestedRightBoxBound = nestedLeftBoxBound + childSubboxWidth;
            double colourRootXPostion = (nestedLeftBoxBound + nestedRightBoxBound) * 0.5;
            auto Nrcr = graph.NR(childColourRootIndex);

            for (uint32_t wIndex : Nrcr) {
                if (graph.getVertexColour(wIndex) != colourI) continue;
                maxAbsDistanceAlongXAxis = std::max(
                    maxAbsDistanceAlongXAxis, 
                    std::abs(m_layoutPositions[wIndex].first - colourRootXPostion)
                );
            }

            nestedLeftBoxBound = nestedRightBoxBound + m_algorithmParams.nestedColourChildPadding;
        }

        double standarizedH = m_colourSubgraphsLargestYCoords[colourI] + std::max(
           (m_algorithmParams.baseVerexWeight * m_algorithmParams.gAcceleration) / (m_algorithmParams.kInitialLayoutCoeff * 1.0), 
            maxAbsDistanceAlongXAxis * m_algorithmParams.minDistanceBetweenLevelsCoeff
        );

        nestedLeftBoxBound = m_colourSubgraphsXBoxBounds[colourI].first;
        for (const auto& childNodePtr : colourNodeI->childrenPtrs) {
            if (childNodePtr->verticesOfColour.empty()) continue;
            uint32_t childColourRootIndex = _getColourRoot((*childNodePtr));
            double childSubboxWidth = m_epsilonsForVertices.dataAtOrDefault(childColourRootIndex);
            double nestedRightBoxBound = nestedLeftBoxBound + childSubboxWidth;
            double colourRootXPostion = (nestedLeftBoxBound + nestedRightBoxBound) * 0.5;
            auto Nrcr = graph.NR(childColourRootIndex);

            ArrayOfArrays<uint32_t> verticesPerLevelForNestedColour = graph_preprocessing::findVerticesPerLevels(
                childNodePtr->verticesOfColour, graph, true
            );
            findLayoutForColouredSubgraph(
                verticesPerLevelForNestedColour, {colourRootXPostion, standarizedH}, 
                {nestedLeftBoxBound, nestedRightBoxBound}
            );

            nestedLeftBoxBound = nestedRightBoxBound + m_algorithmParams.nestedColourChildPadding;
        }        
    }

    #undef _getColourRoot;
}


void LayoutDrawer::fixUpwardPointingEdgesInColourNodeChildren(const ColourHierarchyNode& colourNode) {
    if (colourNode.childrenPtrs.size() <= 1) return;
    auto& graph = *m_graph;
    uint32_t minSiblingColour = colourNode.childrenPtrs.front()->colour;
    uint32_t maxSiblingColour = colourNode.childrenPtrs.back()->colour;
    const static double sinMinReqAngle = std::sin(m_algorithmParams.minRequiredEdgeAngleRequriedRad);

    std::vector<std::pair<uint32_t, uint32_t>> intercolourEdgesToInspect;
    for (const auto& childNodePtr : colourNode.childrenPtrs) {
        const auto& childNode = *childNodePtr;
        uint32_t childColour = childNode.colour;
        uint32_t m = childNode.verticesOfColour.size();

        for (uint32_t i=0; i<m; ++i) {
            uint32_t uIndex = childNode.verticesOfColour[i];
            auto Nu = graph.N(uIndex);

            for (uint32_t vIndex : Nu) {
                uint32_t vColour = graph.getVertexColour(vIndex);
                if (vColour == childColour) continue;
                else if (vColour >= minSiblingColour && vColour <= maxSiblingColour) {
                    intercolourEdgesToInspect.emplace_back(uIndex, vIndex);
                }
            }
        }
    }

    // TODO: Decide if the array should be sorted by levels or by y coordinates
    // (both in increasing manner)
    std::sort(
        intercolourEdgesToInspect.begin(), intercolourEdgesToInspect.end(), 
        [&graph](const auto& p1, const auto& p2) -> bool {
            const auto vLevelP1 = graph.getVertex(p1.second).level;
            const auto vLevelP2 = graph.getVertex(p2.second).level;
            return (vLevelP1 < vLevelP2); // This or the other way around?
        }
    );

    double yAdd;
    for (const auto& [uIndex, vIndex] : intercolourEdgesToInspect) {
        const std::pair<double, double>& uPosition = m_layoutPositions[uIndex];
        const std::pair<double, double>& vPosition = m_layoutPositions[vIndex];

        double d = traits::cartesian_distance(uPosition, vPosition);
        double absYDiff = std::abs(uPosition.second - vPosition.second);
        double sinAlpha = std::sin(absYDiff / d);
        double alpha = std::asin(sinAlpha);

        if (uPosition.second > vPosition.second || alpha < m_algorithmParams.minRequiredEdgeAngleRequriedRad) {
            if (uPosition.second > vPosition.second) {
                yAdd = d * sinMinReqAngle + absYDiff;
            } else if (alpha < m_algorithmParams.minRequiredEdgeAngleRequriedRad) {
                yAdd = d * sinMinReqAngle - absYDiff;
            }
            uint32_t vLevel = graph.getVertex(vIndex).level;
            uint32_t vColour = graph.getVertexColour(vIndex);
            const auto& vColourNode = *m_colourNodesPtrs[vColour];
            uint32_t m = vColourNode.verticesOfColour.size();
            for (uint32_t j=m_firstVertexOfColourForLevelMarkers.dataAtOr(vColour, vLevel, m); j<m; ++j) {
                uint32_t xIndex = vColourNode.verticesOfColour[j];
                m_layoutPositions[xIndex].second += yAdd;
            } 
        }
    }
}


void LayoutDrawer::adjustAllYCoordinatesToSatisifyDownwardFlow() {
    auto& graph = *m_graph;
    uint32_t n = graph.getVertexCount();

    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        uint32_t uLevel = graph.getVertex(uIndex).level;
        m_maxYCoordForALevel[uLevel] = std::max(
            m_maxYCoordForALevel[uLevel], m_layoutPositions[uIndex].second
        );
    }

    uint32_t numberOfLevels = m_maxYCoordForALevel.size();
    double avgYCoordDiffK;
    for (uint32_t k=1; k<numberOfLevels; ++k) {    
        if (m_termCountForLevels[k] == 0) {
            avgYCoordDiffK = m_algorithmParams.minRequiredDistanceBetweenAdjacentLevels;;
        } else {
            avgYCoordDiffK = static_cast<double>(std::min(
                m_cumYCoordDiffForLevels[k] / static_cast<long double>(m_termCountForLevels[k]),
                static_cast<long double>(std::numeric_limits<double>::max())
            ));
            avgYCoordDiffK = std::max(
                avgYCoordDiffK, m_algorithmParams.minRequiredDistanceBetweenAdjacentLevels
            );
        }
        m_maxYCoordForALevel[k] = std::max(
            m_maxYCoordForALevel[k-1] + avgYCoordDiffK, m_maxYCoordForALevel[k]
        );
    }

    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        if (graph.getVertexColour(uIndex) == 0) continue; // Do not change y coord of uncoloured verticess
        m_layoutPositions[uIndex].second = std::max(
            m_layoutPositions[uIndex].second, 
            m_maxYCoordForALevel[graph.getVertex(uIndex).level]
        );
    }
}


double LayoutDrawer::findInitialLayoutForColouredSubgraph(
    ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
    std::pair<double, double> startingPositionForColourRoot, 
    const std::pair<double, double>& boxBounds
) {

    // Difference from initial version in python - every coloured subgraph has exactly one colour root
    size_t n = verticesPerLevelForColour.getNumberOfNestedArrays();
    // Skipping levels with zero vertices 
    size_t k = 0;
    while (k < n) {
        if (verticesPerLevelForColour.getNestedArrayView(k).size() != 0) {
            break;
        }
        ++k;
    }
    if (k == n) return {boxBounds.second}; // Should never happen but better safe than sorry.

    auto& graph = *m_graph;
    auto Vk = verticesPerLevelForColour.getNestedArrayView(k); 
    uint32_t colour = graph.getVertexColour(Vk[0]);
    m_colourSubgraphsXBoxBounds[colour] = boxBounds;
    bool artificialColourRootAdded = false;

    if (Vk.size() != 1) {
        artificialColourRootAdded = true;
        uint32_t artificialRootIndex = graph.getVertexCount();
        graph.addNewVertex();
        for (uint32_t vIndex : Vk) {
            graph.addNewEdge(artificialRootIndex, vIndex);
        }
        m_layoutPositions.emplace_back(startingPositionForColourRoot);
    } else {
        ++k;
        m_layoutPositions[Vk[0]] = startingPositionForColourRoot;
    }
    
    double largestYCoord = startingPositionForColourRoot.second;

    const auto [leftBoxBound, rightBoxBound] = boxBounds;    
    const double W = rightBoxBound - leftBoxBound;
    static const double sqrt2 = std::sqrt(2.0);
    const double WDivSqrt2 = W / sqrt2;

    // TODO: Consider if should trim trailing zero levels
    // (probably not really because that is already taken care of elsewhere).
    std::vector<double> predictedYCoords;
    predictedYCoords.reserve(n);
    predictedYCoords.emplace_back(startingPositionForColourRoot.second);
    for (size_t i=1; i<n; ++i) {
        predictedYCoords.emplace_back(
            predictedYCoords.back() + std::max(
                m_algorithmParams.gAcceleration * (
                    m_algorithmParams.baseVerexWeight / m_algorithmParams.kInitialLayoutCoeff
                ), 
                WDivSqrt2 * m_algorithmParams.nextLevelDownCoeffForPredicted
            )
        );
    }

    std::random_device rd;
    std::mt19937 rng(rd());

    while (k < n) {
        Vk = verticesPerLevelForColour.getNestedArrayView(k);
        size_t nk = Vk.size();
        BucketifiedLineSegment<uint32_t, 
            OnePairFieldArrayWrapper<double, double, double, 1>&, 
        size_t> xPositionsBucketifiedK(
            leftBoxBound, rightBoxBound, m_algorithmParams.numberOfBucketsCalculator(nk), 
            *m_layoutXPositionsWrapperPtr
        );

        // TODO: Add multithreading to sorting (i.e. std::execution flag).
        std::sort(
            Vk.begin(), Vk.end(), 
            [&graph, colour](uint32_t aIndex, uint32_t bIndex) -> bool {
                uint32_t backEdgesOfColourCountA = 0;
                uint32_t backEdgesOfColourCountB = 0;
                for (uint32_t wIndex : graph.NR(aIndex)) {
                    if (graph.getVertexColour(wIndex) == colour) {
                        ++backEdgesOfColourCountA;
                    }
                }

                for (uint32_t wIndex : graph.NR(bIndex)) {
                    if (graph.getVertexColour(wIndex) == colour) {
                        ++backEdgesOfColourCountB;
                    }
                }

                return backEdgesOfColourCountA > backEdgesOfColourCountB;
            }
        );

        // TODO: Find a more optimal way of storing already drawn indices.
        std::unordered_set<uint32_t> alreadyDrawnInVk;

        for (size_t i=0; i<nk; ++i) {
            uint32_t vIndex = Vk[i];
            uint32_t vLevel = graph.getVertex(vIndex).level;
            // TODO: Optimize function call by precomputing W / m_algorithmParams.sCoeff
            logging::log_trace_vv(
                "Building FCollection and preparing to find xOpt for vertice " +
                std::to_string(vIndex) + " at level " + std::to_string(vLevel) + 
                " in the graph" + std::string(m_optLogGraphId.has_value() ? " with id " + m_optLogGraphId.value() : "") +
                "..."
            );
            auto FCollectionV = buildFCollectionForVertex(
                vIndex, alreadyDrawnInVk, W / (Vk.size() * m_algorithmParams.sCoeff)
            );

            double vPositionX;
            bool skipAddingNoise = false;
            if (!FCollectionV.empty()) {
                try {
                    if (!FCollectionV.FcsVertexIndices.empty()) {
                        skipAddingNoise = true;
                        for (uint32_t FcsVertexIndex : FCollectionV.FcsVertexIndices) {
                            auto& FcsVertexP = m_lastFpIndices[FcsVertexIndex];
                            if (FcsVertexP.first != colour) {
                                // Should never happen, but better safe than sorry
                                throw std::runtime_error{
                                    "Layout Drawer error: invalid Fcs added FCollectionV"
                                };
                            }
                            if (graph.getVertex(FcsVertexIndex).level != vLevel 
                                || FcsVertexP.second != FCollectionV.FpVertexIndices) {

                                skipAddingNoise = false;
                                break;
                            }
                        }
                    }
                    if (skipAddingNoise) {
                        logging::log_trace_v(
                            "Will skip adding noise for vertex " + std::to_string(vIndex) + "."
                        );
                    }
                } catch (const std::runtime_error& e) {
                    logging::log_warning(
                        "Got the following error when attempting to check Fp consistency for vertex " +
                        std::to_string(vIndex) + ": " + e.what()
                    );
                    skipAddingNoise = false;
                }
                // NOTE: This does not add noise, the condition check just sounds slightly misleading
                if (!skipAddingNoise) {
                    vPositionX = findPositionXThatMinimizesFCollection(FCollectionV, vLevel) + m_cumFInterspring.dataAtOr(vIndex, {0, 0}).first;
                    vPositionX = std::max(leftBoxBound, std::min(rightBoxBound, vPositionX)); // make sure it does not breach box bounds
                } else {
                    vPositionX = m_layoutPositions[FCollectionV.FcsVertexIndices.front()].first + 1e-12;
                }

            } else {
                double FInterspringX = m_cumFInterspring.dataAtOr(vIndex, {0, 0}).first;
                vPositionX = (W - m_algorithmParams.marginPadding) * _signum(FInterspringX);
                vPositionX = std::max(leftBoxBound, std::min(rightBoxBound, vPositionX));
            }
            logging::log_trace_vv(
                "Found xOpt for vertice " +
                std::to_string(vIndex) + " at level " + std::to_string(vLevel) + 
                " in the graph" + std::string(m_optLogGraphId.has_value() ? " with id " + m_optLogGraphId.value() : "") +
                ", it is as follows: " + std::to_string(vPositionX) + "."
            );

            logging::log_trace_vv(
                "Adding noise to xOpt for vertice " +
                std::to_string(vIndex) + " at level " + std::to_string(vLevel) + 
                " in the graph" + std::string(m_optLogGraphId.has_value() ? " with id " + m_optLogGraphId.value() : "") +
                "..."
            );
            // double optVPositionX = vPositionX;
            uint32_t m = static_cast<uint32_t>(FCollectionV.size());
            // if (false) {
            if (m != 0 && !skipAddingNoise) {
                double maxNoiseEpsilonM = m_algorithmParams.maxNoiseEpsilonCalculator(m, W);
                std::uniform_real_distribution<double> dist(-maxNoiseEpsilonM, maxNoiseEpsilonM);
                double noise = dist(rng);
                moveVerticeFromXOptBasedOnNoise(vPositionX, noise, xPositionsBucketifiedK);
                vPositionX += noise;
            }

            m_layoutPositions[vIndex] = {vPositionX, 0};
            alreadyDrawnInVk.emplace(vIndex);
            m_lastFpIndices[vIndex] = {colour, FCollectionV.extractFpVertexIndices()};

            logging::log_trace_vv(
                "Added noise to xOpt for vertice " +
                std::to_string(vIndex) + " at level " + std::to_string(vLevel) + 
                " in the graph" + std::string(m_optLogGraphId.has_value() ? " with id " + m_optLogGraphId.value() : "") +
                ", noisy xOpt is as follows: " + std::to_string(vPositionX) + ", also marked vertice as already drawn."
            );
        }

        // Create gaps between vertices
        if (Vk.size() >= 2) {
            std::vector<std::pair<uint32_t, double>> VkVerticesXPositions;
            VkVerticesXPositions.reserve(Vk.size());
            for (uint32_t vIndex : Vk) {
                VkVerticesXPositions.emplace_back(vIndex, m_layoutPositions[vIndex].first);
            }
            std::sort(
                VkVerticesXPositions.begin(), VkVerticesXPositions.end(), 
                [](const auto& a, const auto& b) -> bool {
                    return a.second < b.second;
                } 
            );
            logging::log_trace(
                "Moving elements to the interval for colour " + std::to_string(colour) +
                " at level " + std::to_string(k) + " in graph" +
                std::string(m_optLogGraphId.has_value() ? " with id " + m_optLogGraphId.value() : "") + "..."
            );
            moveElementsToTheInterval(boxBounds, VkVerticesXPositions);
            logging::log_debug(
                "Moving elements to the interval for colour " + std::to_string(colour) +
                " at level " + std::to_string(k) + " in graph" +
                std::string(m_optLogGraphId.has_value() ? " with id " + m_optLogGraphId.value() : "") + "..."
            );

            // TODO: Make sure there no colour subgraph overlaps when having recursive colours
            double gapEpsilon = (0.5 * W) / (Vk.size() - 1);
            // double gapEpsilon = m_epsilonsForVertices.getDefaultValue();
            createGapsAlongXAxisBetweenVertices(VkVerticesXPositions, boxBounds, gapEpsilon);
            for (const auto& [vIndex, newVPositionX] : VkVerticesXPositions) {
                m_layoutPositions[vIndex].first = newVPositionX;
            } 
        }

        double maxDistanceAlongXAxisBetweenChildAndParent = 0;
        for (size_t i=0; i<nk; ++i) {
            uint32_t vIndex = Vk[i];
            auto Nrv = graph.NR(vIndex);
            for (uint32_t uIndex : Nrv) {
                if (graph.getVertexColour(uIndex) != colour) continue;
                auto newDiff = std::abs(m_layoutPositions[vIndex].first - m_layoutPositions[uIndex].first);
                if (colour == 3 && newDiff > maxDistanceAlongXAxisBetweenChildAndParent) {
                    logging::log_trace_v(
                        "Updating max diff along x axis for colour = " + std::to_string(colour) + ", level = " +
                        std::to_string(k) + " (|" + std::to_string(vIndex) + ".x - " +
                        std::to_string(uIndex) + ".x| = " + std::to_string(newDiff) + ", vColour = " +
                        std::to_string(graph.getVertexColour(vIndex)) + ", uColour = " + 
                        std::to_string(graph.getVertexColour(uIndex)) + "."
                    );
                    maxDistanceAlongXAxisBetweenChildAndParent = newDiff;
                } 
            }
        }

        logging::log_trace(
            "Max distance along x axis between child and parent for colour " +
            std::to_string(colour) + ", level " + std::to_string(k) + 
            " for graph " +
            (m_optLogGraphId.has_value() ? " with id = " + m_optLogGraphId.value() + " " : "") +
            " is " + std::to_string(maxDistanceAlongXAxisBetweenChildAndParent) + "."
        );

        for (size_t i=0; i<nk; ++i) {
            uint32_t vIndex = Vk[i];
            double weightV = m_algorithmParams.baseVerexWeight;
            auto Nv = graph.N(vIndex);
            uint32_t numberOfColourChildrenOfV = 0;
            for (uint32_t uIndex : Nv) {
                if (graph.getVertexColour(uIndex) != colour) continue;
                ++numberOfColourChildrenOfV;
            }
            weightV += m_algorithmParams.addWeightFromChildrenCoeff * static_cast<double>(numberOfColourChildrenOfV);

            double lowestParentY = std::numeric_limits<double>::min();
            uint32_t numberOfColourParentsOfV = 0;
            auto Nrv = graph.NR(vIndex);
            for (uint32_t uIndex : Nrv) {
                if (graph.getVertexColour(uIndex) != colour) continue;
                double uIndexYCoord = m_layoutPositions[uIndex].second;
                lowestParentY = std::max(lowestParentY, uIndexYCoord);
                ++numberOfColourParentsOfV;
            }            
            if (numberOfColourParentsOfV == 0) lowestParentY = predictedYCoords[k-1];

            double d = 1.0 + m_algorithmParams.pullUpCoeff * static_cast<double>(numberOfColourParentsOfV);;
            double vPositionY = lowestParentY + std::max(
                m_algorithmParams.minDistanceBetweenLevelsCoeff * maxDistanceAlongXAxisBetweenChildAndParent * (weightV / d), 
                (weightV * m_algorithmParams.gAcceleration) / (m_algorithmParams.kInitialLayoutCoeff * d)
            );
            m_layoutPositions[vIndex].second = vPositionY;
            m_cumYCoordDiffForLevels[k] += (vPositionY - lowestParentY);
            ++m_termCountForLevels[k];
            largestYCoord = std::max(largestYCoord, vPositionY);
        }

        ++k;
    }

    m_colourSubgraphsLargestYCoords[colour] = largestYCoord;
    m_colourSubgraphAlreadyDrawn[colour] = true;
    if (artificialColourRootAdded) {
        m_layoutPositions.pop_back();
        m_graph->removeLastNVertices(1);
    }
    return largestYCoord;
}


void LayoutDrawer::moveVerticeFromXOptBasedOnNoise(
    double xOpt, double noise, 
    BucketifiedLineSegment<
        uint32_t, OnePairFieldArrayWrapper<double, double, double, 1>&, size_t
    >& xPositionsBucketified
) {

    double xOptNoisy = xOpt + noise;
    double intervalBegin = std::min(xOpt, xOptNoisy);
    double intervalEnd = std::max(xOpt, xOptNoisy);
    logging::log_trace_vv(
        "Will move elements from interval (" + std::to_string(intervalBegin) + 
        ", " + std::to_string(intervalEnd) + ")..."
    );

    auto XOptToOptNoisy = xPositionsBucketified.getElementsBetween(intervalBegin, intervalEnd);
    double deltaCoeff = m_algorithmParams.randomDeltaNoiseCoeffCalculator();

    double d = 0;
    std::vector<double> absPushDistances;
    size_t n = XOptToOptNoisy.size();
    absPushDistances.reserve(n);
    for (size_t i=0; i<n; ++i) {
        uint32_t vIndex = XOptToOptNoisy[i];
        absPushDistances.emplace_back(std::abs(xOpt - m_layoutPositions[vIndex].first) * deltaCoeff);
        d = std::max(d, absPushDistances.back());
    }

    moveAllVerticesInXRangeToNewXRange(
        std::make_pair(intervalBegin, intervalEnd), xOptNoisy, 
        (xOptNoisy > xOpt ? 1 : -1), xOpt, deltaCoeff, 
        xPositionsBucketified, std::ref(XOptToOptNoisy)
    );

    if (xOptNoisy > xOpt) {
        for (size_t i=0; i<n; ++i) {
            uint32_t vIndex = XOptToOptNoisy[i];
            xPositionsBucketified.moveElementToNewPosition(vIndex, xOptNoisy + absPushDistances[i]);
        }
    } else {
        for (size_t i=0; i<n; ++i) {
            uint32_t vIndex = XOptToOptNoisy[i];
            xPositionsBucketified.moveElementToNewPosition(vIndex, xOptNoisy - absPushDistances[i]);
        }
    }
}


void LayoutDrawer::moveAllVerticesInXRangeToNewXRange(
    const std::pair<double, double>& baseXRange, double newXRangeBorder, 
    int8_t otherBorderInfSign, double moveDistanceFunctionSubtrahend, double moveDistanceFunctionCoeff, 
    BucketifiedLineSegment<
        uint32_t, OnePairFieldArrayWrapper<double, double, double, 1>&, size_t
    >& xPositionsBucketified, 
    std::optional<std::reference_wrapper<std::vector<uint32_t>>> precomputedVerticesInXRangeIndices
) {
    logging::log_trace_vv(
        "Will move elements from interval (" + std::to_string(baseXRange.first) + 
        ", " + std::to_string(baseXRange.second) + ") to a new interval with borders " +
        (otherBorderInfSign == 1 ? std::string(std::to_string(newXRangeBorder) + ", inf)") : std::string("(-inf, " + std::to_string(newXRangeBorder))) + 
        "."
    );

    std::vector<uint32_t> verticesInXRangeIndices;
    if (!precomputedVerticesInXRangeIndices.has_value()) {
        verticesInXRangeIndices = xPositionsBucketified.getElementsBetween(baseXRange.first, baseXRange.second);
        precomputedVerticesInXRangeIndices = std::ref(verticesInXRangeIndices);
    }
    std::vector<uint32_t>& verticesInXRangeIndicesRef = precomputedVerticesInXRangeIndices.value().get();
    if (verticesInXRangeIndicesRef.empty()) return;
    double d = 0;
    size_t n = verticesInXRangeIndicesRef.size();
    std::vector<double> pushDistances;
    pushDistances.reserve(n);

    for (size_t i=0; i<n; ++i) {
        uint32_t vIndex = verticesInXRangeIndicesRef[i];
        pushDistances.emplace_back(
            (m_layoutPositions[vIndex].first - moveDistanceFunctionSubtrahend) * moveDistanceFunctionCoeff
        );
        d = std::max(d, std::abs(pushDistances.back()));
    }
    
    moveAllVerticesInXRangeToNewXRange(
        (otherBorderInfSign == 1 
            ? std::make_pair(newXRangeBorder, newXRangeBorder+d) 
            : std::make_pair(newXRangeBorder-d, newXRangeBorder)
        ),  (otherBorderInfSign == 1 ? newXRangeBorder+d : newXRangeBorder-d), 
        otherBorderInfSign, newXRangeBorder, moveDistanceFunctionCoeff, xPositionsBucketified
    );

    for (size_t i=0; i<n; ++i) {
        uint32_t vIndex = verticesInXRangeIndicesRef[i];
        xPositionsBucketified.moveElementToNewPosition(vIndex, newXRangeBorder + pushDistances[i]);
    }
}


LayoutDrawer::FCollection LayoutDrawer::buildFCollectionForVertex(
    uint32_t uIndex, const std::unordered_set<uint32_t>& alreadyDrawnVerticesSet, double wPrim
) {

    auto& graph = *m_graph;
    uint32_t colour = graph.getVertexColour(uIndex);
    uint32_t uLevel = graph.getVertex(uIndex).level;
    FCollection FCollectionV;

    std::unordered_set<uint32_t> uBackEdgesIndices;
    auto Nru = graph.NR(uIndex);
    for (uint32_t wIndex : Nru) {
        if (graph.getVertexColour(wIndex) != colour) continue;
        FCollectionV.emplace_back_fp(
            std::move(buildF(wIndex, uLevel, wPrim * m_algorithmParams.sCoeff)), 
            wIndex
        );
        uBackEdgesIndices.emplace(wIndex);
    }

    #define _setContains(_set, _key) (_set.find(_key) != _set.end())
    auto Nu = graph.N(uIndex);
    for (uint32_t vIndex : Nu) {
        auto Nrv = graph.NR(vIndex);
        for (uint32_t wIndex : Nrv) {
            if (uIndex == wIndex || graph.getVertexColour(wIndex) != colour
                || _setContains(uBackEdgesIndices, wIndex)) continue;
            if (const auto& w = graph.getVertex(wIndex);
                w.level < uLevel || w.level == uLevel && _setContains(alreadyDrawnVerticesSet, wIndex)) {

                FCollectionV.emplace_back_fcs(
                    std::move(buildF(wIndex, uLevel, wPrim * m_algorithmParams.sCoeff)),
                    wIndex
                );
            }    
        }
    }
    #undef _setContains

    return std::move(FCollectionV);
}


std::unique_ptr<LayoutDrawer::F> LayoutDrawer::buildF(
    uint32_t vIndex, uint32_t k, double s
    // double alphaP, double betaP
) const {

    const auto& graph = *m_graph;
    const auto& v = graph.getVertex(vIndex);
    if (v.level == k) {

        return std::make_unique<Fcs>(
            v, m_layoutPositions[vIndex].first, m_algorithmParams.defaultAlphaP
        );
    }

    const auto Nv = graph.N(vIndex);
    uint32_t childrenDeeperThanK = 0;
    for (uint32_t uIndex : Nv) {
        if (graph.getVertex(uIndex).level > k) {
            ++childrenDeeperThanK;
        }
    }

    return std::make_unique<Fp>(
        v, m_layoutPositions[vIndex].first, 
        m_algorithmParams.defaultAlphaP, m_algorithmParams.defaultBetaP, 
        static_cast<double>(childrenDeeperThanK) * s * 0.5 // I don't remember what 0.5 meant
    );
}


double LayoutDrawer::findPositionXThatMinimizesFCollection(
    const std::vector<std::unique_ptr<F>>& FCollection, uint32_t k
) const {

    std::vector<double> xValuesToCheck;
    // TODO: Find better estimate for minimum required size for xValuesToCheck
    xValuesToCheck.reserve(FCollection.size() * 3);   

    size_t n = FCollection.size();
    for (size_t i=0; i<n; ++i) {
        const auto&& potentialMinimaForFi = FCollection[i]->getPotentialMinima();
        if (const auto* castedToArray1 = std::get_if<const std::array<double, 1>>(&potentialMinimaForFi);
            castedToArray1 != nullptr) {

            xValuesToCheck.emplace_back(castedToArray1->operator[](0));
        } else {
            const auto& castedToArray3 = std::get<const std::array<double, 3>>(potentialMinimaForFi);
            xValuesToCheck.emplace_back(castedToArray3[0]);
            xValuesToCheck.emplace_back(castedToArray3[1]);
            xValuesToCheck.emplace_back(castedToArray3[2]);
        }
    }

    // TODO: Optimize sorting with concurrentcy from std::execution
    std::sort(xValuesToCheck.begin(), xValuesToCheck.end(), std::less<double>{});
    double minVal = std::numeric_limits<double>::max();
    std::optional<double> xArgmin = std::nullopt;

    size_t m = xValuesToCheck.size();
    for (size_t i=0; i<m; ++i) {
        double pointI = xValuesToCheck[i];
        double valForPointI = 0;
        for (size_t j=0; j<n; ++j) {
            valForPointI += FCollection[j]->operator()(pointI, k);
        }

        if (valForPointI < minVal) {
            minVal = valForPointI;
            xArgmin = pointI;
        }
    }

    if (!xArgmin.has_value()) {
        throw std::runtime_error{
            "Layout Drawer error: found no minima for F collection"
        };
    }

    return xArgmin.value();
}


void LayoutDrawer::moveElementsToTheInterval(
    const std::pair<double, double>& intervalBounds, 
    std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions
) const {

    auto&& [leftBoxBound, rightBoxBound] = intervalBounds;
    uint32_t n = VkVerticesXPositions.size();
    for (uint32_t i=0; i<n; ++i) {
        if (VkVerticesXPositions[i].second >= leftBoxBound) break;
        VkVerticesXPositions[i].second = leftBoxBound;
    }

    uint32_t i = n-1;
    while (true) {
        if (VkVerticesXPositions[i].second <= rightBoxBound) break;
        VkVerticesXPositions[i].second = rightBoxBound; 
        if (i == 0) break;
        --i;
    }
}


void LayoutDrawer::createGapsAlongXAxisBetweenVertices(
    std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions,
    const std::pair<double, double>& boxBounds, double gapEpsilon
) {

    size_t n = VkVerticesXPositions.size();
    if (n == 0) return;
    const auto [leftBoxBound, rightBoxBound] = boxBounds;
    // std::optional<double> gamma = std::nullopt;
    std::vector<double> targetVerticeXPositions(n);
    for (uint32_t i=0; i<n; ++i) {
        targetVerticeXPositions[i] = VkVerticesXPositions[i].second;
    }

    for (uint32_t i=1; i<n; ++i) {
        double alpha = targetVerticeXPositions[i] - targetVerticeXPositions[i-1];
        if (alpha < gapEpsilon) {
            targetVerticeXPositions[i] = targetVerticeXPositions[i-1] + gapEpsilon;
        }
    }

    if (targetVerticeXPositions.back() > rightBoxBound) {
        double beta = targetVerticeXPositions.back() - rightBoxBound;
        for (uint32_t i=0; i<n; ++i) {
            targetVerticeXPositions[i] -= beta;
        }

        // Critical fallback
        if (targetVerticeXPositions.front() < leftBoxBound) {
            double gamma = (rightBoxBound - leftBoxBound) / (n-1);
            for (uint32_t i=0; i<n; ++i) {
                targetVerticeXPositions[i] = leftBoxBound + i*gamma;
            }
        }
    }

    for (uint32_t i=0; i<n; ++i) {
        VkVerticesXPositions[i].second = targetVerticeXPositions[i];
    }
}


void LayoutDrawer::drawUncolouredPartOfGraph(
    const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    uint32_t kl, 
    const std::pair<double, double>& boxBounds
) {

    const auto [leftBoxBound, rightBoxBound] = boxBounds;
    const double W = rightBoxBound - leftBoxBound;
    double h = m_algorithmParams.minYDistanceBetweenUncolouredLevels;
    auto& graph = *m_graph;
    SparseArray<uint32_t> uncolouredVerticesOrderOnTheirLevel(graph.getVertexCount(), 0);

    auto Vkl = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(kl);
    size_t nkl = Vkl.size();
    std::vector<uint32_t> edgesToColourSum(nkl, 0);
    std::vector<uint32_t> edgesToAnyColourCounts(nkl, 0);

    // TODO: fix the get the level for first level colour 
    // (i.e. colour which satisfies parent == null)
    for (size_t i=0; i<nkl; ++i) {
        uint32_t uIndex = Vkl[i];
        auto Nu = graph.N(uIndex);
        for (uint32_t vIndex : Nu) {
            uint32_t vColour = graph.getVertexColour(vIndex);
            // std::cout << uIndex << " " << vIndex << " " << vColour << " " << m_colourNodesPtrs[vColour]->parent->colour << "\n";
            if (vColour != 0 && m_colourNodesPtrs[vColour]->parent->colour == 0) {
                edgesToColourSum[i] += vColour;
                ++edgesToAnyColourCounts[i];
            }
        }
    }

    std::vector<std::pair<uint32_t, double>> E;
    E.reserve(nkl);
    for (size_t i=0; i<nkl; ++i) {
        E.emplace_back(
            Vkl[i], 
            (edgesToAnyColourCounts[i] != 0) 
                ? (static_cast<double>(edgesToColourSum[i]) / static_cast<double>(edgesToAnyColourCounts[i]))
                : std::numeric_limits<double>::max()
        );
    }
    std::sort(
        E.begin(), E.end(), 
        [](const auto& a, const auto& b) -> bool {
            return a.second < b.second;
        }
    );

    std::string firstUncolouredLevelOrderStr = "";
    double s = W / (static_cast<double>(nkl+1));
    for (size_t i=0; i<nkl; ++i) {
        const auto& [vIndex, vIndexValue] = E[i];
        uncolouredVerticesOrderOnTheirLevel[vIndex] = i+1;
        m_layoutPositions[vIndex] = {
            leftBoxBound + static_cast<double>(i)*s, 
            -h
        };

        if (firstUncolouredLevelOrderStr.size() != 0) {
            firstUncolouredLevelOrderStr += ", ";
        }
        firstUncolouredLevelOrderStr += std::to_string(vIndex) + "(" + std::to_string(vIndexValue) + ")";
    }

    logging::log_debug(
        "First uncoloured level order: " + firstUncolouredLevelOrderStr + "."
    );

    logging::log_trace(
        "Checking h for first uncoloured level in graph" +
        std::string(m_optLogGraphId.has_value() ? " with id = " + m_optLogGraphId.value() : "") +
        "..."
    );

    double maxDistanceAlongXAxisBetweenChildAndParent = 0;
    for (size_t i=0; i<nkl; ++i) {
        uint32_t vIndex = Vkl[i];
        auto Nv = graph.N(vIndex);
        for (uint32_t uIndex : Nv) {
            if (graph.getVertex(uIndex).level != kl+1) continue;
            maxDistanceAlongXAxisBetweenChildAndParent = std::max(
                maxDistanceAlongXAxisBetweenChildAndParent, 
                std::abs(m_layoutPositions[vIndex].first - m_layoutPositions[uIndex].first) 
            );
            logging::log_trace(
                "After comparing between " + std::to_string(vIndex) + " and " +
                std::to_string(uIndex) + ", max distance along x axis bcap is " +
                std::to_string(maxDistanceAlongXAxisBetweenChildAndParent) + "."
            );
        }
    }

    h = std::max(
        h, m_algorithmParams.minDistanceBetweenLevelsCoeff * maxDistanceAlongXAxisBetweenChildAndParent
    );
    std::cout << "h for first uncoloured in graph: " << h << "\n";
    logging::log_trace(
        "Checked h for first uncoloured level in graph" +
        std::string(m_optLogGraphId.has_value() ? " with id = " + m_optLogGraphId.value() : "") +
        ", h = " + std::to_string(h) + "."
    );

    for (size_t i=0; i<nkl; ++i) {
        uint32_t vIndex = Vkl[i];
        m_layoutPositions[vIndex].second = -h;
    }

    // static const double sqrt2 = std::sqrt(2.0);
    // h += std::max(
    //     m_algorithmParams.minYDistanceBetweenUncolouredLevels, 
    //     Vkl.size() / sqrt2
    // );
    int k = kl-1;
    while (k >= 0) {
        auto Vk = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(k);
        size_t nk = Vk.size();
        edgesToColourSum = std::vector<uint32_t>(nk, 0);
        edgesToAnyColourCounts = std::vector<uint32_t>(nk, 0);

        for (size_t i=0; i<nk; ++i) {
            uint32_t uIndex = Vk[i];
            auto Nu = graph.N(uIndex);
            for (uint32_t vIndex : Nu) {
                // uint32_t vColour = graph.getVertexColour(vColour);
                if (graph.getVertex(vIndex).level <= kl) {
                    edgesToColourSum[i] += uncolouredVerticesOrderOnTheirLevel.dataAtOrDefault(vIndex);
                    ++edgesToAnyColourCounts[i];
                }
            }
        }

        E.clear();
        E.reserve(nk);
        for (size_t i=0; i<nk; ++i) {
            E.emplace_back(
                Vk[i], 
                (edgesToAnyColourCounts[i] != 0) 
                    ? (edgesToColourSum[i] / edgesToAnyColourCounts[i])
                    : std::numeric_limits<double>::max()
            );
        }
        std::sort(
            E.begin(), E.end(), 
            [](const auto& a, const auto& b) -> bool {
                return a.second < b.second;
            }
        );

        double s = W / (static_cast<double>(nkl+1));
        for (size_t i=0; i<nk; ++i) {
            const auto& [vIndex, _] = E[i];
            uncolouredVerticesOrderOnTheirLevel[vIndex] = i+1;
            m_layoutPositions[vIndex] = {
                leftBoxBound + static_cast<double>(i)*s, 
                0
            };
        }

        maxDistanceAlongXAxisBetweenChildAndParent = 0;
        for (size_t i=0; i<nk; ++i) {
            uint32_t vIndex = Vk[i];
            auto Nv = graph.N(vIndex);
            for (uint32_t uIndex : Nv) {
                if (graph.getVertex(uIndex).level != k+1) continue;
                maxDistanceAlongXAxisBetweenChildAndParent = std::max(
                    maxDistanceAlongXAxisBetweenChildAndParent, 
                    std::abs(m_layoutPositions[vIndex].first - m_layoutPositions[uIndex].first) 
                );
            }
        }

        h += std::max(
            m_algorithmParams.minYDistanceBetweenUncolouredLevels, 
            m_algorithmParams.minDistanceBetweenLevelsCoeff * maxDistanceAlongXAxisBetweenChildAndParent
        );

        for (size_t i=0; i<nk; ++i) {
            uint32_t vIndex = Vk[i];
            m_layoutPositions[vIndex].second = -h;
        }

        // h += std::max(
        //     m_algorithmParams.minYDistanceBetweenUncolouredLevels,
        //     Vk.size() / sqrt2
        // );
        --k;
    }

    // uint32_t rootIndex = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(0)[0];
    // m_layoutPositions[rootIndex] = {leftBoxBound + W*0.5, -h};
}

#undef EPS_FOR_SIGNUM
#undef _signum

}