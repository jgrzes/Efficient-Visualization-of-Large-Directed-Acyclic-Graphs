#include "Layout_Drawer.h"

#include <limits>

#include "../utils/input_generation_for_qap.h"
#include "../graph-preprocessing/assign_levels.h"

namespace algorithms {

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

    SparseArray<double> epsilonsForVertices(n, defaultEpsilon);
    for (uint32_t colourRootIndex : verticesWithCustomEpsilons) {
        epsilonsForVertices[colourRootIndex] = findEpsilonForColourRoot(colourRootIndex);
    }

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


    }

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
        // std::swap(verticesWithCustomEpsilons.front(), verticesWithCustomEpsilons.back());
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


double LayoutDrawer::findEpsilonForColourRoot(uint32_t colourRootIndex) {
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

    return m_algorithmParams.epsilonForColourRootCalculator(maxVertexCountOnASingleLevel);
}

}