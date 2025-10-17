#ifndef ALGORITHMS__GRAPH_COLOURER_H
#define ALGORITHMS__GRAPH_COLOURER_H

#include <optional>
#include <functional>
#include <unordered_map>

#include "../data-structures/Coloured_Graph.h"
#include "../data-structures/Array_of_Arrays.h"
#include "../data-structures/Array_of_Arrays_View.h"
#include "../graph-preprocessing/edge_and_vertex_processing_functions.h"
#include "../utils/traits.h"

#define _findDisputableEdgesPerLevel(_graph) (graph_preprocessing::findDisputableEdgesPerLevel(_graph))
#define _findVerticesPerLevel(_graph) (graph_preprocessing::findVerticesPerLevels(_graph))
#define _differentColours(_cv, _cu) (_cv != 0 && _cv != _cu)
#define _underlyingValueNotNullptr(_optionalPtr) (_optionalPtr.has_value() && _optionalPtr.value() != nullptr)

namespace algorithms {

using GraphInterface = data_structures::GraphInterface;
using PartiallyDisabledGraph = data_structures::PartiallyDisabledGraph;
using ColouredGraph = data_structures::ColouredGraph;
template <typename T>
using ArrayOfArraysInterface = data_structures::ArrayOfArraysInterface<T>;
template <typename T>
using ArrayOfArrays = data_structures::ArrayOfArrays<T>;
template <typename T>
using ArrayOfArraysView = data_structures::ArrayOfArraysView<T>;
template <typename T>
using NestedArrayView = typename ArrayOfArraysInterface<T>::NestedArrayView;
using Edge = std::pair<uint32_t, uint32_t>;

// TODO: Add skipping non-seperable subgraphs when recursively assigning colours.
// TODO: Add concurrency.
// TODO: Find smarter and more efficient way of reenabling vertices.
class GraphColourer {

public:

    using ColourAcquireFunctionT = std::function<uint32_t(uint32_t)>;

    // Hyperparams which influence the behaviour of the algorithm
    struct AlgorithmParams {

        // Level, cum. disputable edges at level, cum. vertices at level -> bool
        using StartingLevelFunctionT = std::function<bool(uint32_t, uint64_t, uint32_t)>;
        // level, common vertices count -> bool
        using ShouldMergeFunctionT = std::function<bool(uint32_t, uint32_t)>;

        AlgorithmParams(
            StartingLevelFunctionT&& startingLevelFunction, 
            ShouldMergeFunctionT&& shouldMergeFunction
        ) : startingLevelFunction{std::forward<StartingLevelFunctionT>(startingLevelFunction)}, 
            shouldMergeFunction{std::forward<ShouldMergeFunctionT>(shouldMergeFunction)} {}

        // Level, cum. disputable edges, cum. vertices per level -> bool
        StartingLevelFunctionT startingLevelFunction;
        // level, common vertices count -> bool
        ShouldMergeFunctionT shouldMergeFunction;

    };

    struct ColourHierarchyNode {

        ColourHierarchyNode() : ColourHierarchyNode{0} {}
        explicit ColourHierarchyNode(uint32_t colour) : colour{colour}, parent{nullptr}, depth{0} {}
        ColourHierarchyNode(uint32_t colour, const ColourHierarchyNode* parent) : 
            colour{colour}, parent{parent}, depth{(parent != nullptr) ? (parent->depth)+1 : 0} {}

        void addChild(uint32_t childColour) {children.emplace_back(childColour, this);}

        uint32_t colour;
        const ColourHierarchyNode* const parent;
        std::vector<ColourHierarchyNode> children;
        std::vector<uint32_t> verticesOfColour;
        uint32_t depth;
    };

    GraphColourer(const AlgorithmParams& algorithmParams) : 
        m_algorithmParams{algorithmParams}, 
        m_disputableEdgesPerLevel{nullptr},
        m_verticesPerLevel{nullptr}, 
        m_maxCurrentColourIndex{0} {}

    void resetForNewRun(); 
    
    // Needed: `maxReucursion` >= 1.
    std::pair<ColouredGraph, ColourHierarchyNode> assignColoursToGraph(
        const GraphInterface& graph, 
        bool recursiveColouring = true, 
        uint32_t maxRecursion = 1,
        bool forceRecomputation = false
    );

    void presetDisputableEdgesPerLevel(const ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel);

    void presetDisputableEdgesPerLevel(ArrayOfArraysInterface<Edge>&& disputableEdgesPerLevel);

    void presetVerticesPerLevel(const ArrayOfArraysInterface<uint32_t>& verticesPerLevels);

    void presetVerticesPerLevel(ArrayOfArraysInterface<uint32_t>&& verticesPerLevels);

private:

    struct ColouringStageMailbox {
        std::vector<uint32_t> receivedOfferPackets;
        int64_t lastPing;

        ColouringStageMailbox() : receivedOfferPackets{}, lastPing{-1} {}

        void resetForPing(uint32_t ping) {
            // std::cout << "Resetting ping\n";
            if (lastPing == ping) return;
            receivedOfferPackets.clear();
            receivedOfferPackets.shrink_to_fit(); // TODO: decide if this line should remain
            lastPing = ping;
        }
    };

    // Returns `{false, _}` if no valid starting level was found, otherwise returns `{true, starting_level}`.
    static std::pair<bool, uint32_t> determineTheStartingLevel(
        const AlgorithmParams& algorithmParams, 
        ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
        ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel
    );
    
    // Disables all vertices on levels `1`, `2`, ..., `l-1`.
    static PartiallyDisabledGraph createPartiallyDisabledGraphCutOffAtL(
        GraphInterface& graph, const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, int32_t l
    );

    // Returs min colour and max colour respectively introduced in the call
    static std::pair<uint32_t, uint32_t> applyGreedyColouring(
        GraphInterface& graph, 
        const AlgorithmParams& algorithmParams, 
        ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
        // ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel,
        uint32_t startingLevel, 
        std::vector<uint32_t>& vertexColours,
        ColourAcquireFunctionT&& colourAcquirerFunction
    );

    static void buildColourHierarchyRecursivelyRootedAtColour(
        GraphInterface& graph,
        const AlgorithmParams& algorithmParams, 
        ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
        ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel,
        ColourHierarchyNode& colourHierarchyRoot, 
        std::vector<uint32_t>& vertexColours,
        uint32_t leftRecursionLevels, 
        ColourAcquireFunctionT&& colourAcquireFunction
    );

    static void instantlyRerouteOfferPacketsToPreds(
        GraphInterface& graph, uint32_t minValidColour, uint32_t maxValidColour,
        uint32_t vIndex, uint32_t offeringVertexIndex, size_t k, 
        std::vector<ColouringStageMailbox>& vertexMailboxes, 
        const std::vector<uint32_t>& vertexColours, 
        std::vector<uint32_t>& Vkr
    );

    template <typename T>
    static std::enable_if_t<utils::is_iterable_and_stores_int_type_v<T>, uint64_t> 
    calculateSimpleScoreForColouring(
        GraphInterface& graph, T* vertexSubsetPtr, const std::vector<uint32_t> vertexColours
    ) {
        
        uint64_t interColourEdgesCount = 0;
        bool deleteVertexSubset = false;
        if (vertexSubsetPtr == nullptr) {
            return 0;
        }
        auto& vertexSubset = *vertexSubsetPtr;
        for (const auto uIndex : vertexSubset) {
            const uint32_t uColour = vertexColours[uIndex];
            for (const auto vIndex : graph.N(uIndex)) {
                if (_differentColours(vertexColours[vIndex], uColour)) {
                    ++interColourEdgesCount;
                }
            }
            for (const auto vIndex : graph.NR(uIndex)) {
                if (_differentColours(vertexColours[vIndex], uColour)) {
                    ++interColourEdgesCount;
                }
            }
        }
        if (deleteVertexSubset) delete vertexSubsetPtr;
        return interColourEdgesCount;
    }

    template <typename T>
    static std::enable_if_t<utils::is_iterable_and_stores_int_type_v<T>, void>
    applyBestColouring(
        GraphInterface& graph, uint32_t c, const T& vertexSubset, std::vector<uint32_t>& vertexColours
    ) {
    
        uint32_t ownColour;
        uint32_t ownColourCount;
        uint32_t cCount;
        for (const auto uIndex : vertexSubset) {
            ownColour = vertexColours[uIndex];
            if (ownColour == c) continue;
            ownColourCount = 0;
            cCount = 0;
            for (const auto vIndex : graph.NR(uIndex)) {
                const uint32_t vColour = vertexColours[vIndex];
                if (vColour == ownColour) ++ownColourCount;
                else if (vColour == c) ++cCount;
            }

            if (cCount >= ownColourCount) vertexColours[uIndex] = c;
        }
    }

    static void fillColourHierarchyNodesVector(
        ColourHierarchyNode& colourNode, 
        std::vector<ColourHierarchyNode*>& colourHierarchyNodes
    );

    inline void computeDisputableEdgesPerLevel(bool forceRecomputation) {
        // if (!forceRecomputation && m_disputableEdgesPerLevel.value_or(nullptr) != nullptr) return;
        if (!forceRecomputation && _underlyingValueNotNullptr(m_disputableEdgesPerLevel)) return;
        std::cout << "A\n";
        m_disputableEdgesPerLevel.value().reset(
            new ArrayOfArrays<Edge>(std::move(_findDisputableEdgesPerLevel(*m_graph)))
        );
        // auto& disputableEdgesPerLevelValue = *(m_disputableEdgesPerLevel.value());
        // size_t n = disputableEdgesPerLevelValue.getNumberOfNestedArrays();
        // m_cumDisputableEdgesPerLevelCounts = std::vector<size_t>(n, 0);
        // auto& cumDisputableEdgesPerLevelCountsValue = m_cumDisputableEdgesPerLevelCounts.value();
        // cumDisputableEdgesPerLevelCountsValue[0] = disputableEdgesPerLevelValue.getSizeOfArr(0);
        // for (size_t level=1; level<n; ++level) {
        //     cumDisputableEdgesPerLevelCountsValue[level] = cumDisputableEdgesPerLevelCountsValue[level-1] + disputableEdgesPerLevelValue.getSizeOfArr(level);
        // }
    }

    inline void computeVerticesPerLevel(bool forceRecomputation) {
        // if (!forceRecomputation && m_verticesPerLevel.value_or(nullptr) != nullptr) return;
        if (!forceRecomputation && _underlyingValueNotNullptr(m_verticesPerLevel)) return;
        std::cout << "B\n";
        m_verticesPerLevel.value().reset(
            new ArrayOfArrays<uint32_t>(std::move(_findVerticesPerLevel(*m_graph)))
        );
        // TODO: extract to seperate function
        // auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
        // size_t n = m_verticesPerLevel.value()->getNumberOfNestedArrays();
        // m_cumVerticesPerLevelCounts = std::vector<size_t>(n, 0);
        // auto& cumVerticesPerLevelCountsValue = m_cumVerticesPerLevelCounts.value();
        // cumVerticesPerLevelCountsValue[0] = verticesPerLevelValue.getSizeOfArr(0);
        // for (size_t level=1; level<n; ++level) {
        //     cumVerticesPerLevelCountsValue[level] = cumVerticesPerLevelCountsValue[level-1] + verticesPerLevelValue.getSizeOfArr(level);
        // }
    }

    const AlgorithmParams m_algorithmParams;

    const GraphInterface* m_graph;
    std::optional<std::unique_ptr<ArrayOfArraysInterface<Edge>>> m_disputableEdgesPerLevel;
    // std::optional<std::vector<size_t>> m_cumDisputableEdgesPerLevelCounts;
    std::optional<std::unique_ptr<ArrayOfArraysInterface<uint32_t>>> m_verticesPerLevel; 
    // std::optional<std::vector<size_t>> m_cumVerticesPerLevelCounts;
    uint32_t m_maxCurrentColourIndex;

};

}

#undef _findDisputableEdgesPerLevel
#undef _findVerticesPerLevel
#undef _differentColours
#undef _underlyingValueNotNullptr

#endif