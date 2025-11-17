#include "Layout_Drawer.h"

#include <limits>
#include <execution>

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

    // std::cout << "Colour node: " << rootColourNode.colour << "\n";

    logging::log_trace(
        "Fixing root colour nodes for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    std::vector<uint32_t> verticesWithCustomEpsilons;
    uint32_t vertexCountBeforeColourRootFixing = graph.getVertexCount();
    findVerticesWithCustomEpsilonsAndFixColourRoots(verticesWithCustomEpsilons);
    logging::log_debug(
        "Fixed root colour nodes for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "."
    );

    size_t n = graph.getVertexCount();
    if (vertexCountBeforeColourRootFixing != n) {
        logging::log_trace(
          "Recomputing node levels for graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + "(neccessary because new root colour nodes have been added)."
        );
        assignLevelsInGraph(graph);
        logging::log_trace(
          "Successfully recomputed node levels for graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + "."
        );
    }

    uint32_t maxColourIndex = findMaxColourIndexInColourHierarchy(rootColourNode);
    m_pinkIndices = std::vector<uint32_t>(maxColourIndex+1);
    m_blueIndices = std::vector<uint32_t>(maxColourIndex+1);
    m_maxColour = maxColourIndex;
    logging::log_trace(
        "Performing pink and blue indices construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    performPinkIndicesConstruction();
    performBlueIndicesConstruction();
        logging::log_debug(
        "Performing pink and blue indices construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );

    ArrayOfArrays<uint32_t> verticesPerLevel = graph_preprocessing::findVerticesPerLevels(graph);
    // n = verticesPerLevel.getNumberOfNestedArrays();
    // for (size_t i=0; i<n; ++i) {
    //     std::cout << "On level " << i << ": ";
    //     auto levelViewI = verticesPerLevel.getNestedArrayView(i);
    //     for (uint32_t vIndex : levelViewI) {
    //         std::cout << vIndex << " ";
    //     }
    //     std::cout << "\n";
    // }

    logging::log_trace(
        "Performing cumulative interspring force array construction for graph"
        + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
        + "..."
    );
    emplaceColourNodesInArray();
    auto equalColourDepthColourFinder = [this](uint32_t uColour, uint32_t vColour) -> std::pair<uint32_t, uint32_t> {
        uint32_t uDepth = (this->m_colourNodesPtrs)[uColour]->depth;
        uint32_t vDepth = (this->m_colourNodesPtrs)[vColour]->depth;
        // std::cout << "Colours: " << uColour << " " << vColour << "depts: " << uDepth << " " << vDepth << "\n";
        if (uDepth == vDepth) return {uColour, vColour};
        else if (uDepth > vDepth) {
            ColourHierarchyNode* nu = (this->m_colourNodesPtrs)[uColour];
            while (nu->depth != vDepth) {
                // std::cout << "u: " << nu->colour << " " << nu->depth << " " << nu->parent << " " << nu->parent->colour << "\n";
                nu = const_cast<ColourHierarchyNode*>(nu->parent);
            }

            return {nu->colour, vColour};
        } else {
            ColourHierarchyNode* nv = (this->m_colourNodesPtrs)[vColour];
            while (nv->depth != uDepth) {
                // std::cout << "v: " << nv->colour << " " << nv->depth << " " << nv->parent << " " << nv->parent->colour << "\n";
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
    
    // for (uint32_t colourRootIndex : verticesWithCustomEpsilons) {
        // epsilonsForVertices[colourRootIndex] = findMaxWidthForColourSubgraphNotNested(colourRootIndex);
        // auto& colourNode = m_colourNodesPtrs[graph.getVertexColour(colourRootIndex)];
    // }

    // Layout positions vector initialization
    n = graph.getVertexCount();
    m_layoutPositions = std::vector<std::pair<double, double>>(n, {0, 0});

    #define _getColourRoot(_colourNode) (_colourNode.verticesOfColour.front())
    double leftBoxBoudForUncoloured = 0;
    double rightBoxBoundForUncoloured = 0;
    double offsetFromZero = 0;
    double previousRightXBorder = 0;
    for (const auto& firstLevelColourNode : rootColourNode.children) {
        // std::cout << "First level colour: " << firstLevelColourNode.colour << "\n";
        if (firstLevelColourNode.verticesOfColour.empty()) continue;
        ArrayOfArrays<uint32_t> verticesPerLevelForColour = graph_preprocessing::findVerticesPerLevels(
            firstLevelColourNode.verticesOfColour, graph, true
        );

        if (verticesPerLevelForColour.getSizeOfArr(0) != 1) {
            throw std::runtime_error{
                "Layout Drawer error: after graph modifications each colour should have exactly one colour root"
            };
        }

        double WColour = 0.5 * m_epsilonsForVertices.dataAtOrDefault(_getColourRoot(firstLevelColourNode));
        offsetFromZero += std::max(previousRightXBorder - (offsetFromZero - WColour) + m_algorithmParams.firstLevelChildPadding, 0.0);
        // std::cout << "WColour: " << WColour << "\n";
        findLayoutForColouredSubgraph(
            verticesPerLevelForColour, {offsetFromZero, 0}, 
            {offsetFromZero - WColour, offsetFromZero + WColour}
        );
        previousRightXBorder = offsetFromZero + WColour + m_algorithmParams.firstLevelChildPadding;
        offsetFromZero += (2.0 * WColour) + m_algorithmParams.firstLevelChildPadding;
        // std::cout << "Offset from zero: " << offsetFromZero << "\n";
        rightBoxBoundForUncoloured = offsetFromZero;
    }
    #undef _getColourRoot

    rightBoxBoundForUncoloured = std::max(
        m_algorithmParams.minBoxWidthForUncoloured, 
        rightBoxBoundForUncoloured - leftBoxBoudForUncoloured
    );

    uint32_t lastLevelWithNoColoured = 0;
    n = verticesPerLevel.getNumberOfNestedArrays();
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
    return m_layoutPositions;
}


void LayoutDrawer::findVerticesWithCustomEpsilonsAndFixColourRoots(
    std::vector<uint32_t>& verticesWithCustomEpsilons, 
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get() 
        : *m_rootColourNode;

    std::vector<uint32_t> colourRoots = getColourRoots(colourNode, true);
    size_t n = colourRoots.size();
    if (n >= 2) {
        auto& graph = *m_graph;
        uint32_t newColourRootIndex = graph.getVertexCount();
        graph.addNewVertex();
        graph.setVertexColour(newColourRootIndex, colourNode.colour);
        
        std::string NForNewColourRootStr = "[";
        std::string NrForNewColourRootStr = "["; 

        for (uint32_t rcIndex : colourRoots) {
            for (uint32_t vIndex : graph.NR(rcIndex)) {
                // TODO: Decide if should include:
                // graph.removeEdge(vIndex, rcIndex);
                NrForNewColourRootStr += (NrForNewColourRootStr.size() > 1 ? ", " : "") + std::to_string(vIndex);
                graph.addNewEdge(vIndex, newColourRootIndex);
            }
            NForNewColourRootStr += (NrForNewColourRootStr.size() > 1 ? ", " : "") + std::to_string(rcIndex);
            graph.addNewEdge(newColourRootIndex, rcIndex);
        }

        NForNewColourRootStr += "]";
        NrForNewColourRootStr += "]";
        verticesWithCustomEpsilons.emplace_back(newColourRootIndex);
        std::swap(verticesWithCustomEpsilons.front(), verticesWithCustomEpsilons.back());
        colourNode.verticesOfColour.emplace_back(newColourRootIndex);

        logging::log_debug(
            "Adding new colour graph root for graph"
            + (m_optLogGraphId.has_value() ? (" with id = " + m_optLogGraphId.value()) : "")
            + ", v = " + std::to_string(newColourRootIndex) + ", N(v) = "
            + NForNewColourRootStr + ", Nr(v) = " + NrForNewColourRootStr + "."
        );

    } else if (n == 1) {
        verticesWithCustomEpsilons.emplace_back(colourRoots.front());
    }

    for (auto& colourNodeChild : colourNode.children) {
        findVerticesWithCustomEpsilonsAndFixColourRoots(
            verticesWithCustomEpsilons, std::ref(colourNodeChild)
        );
    }
}


std::vector<uint32_t> LayoutDrawer::getColourRoots(ColourHierarchyNode& colourNode, bool pushRootsToTheFront) {
    std::vector<uint32_t> colourRoots;
    int64_t minLevelForColour = std::numeric_limits<int64_t>::max();
    auto& graph = *m_graph;
    for (uint32_t uIndex : colourNode.verticesOfColour) {
        minLevelForColour = std::min(minLevelForColour, graph.getVertex(uIndex).level);
    }

    size_t n = colourNode.verticesOfColour.size();
    for (size_t i=0; i<n; ++i) {
        if (graph.getVertex(colourNode.verticesOfColour[i]).level == minLevelForColour) {
            colourRoots.emplace_back(i);
        }
    }

    n = colourRoots.size();
    if (pushRootsToTheFront) {
        for (size_t i=0; i<n; ++i) {
            std::swap(
                colourNode.verticesOfColour[i],
                colourNode.verticesOfColour[colourRoots[i]]
            );
            colourRoots[i] = i;
        }
    }
    
    // Let's just reuse the same vector to avoid unnecessary memory allocations.
    std::transform(
        colourRoots.begin(), colourRoots.end(), 
        colourRoots.begin(), 
        [&verticesOfColour = colourNode.verticesOfColour](uint32_t colourRootIndex) -> uint32_t {
            return verticesOfColour[colourRootIndex];
        }
    );

    return std::move(colourRoots);
}


void LayoutDrawer::performPinkIndicesConstruction(
    // std::vector<uint32_t>& pinkIndices, 
    uint32_t currentPink,
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;

    uint32_t colour = colourNode.colour;
    m_pinkIndices[colour] = currentPink++;
    size_t n = colourNode.children.size();
    for (size_t i=0; i<n; ++i) {
        auto& colourNodeChild = colourNode.children[i];
        performPinkIndicesConstruction(
            currentPink, std::ref(colourNodeChild)
        );
    }
}


void LayoutDrawer::performBlueIndicesConstruction(
    // std::vector<uint32_t>& blueIndices, 
    uint32_t currentBlue,
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;

    uint32_t colour = colourNode.colour;
    m_blueIndices[colour] = currentBlue++;
    int64_t n = colourNode.children.size();
    for (int64_t i=n-1; i>=0; --i) {
        auto& colourNodeChild = colourNode.children[i];
        performPinkIndicesConstruction(
            currentBlue, std::ref(colourNodeChild)
        );
    }
}


void LayoutDrawer::performEmplacingColourNodesInArrayForColourSubtree(
    std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode
) {

    auto& colourNode = optColourNode.has_value()
        ? optColourNode.value().get()
        : *m_rootColourNode;

    // std::cout << m_colourNodesPtrs.size() << " " << colourNode.colour << "\n";
    m_colourNodesPtrs[colourNode.colour] = &colourNode;    
    for (auto& colourNodeChild : colourNode.children) {
        performEmplacingColourNodesInArrayForColourSubtree(std::ref(colourNodeChild));
    }
}


void LayoutDrawer::emplaceColourNodesInArray() {
    m_colourNodesPtrs.resize(m_maxColour+1);
    performEmplacingColourNodesInArrayForColourSubtree();
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
            else if (!(m_pinkIndices[vColour] > uPinkIndex || m_blueIndices[vColour] > uBlueIndex)) continue;
            
            uint32_t uColourFixed, vColourFixed;
            std::tie(uColourFixed, vColourFixed) = equalColourDepthColourFinder(uColour, vColour);

            m_cumFInterspring[uIndex] += m_algorithmParams.FInterspringCalculator(
                uColourFixed, uLevel, vColourFixed, graph.getVertex(vIndex).level
            );
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
            uint32_t uColour = graph.getVertexColour(uColour);
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
    for (auto& colourNodeChild : colourNode.children) {
        findEpsilonsForColourRoots(colourNodeChild);
    }

    if (colourNode.parent != nullptr && !colourNode.verticesOfColour.empty()) {
        uint32_t colourRootIndex = _getColourRoot(colourNode);
        double epsilon = m_algorithmParams.epsilonForColourRootCalculator(
            findMaxWidthForColourSubgraphNotNested(colourRootIndex)
        );
        double childrenEpsilonSum = 0;
        for (auto& colourNodeChild : colourNode.children) {
            childrenEpsilonSum += m_epsilonsForVertices[_getColourRoot(colourNodeChild)];
        }
        // std::cout << "Epsilon candidates for " << colourRootIndex << ": ";
        // std::cout << epsilon << ", " << childrenEpsilonSum << "\n";
        m_epsilonsForVertices[colourRootIndex] = std::max(epsilon, childrenEpsilonSum);
    }
    #undef _getColourRoot
}


void LayoutDrawer::findLayoutForColouredSubgraph(
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
    std::cout << "[CR]: " << startingPositionForColourRoot.first << ", " << startingPositionForColourRoot.second << "\n";
    std::cout << "[CR] Box bounds: " << boxBounds.first << ", " << boxBounds.second << "\n";
    double largestYCoord = findInitialLayoutForColouredSubgraph(
        const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevelForColour), 
        startingPositionForColourRoot, boxBounds
    ); 

    // TODO: Implement force directed tuning
    // Pad the height if needed just to be extra safe.
    constexpr size_t gridRowCountDivisior = 3;
    constexpr size_t gridColumnCountDivisor = 3;

    size_t gridRowCount, gridColumnCount; 
    if (largestYCoord - startingPositionForColourRoot.second < EPS_FOR_SIGNUM) {
        largestYCoord += EPS_FOR_SIGNUM;
        gridColumnCount = 1;
    } else {
        gridColumnCount = verticesPerLevelForColour.getNumberOfNestedArrays() / gridRowCountDivisior;
    }
    gridRowCount = m_algorithmParams.maxVertexCountFromEpsilonCalculator(
        boxBounds.second - boxBounds.first
    ) / gridColumnCountDivisor;
    if (gridRowCount == 0 || gridColumnCount == 0) return;

    CartesianSurfaceGrid<uint32_t, decltype(&m_layoutPositions), size_t> grid(
        std::pair<double, double>{boxBounds.first, startingPositionForColourRoot.second}, 
        std::pair<double, double>{boxBounds.second, largestYCoord}, 
        gridRowCount, gridColumnCount, &m_layoutPositions
    );

    uint32_t iter = 0;
    // TODO: Remember to find better logic for end condition in fine tuning

    size_t n = verticesPerLevelForColour.getNumberOfNestedArrays();
    std::vector<ArrayOfArraysInterface<uint32_t>::NestedArrayView> verticesLevelArrayViews;
    verticesLevelArrayViews.reserve(n);
    for (size_t level=0; level<n; ++level) {
        verticesLevelArrayViews.emplace_back(const_cast<ArrayOfArraysInterface<uint32_t>&>(
            verticesPerLevelForColour
        ).getNestedArrayView(level));    
    }

    ArrayOfArrays<std::pair<double, double>> forcesAffectingVertices(
        verticesPerLevelForColour.getSizesOfNestedArrays()
    );
    std::vector<ArrayOfArraysInterface<std::pair<double, double>>::NestedArrayView> forceAffectingVerticesArrayViews;
    forceAffectingVerticesArrayViews.reserve(n);
    for (size_t level=0; level<n; ++level) {
        forceAffectingVerticesArrayViews.emplace_back(
            forcesAffectingVertices.getNestedArrayView(level)
        );
    }

    for (size_t level=0; level<n; ++level) {
        auto& verticeLevelViewI = verticesLevelArrayViews[level];
        auto& forceEffectLevelViewI = forceAffectingVerticesArrayViews[level];
        size_t ni = verticeLevelViewI.size();
        // Apply forces
        for (size_t j=0; j<ni; ++j) {
            uint32_t uIndex = verticeLevelViewI[j];
            grid.emplaceNewElement(uIndex, m_layoutPositions[uIndex]);
        }
    }

    while (!checkIfFineTuningStageEndConditionMet(iter)) {
        // std::cout << "Iter " << iter << " of fine tuning...\n";
        for (size_t level=0; level<n; ++level) {
            auto& verticeLevelViewI = verticesLevelArrayViews[level];
            auto& forceEffectLevelViewI = forceAffectingVerticesArrayViews[level];
            
            // Calculate spring and repulsion forces on each vertex 
            size_t ni = verticeLevelViewI.size();
            for (size_t j=0; j<ni; ++j) {
                uint32_t uIndex = verticeLevelViewI[j];
                std::pair<double, double> forceAffectingU(0, 0);
                auto uPosition = m_layoutPositions[uIndex];
                auto uLevel = graph.getVertex(uIndex).level;
                // Calculating spring forces 
                auto Nu = graph.N(uIndex);
                for (uint32_t vIndex : Nu) {
                    if (graph.getVertexColour(vIndex) != colour) continue;
                    forceAffectingU += m_algorithmParams.springFCalculator(
                        m_layoutPositions[vIndex] - uPosition
                    ) * std::pair<double, double>{1, (uLevel > graph.getVertex(vIndex).level ? 0 : 1)};
                }

                auto Nru = graph.NR(uIndex);
                for (uint32_t wIndex : Nru) {
                    if (graph.getVertexColour(wIndex) != colour) continue;
                    forceAffectingU += m_algorithmParams.springFCalculator(
                        m_layoutPositions[wIndex] - uPosition
                    ) * std::pair<double, double>{1, (uLevel > graph.getVertex(wIndex).level ? 0 : 1)};
                }

                // Calculating 
                auto verticesInRepulsionFieldOfU = grid.getElementsAtMaxDisFromElement(
                    uIndex, m_algorithmParams.maxRadiusOfRepulsionField
                );
                for (uint32_t pIndex : verticesInRepulsionFieldOfU) {
                    // TODO: Decide if this should be included
                    // if (Nu.contains(pIndex) || Nru.contains(pIndex)) continue;
                    forceAffectingU += m_algorithmParams.repulsionFCalculator(
                        uPosition - m_layoutPositions[pIndex], 
                        (Nu.contains(pIndex) || Nru.contains(pIndex))
                    );
                }

                forceEffectLevelViewI[j] = forceAffectingU;
            }
        }

        for (size_t level=0; level<n; ++level) {
            auto& verticeLevelViewI = verticesLevelArrayViews[level];
            auto& forceEffectLevelViewI = forceAffectingVerticesArrayViews[level];
            size_t ni = verticeLevelViewI.size();
            // Apply forces
            for (size_t j=0; j<ni; ++j) {
                uint32_t uIndex = verticeLevelViewI[j];
                auto forceAffectingU = forceEffectLevelViewI[j];
                m_layoutPositions[uIndex] += m_algorithmParams.fineTuningForceMoveCoeff * forceAffectingU;
                auto& uPositionX = m_layoutPositions[uIndex].first;
                auto& uPositionY = m_layoutPositions[uIndex].second;
                // m_layoutPositions[uIndex].first = std::min(std::max(boxBounds.first, m_la))
                uPositionX = std::min(std::max(boxBounds.first, uPositionX), boxBounds.second);
                uPositionY = std::min(std::max(startingPositionForColourRoot.second, uPositionY), largestYCoord);

                grid.moveElementToNewPosition(uIndex, m_layoutPositions[uIndex]);
            }
        }

        ++iter;
    }

}


double LayoutDrawer::findInitialLayoutForColouredSubgraph(
    ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
    const std::pair<double, double>& startingPositionForColourRoot, 
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
    if (k == n) return {boxBounds.second}; // Should never happend but better safe than sorry.

    auto& graph = *m_graph;
    auto Vk = verticesPerLevelForColour.getNestedArrayView(k++); 
    uint32_t colour = graph.getVertexColour(Vk[0]);

    if (Vk.size() != 1) {
        throw std::runtime_error{
            "Layout Drawer error: found colour subgraph (colour index = " 
            + std::to_string(colour) + ") has more than one colour root (instead has "
            + std::to_string(Vk.size()) + ")"
        };
    }
    
    double largestYCoord = startingPositionForColourRoot.second;
    m_layoutPositions[Vk[0]] = startingPositionForColourRoot;
    // std::cout << "[Colour Root] position for " << Vk[0] << ": (" << m_layoutPositions[Vk[0]].first << ", " << m_layoutPositions[Vk[0]].second << ")\n";

    // TODO: Consider if should trim trailing zero levels
    // (probably not really because that is already taken care of elsewhere).
    std::vector<double> predictedYCoords;
    predictedYCoords.reserve(n);
    predictedYCoords.emplace_back(startingPositionForColourRoot.second);
    for (size_t i=1; i<n; ++i) {
        predictedYCoords.emplace_back(
            predictedYCoords.back() + (
                m_algorithmParams.gAcceleration * (
                    m_algorithmParams.baseVerexWeight / m_algorithmParams.kInitialLayoutCoeff
                )
            )
        );
    }

    const auto [leftBoxBound, rightBoxBound] = boxBounds;    
    const double W = rightBoxBound - leftBoxBound;
    while (k < n) {
        Vk = verticesPerLevelForColour.getNestedArrayView(k);
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
        size_t nk = Vk.size();

        for (size_t i=0; i<nk; ++i) {
            uint32_t vIndex = Vk[i];
            uint32_t vLevel = graph.getVertex(vIndex).level;
            // TODO: Optimize function call by precomputing W / m_algorithmParams.sCoeff
            auto FCollectionV = buildFCollectionForVertex(
                vIndex, alreadyDrawnInVk, W / (Vk.size() * m_algorithmParams.sCoeff)
            );

            double vPositionX;
            if (!FCollectionV.empty()) {
                vPositionX = findPositionXThatMinimizesFCollection(FCollectionV, vLevel) + m_cumFInterspring.dataAtOr(vIndex, {0, 0}).first;
                vPositionX = std::max(leftBoxBound, std::min(rightBoxBound, vPositionX)); // make sure it does not breach box bounds
            } else {
                double FInterspringX = m_cumFInterspring.dataAtOr(vIndex, {0, 0}).first;
                vPositionX = (W - m_algorithmParams.marginPadding) * _signum(FInterspringX);
            }

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
                if (lowestParentY < uIndexYCoord) {
                    lowestParentY = uIndexYCoord;
                }
                ++numberOfColourParentsOfV;
            }
            if (numberOfColourParentsOfV == 0) lowestParentY = predictedYCoords[k-1];

            double d = 1.0 + m_algorithmParams.pullUpCoeff * static_cast<double>(numberOfColourParentsOfV);
            double vPositionY = lowestParentY + (
                (weightV * m_algorithmParams.gAcceleration) / (m_algorithmParams.kInitialLayoutCoeff * d)
            );

            // std::cout << "Initial position for " << vIndex << ": (" << vPositionX << ", " << vPositionY << ")\n";
            m_layoutPositions[vIndex] = {vPositionX, vPositionY};
            largestYCoord = std::max(largestYCoord, vPositionY);
            alreadyDrawnInVk.emplace(vIndex);
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
            // TODO: Make sure there no colour subgraph overlaps when having recursive colours
            double gapEpsilon = (0.5 * W) / (Vk.size() - 1);
            createGapsAlongXAxisBetweenVertices(VkVerticesXPositions, boxBounds, gapEpsilon);
            for (const auto& [vIndex, newVPositionX] : VkVerticesXPositions) {
                m_layoutPositions[vIndex].first = newVPositionX;
                // std::cout << "X Position after fixup for " << vIndex << ": " << newVPositionX << "\n";
            } 
        }

        ++k;
    }

    return largestYCoord;
}


std::vector<std::unique_ptr<LayoutDrawer::F>> LayoutDrawer::buildFCollectionForVertex(
    uint32_t uIndex, const std::unordered_set<uint32_t>& alreadyDrawnVerticesSet, double wPrim
) {

    auto& graph = *m_graph;
    uint32_t colour = graph.getVertexColour(uIndex);
    uint32_t uLevel = graph.getVertex(uIndex).level;
    std::vector<std::unique_ptr<F>> FCollectionV;

    auto Nrv = graph.NR(uIndex);
    for (uint32_t wIndex : Nrv) {
        if (graph.getVertexColour(wIndex) != colour) continue;
        FCollectionV.emplace_back(
            std::move(buildF(wIndex, uLevel, wPrim * m_algorithmParams.sCoeff))
        );
    }

    #define _setContains(_set, _key) (_set.find(_key) != _set.end())
    auto Nu = graph.N(uIndex);
    for (uint32_t vIndex : Nu) {
        auto Nrv = graph.NR(vIndex);
        for (uint32_t wIndex : Nrv) {
            if (uIndex == wIndex || graph.getVertexColour(wIndex) != colour) continue;
            if (const auto& w = graph.getVertex(wIndex);
                w.level < uLevel || w.level == uLevel && _setContains(alreadyDrawnVerticesSet, wIndex)) {

                FCollectionV.emplace_back(std::move(
                    buildF(wIndex, uLevel, wPrim * m_algorithmParams.sCoeff)
                ));
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


void LayoutDrawer::createGapsAlongXAxisBetweenVertices(
    std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions,
    const std::pair<double, double>& boxBounds, double gapEpsilon
) {

    // std::cout << "Box bounds: (" << boxBounds.first << ", " << boxBounds.second << ")\n";
    size_t n = VkVerticesXPositions.size() - 1;
    const auto [leftBoxBound, rightBoxBound] = boxBounds;
    std::optional<double> gamma = std::nullopt;

    // From left to right
    for (size_t i=0; i<n; ++i) {
        createGapForTwoConsecutiveVertices(
            VkVerticesXPositions, i, gamma, boxBounds, gapEpsilon
        );
    }

    // Gamma reset
    gamma = std::nullopt;
    // From right to left
    for (int i=n-1; i>=0; --i) {
        createGapForTwoConsecutiveVertices(
            VkVerticesXPositions, i, gamma, boxBounds, gapEpsilon
        );
    }

    // TODO: Perform checking if gaps actually satisfy the epsilons
}


void LayoutDrawer::createGapForTwoConsecutiveVertices(
    std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions, 
    size_t i, std::optional<double>& gamma,
    const std::pair<double, double>& boxBounds, double gapEpsilon
) {

    size_t n = VkVerticesXPositions.size() - 1;
    double mu, mv;
    auto& [uIndex, pu] = VkVerticesXPositions[i];
    auto& [vIndex, pv] = VkVerticesXPositions[i+1];
    double epsUV = pv - pu;

    // TODO: Decide if should always use the default value of custom values
    // const double gapEpsilon = std::max(
    //     m_epsilonsForVertices.dataAtOrDefault(uIndex),
    //     m_epsilonsForVertices.dataAtOrDefault(vIndex)
    // ) * 0.5; // Actually I don't exactly remember if division by 2 should be here

    if (!gamma.has_value() && epsUV < gapEpsilon) {
        mu = pu - ((i == 0) ? boxBounds.first : (VkVerticesXPositions[i-1].second + gapEpsilon));
        mv = -pv + ((i == n-1) ? boxBounds.second : (VkVerticesXPositions[i+2].second - gapEpsilon));
        mu = std::max(mu, 0.0);
        mv = std::max(mv, 0.0);
        pu -= mu;
        pv += mv;
        if ((epsUV = pv - pu) < gapEpsilon) {
            gamma = gapEpsilon - epsUV;
        }
    } else if (gamma.has_value()) {
        if (epsUV >= gapEpsilon + gamma.value()) {
            pu += gamma.value();
            gamma = std::nullopt;
            return;
        }
        mv = -pv + ((i == n-1) ? boxBounds.second : (VkVerticesXPositions[i+2].second - gapEpsilon));
        mv = std::max(mv, 0.0);
        pv += mv;
        epsUV = pv - pu;
        double delta = gapEpsilon + gamma.value() - epsUV;
        if (delta <= 0) {
            pu += gamma.value();
            gamma = std::nullopt;
        } else {
            pu += std::min(gamma.value(), epsUV);
            if (epsUV >= gamma.value()) gamma = 0;
            else gamma = gamma.value() - epsUV;
            gamma = gamma.value() + pv - pu;
            if (std::abs(gamma.value()) < EPS_FOR_SIGNUM) gamma = std::nullopt;
        }
    }
}


void LayoutDrawer::drawUncolouredPartOfGraph(
    const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    uint32_t kl, 
    const std::pair<double, double>& boxBounds
) {

    const auto [leftBoxBound, rightBoxBound] = boxBounds;
    const double W = rightBoxBound - leftBoxBound;
    double h = m_algorithmParams.yDistanceBetweenUncolouredLevels;
    auto& graph = *m_graph;
    SparseArray<uint32_t> uncolouredVerticesOrderOnTheirLevel(graph.getVertexCount(), 0);

    auto Vkl = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(kl);
    size_t nkl = Vkl.size();
    std::vector<uint32_t> edgesToColourSum(nkl, 0);
    std::vector<uint32_t> edgesToAnyColourCounts(nkl, 0);

    for (size_t i=0; i<nkl; ++i) {
        uint32_t uIndex = Vkl[i];
        auto Nu = graph.N(uIndex);
        for (uint32_t vIndex : Nu) {
            // std::cout << uIndex << " -> " << vIndex << "\n";
            uint32_t vColour = graph.getVertexColour(vIndex);
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
    for (size_t i=0; i<nkl; ++i) {
        const auto& [vIndex, _] = E[i];
        uncolouredVerticesOrderOnTheirLevel[vIndex] = i+1;
        m_layoutPositions[vIndex] = {
            leftBoxBound + static_cast<double>(i)*s, 
            -h
        };
    }

    h += m_algorithmParams.yDistanceBetweenUncolouredLevels;
    int k = kl-1;
    while (k >= 1) {
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
                -h
            };
        }

        h += m_algorithmParams.yDistanceBetweenUncolouredLevels;
        --k;
    }

    uint32_t rootIndex = const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevel).getNestedArrayView(0)[0];
    m_layoutPositions[rootIndex] = {leftBoxBound + W*0.5, -h};
}

#undef EPS_FOR_SIGNUM
#undef _signum

}