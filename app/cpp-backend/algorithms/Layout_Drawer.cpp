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
    m_graph = &graph;
    m_rootColourNode = &rootColourNode;

    std::vector<uint32_t> verticesWithCustomEpsilons;
    uint32_t vertexCountBeforeColourRootFixing = graph.getVertexCount();
    findVerticesWithCustomEpsilonsAndFixColourRoots(verticesWithCustomEpsilons);

    size_t n;
    if (vertexCountBeforeColourRootFixing != (n = graph.getVertexCount())) {
        assignLevelsInGraph(graph);
    }

    uint32_t maxColourIndex = findMaxColourIndexInColourHierarchy(rootColourNode);
    m_pinkIndices = std::vector<uint32_t>(maxColourIndex+1);
    m_blueIndices = std::vector<uint32_t>(maxColourIndex+1);
    m_maxColour = maxColourIndex;
    performPinkIndicesConstruction();
    performBlueIndicesConstruction();

    ArrayOfArrays<uint32_t> verticesPerLevel = graph_preprocessing::findVerticesPerLevels(graph);

    emplaceColourNodesInArray();
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

            return {uColour, nv->depth};
        }
    };

    buildBaseCumFInterspring(
        std::forward<EqualColourDepthColourFinderT>(equalColourDepthColourFinder)
    );
    transferFInterspringUpwards(verticesPerLevel);

    m_epsilonsForVertices = SparseArray<double>(n, defaultEpsilon);
    findEpsilonsForColourRoots();
    
    // for (uint32_t colourRootIndex : verticesWithCustomEpsilons) {
        // epsilonsForVertices[colourRootIndex] = findMaxWidthForColourSubgraphNotNested(colourRootIndex);
        // auto& colourNode = m_colourNodesPtrs[graph.getVertexColour(colourRootIndex)];
    // }

    // Layout positions vector initialization
    m_layoutPositions = std::vector<std::pair<double, double>>(n, {0, 0});

    #define _getColourRoot(_colourNode) (_colourNode.verticesOfColour.front())
    double leftBoxBoudForUncoloured = 0;
    double rightBoxBoundForUncoloured = 0;
    double offsetFromZero = 0;
    for (const auto& firstLevelColourNode : rootColourNode.children) {
        ArrayOfArrays<uint32_t> verticesPerLevelForColour = graph_preprocessing::findVerticesPerLevels(
            firstLevelColourNode.verticesOfColour, graph, true
        );

        if (verticesPerLevelForColour.getSizeOfArr(0) != 1) {
            throw std::runtime_error{
                "Layout Drawer error: after graph modifications each colour should have exactly one colour root"
            };
        }

        double WColour = 0.5 * m_epsilonsForVertices[_getColourRoot(firstLevelColourNode)];
        findLayoutForColouredSubgraph(
            verticesPerLevelForColour, {offsetFromZero, 0}, 
            {offsetFromZero - WColour, offsetFromZero + WColour}
        );
        offsetFromZero += (2.0 * WColour) + m_algorithmParams.firstLevelChildPadding;
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
        for (uint32_t vIndex : levelViewI) {
            if (graph.getVertexColour(vIndex) != 0) break;
        }
        lastLevelWithNoColoured = i;
    }

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
        
        for (uint32_t rcIndex : colourRoots) {
            graph.addNewEdge(newColourRootIndex, rcIndex);
            for (uint32_t vIndex : graph.NR(rcIndex)) {
                // TODO: Decide if should include:
                // graph.removeEdge(vIndex, rcIndex);
                graph.addNewEdge(vIndex, newColourRootIndex);
            }
        }

        verticesWithCustomEpsilons.emplace_back(newColourRootIndex);
        // Make sure that if new root exists it is the first in the array
        // to allow `findLayoutForGraph` check if it needs to recompute levels efficiently.
        std::swap(verticesWithCustomEpsilons.front(), verticesWithCustomEpsilons.back());
        colourNode.verticesOfColour.emplace_back(newColourRootIndex);
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

    m_colourNodesPtrs[colourNode.colour] = &colourNode;    
    for (auto& colourNodeChild : colourNode.children) {
        performEmplacingColourNodesInArrayForColourSubtree(std::ref(colourNodeChild));
    }
}


void LayoutDrawer::emplaceColourNodesInArray() {
    m_colourNodesPtrs.resize(m_maxColour);
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

        uint32_t uPinkIndex = m_pinkIndices[uColour];
        uint32_t uBlueIndex = m_blueIndices[uColour];

        const auto Nu = graph.N(uIndex);
        for (uint32_t vIndex : Nu) {
            uint32_t vColour = graph.getVertexColour(vIndex);
            if (!(m_pinkIndices[vColour] > uPinkIndex || m_blueIndices[vColour] > uBlueIndex)) continue;
            
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
            auto cumFInterspringU = m_cumFInterspring[uIndex];

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
    
    for (auto& colourNodeChild : colourNode.children) {
        findEpsilonsForColourRoots(colourNodeChild);
    }

    if (colourNode.parent != nullptr) {
        uint32_t colourRootIndex = _getColourRoot(colourNode);
        double epsilon = m_algorithmParams.epsilonForColourRootCalculator(
            findMaxWidthForColourSubgraphNotNested(colourRootIndex)
        );
        double childrenEpsilonSum = 0;
        for (auto& colourNodeChild : colourNode.children) {
            childrenEpsilonSum += m_epsilonsForVertices[_getColourRoot(colourNodeChild)];
        }

        m_epsilonsForVertices[colourRootIndex] = std::max(epsilon, childrenEpsilonSum);
    }
    #undef _getColourRoot
}


void LayoutDrawer::findLayoutForColouredSubgraph(
    const ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
    const std::pair<double, double>& startingPositionForColourRoot, 
    const std::pair<double, double>& boxBounds
) {

    findInitialLayoutForColouredSubgraph(
        const_cast<ArrayOfArraysInterface<uint32_t>&>(verticesPerLevelForColour), 
        startingPositionForColourRoot, boxBounds
    ); 

    // TODO: Implement force directed tuning
}


void LayoutDrawer::findInitialLayoutForColouredSubgraph(
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
    if (k == n) return; // Should never happend but better safe than sorry.

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
    m_layoutPositions[Vk[0]] = startingPositionForColourRoot;

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

            m_layoutPositions[vIndex] = {vPositionX, vPositionY};
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
            createGapsAlongXAxisBetweenVertices(VkVerticesXPositions, boxBounds);
            for (const auto& [vIndex, newVPositionX] : VkVerticesXPositions) {
                m_layoutPositions[vIndex].first = newVPositionX;
            } 
        }

        ++k;
    }
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

        return std::make_unique<Fcs>(v, m_layoutPositions[vIndex].first);
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
            xValuesToCheck.emplace_back(castedToArray1->operator[](0));
            xValuesToCheck.emplace_back(castedToArray1->operator[](1));
            xValuesToCheck.emplace_back(castedToArray1->operator[](2));
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
    const std::pair<double, double>& boxBounds
) {

    size_t n = VkVerticesXPositions.size() - 1;
    const auto [leftBoxBound, rightBoxBound] = boxBounds;
    std::optional<double> gamma = std::nullopt;

    double mu, mv, delta;
    // From left to right
    for (size_t i=0; i<n; ++i) {
        createGapForTwoConsecutiveVertices(
            VkVerticesXPositions, i, gamma, boxBounds
        );
    }

    // From right to left
    for (int i=n-1; i>=0; --i) {
        createGapForTwoConsecutiveVertices(
            VkVerticesXPositions, i, gamma, boxBounds
        );
    }

    // TODO: Perform checking if gaps actually satisfy the epsilons
}


void LayoutDrawer::createGapForTwoConsecutiveVertices(
    std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions, 
    size_t i, std::optional<double>& gamma,
    const std::pair<double, double>& boxBounds
) {

    size_t n = VkVerticesXPositions.size() - 1;
    double mu, mv;
    auto& [uIndex, pu] = VkVerticesXPositions[i];
    auto& [vIndex, pv] = VkVerticesXPositions[i+1];
    double epsUV = pv - pu;

    // TODO: Decide if should always use the default value of custom values
    const double minRequiredEpsUV = std::max(
        m_epsilonsForVertices.dataAtOrDefault(uIndex),
        m_epsilonsForVertices.dataAtOrDefault(vIndex)
    ) / 2; // Actually I don't exactly remember if division by 2 should be here

    if (!gamma.has_value() && epsUV < minRequiredEpsUV) {
        mu = pu - ((i == 0) ? boxBounds.first : (VkVerticesXPositions[i-1].second + minRequiredEpsUV));
        mv = -pv + ((i == n-1) ? boxBounds.second : (VkVerticesXPositions[i+2].second - minRequiredEpsUV));
        mu = std::max(mu, 0.0);
        mv = std::max(mv, 0.0);
        pu -= mu;
        pv += mv;
        if ((epsUV = pv - pu) < minRequiredEpsUV) {
            gamma = minRequiredEpsUV - epsUV;
        }
    } else if (gamma.has_value()) {
        if (epsUV >= minRequiredEpsUV + gamma.value()) {
            pu += gamma.value();
            gamma = std::nullopt;
            return;
        }
        mv = -pv + ((i == n-1) ? boxBounds.second : (VkVerticesXPositions[i+2].second - minRequiredEpsUV));
        mv = std::max(mv, 0.0);
        pv += mv;
        epsUV = pv - pu;
        double delta = minRequiredEpsUV + gamma.value() - epsUV;
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
            uint32_t vColour = graph.getVertexColour(vColour);
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
}


#undef EPS_FOR_SIGNUM
#undef _signum

}