#ifndef ALGORITHMS__GRAPH_COLOURER_H
#define ALGORITHMS__GRAPH_COLOURER_H

#include <optional>
#include <functional>
#include <unordered_map>

#include "../data-structures/Coloured_Graph.h"
#include "../data-structures/Array_of_Arrays.h"
#include "../data-structures/Array_of_Arrays_View.h"
#include "../graph-preprocessing/edge_processing_functions.h"
#include "../utils/traits.h"

#define _findDisputableEdgesPerLevelCounts(_graph) (graph_preprocessing::findDisputableEdgesPerLevelCounts(_graph))
#define _findVerticesPerLevel(_graph) (graph_preprocessing::findVerticesPerLevels(_graph))
#define _differentColours(_cv, _cu) (_cv != 0 && _cv != _cu)

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
using NestedArrayView = ArrayOfArraysInterface<T>::NestedArrayView<T>;
using Edge = std::pair<uint32_t, uint32_t>;

class GraphColourer {

public:

    // Hyperparams which influence the behaviour of the algorithm
    struct AlgorithmParams {

        // Level, cum. disputable edges, cum. vertices per level -> bool
        using StartingLevelFunctionT = std::function<bool(uint32_t, const std::vector<size_t>&, const std::vector<size_t>&)>;
        // level, common vertices count -> bool
        using ShouldMergeFunctionT = std::function<bool(uint32_t, uint32_t)>;

        // Level, cum. disputable edges, cum. vertices per level -> bool
        StartingLevelFunctionT startingLevelFunction;
        // level, common vertices count -> bool
        ShouldMergeFunctionT shouldMergeFunction;

    };

    GraphColourer(const AlgorithmParams& algorithmParams) : m_algorithmParams{algorithmParams} {}
    
    ColouredGraph assignColoursToGraph(const GraphInterface& graph, bool recursiveColouring = true, bool forceRecomputation = false);

    inline void presetCumDisputableEdgesPerLevelsCounts(const std::vector<size_t>& cumDisputableEdgesPerLevelCounts) {
        m_cumDisputableEdgesPerLevelCounts = cumDisputableEdgesPerLevelCounts;
    }

    inline void presetCumDisputableEdgesPerLevelsCounts(std::vector<size_t>&& cumDisputableEdgesPerLevelCounts) {
        m_cumDisputableEdgesPerLevelCounts = std::move(cumDisputableEdgesPerLevelCounts);
    }

    void presetVerticesPerLevels(const ArrayOfArraysInterface<uint32_t>& verticesPerLevels);

    void presetVerticesPerLevels(ArrayOfArraysInterface<uint32_t>&& verticesPerLevels);

private:

    struct ColouringStageMailbox {
        std::vector<uint32_t> receivedOfferPackets;
        int64_t lastPing;

        ColouringStageMailbox() : receivedOfferPackets{}, lastPing{-1} {}

        void resetForPing(uint32_t ping) {
            if (lastPing == ping) return;
            receivedOfferPackets.clear();
            receivedOfferPackets.shrink_to_fit(); // TODO: decide if this line should remain
            lastPing = ping;
        }
    };

    uint32_t determineTheStartingLevel() const;
    
    // Disables all vertices on levels `1`, `2`, ..., `l-1`.
    PartiallyDisabledGraph createPartiallyDisabledGraphCutOffAtL(uint32_t l);

    std::vector<uint32_t> applyInitialGreedyColouring(uint32_t startingLevel);

    template <typename T>
    std::enable_if_t<utils::is_iterable_and_stores_int_type_v<T>, uint64_t> 
    calculateSimpleScoreForColouring(const T* const vertexSubsetPtr, const std::vector<uint32_t> vertexColours) const {
        uint64_t interColourEdgesCount = 0;
        // using value_type = typename T::value_type;
        auto& graph = *m_graph;
        bool deleteVertexSubset = false;
        if (vertexSubsetPtr == nullptr) {
            size_t n = vertexColours.size();
            vertexSubsetPtr = new std::vector<typename T::value_type>();
            vertexSubsetPtr->reserve(n);
            for (auto i=0; i<n; ++i) vertexSubsetPtr->emplace_back(i);
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
    std::enable_if_t<utils::is_iterable_and_stores_int_type_v<T>, void>
    applyBestColouring(uint32_t c, const T& vertexSubset, const std::vector<uint32_t>& vertexColours) const {
        uint32_t ownColour;
        uint32_t ownColourCount;
        uint32_t cCount;
        auto& graph = *m_graph;
        for (const auto uIndex : vertexSubset) {
            ownColour = vertexColours[uIndex];
            if (ownColour == c) continue;
            ownColour = 0;
            cCount = 0;
            for (const auto vIndex : graph.N(uIndex)) {
                const uint32_t vColour = vertexColours[vIndex];
                if (vColour == ownColour) ++ownColourCount;
                else if (vColour == c) ++cCount;
            }

            if (cCount >= ownColourCount) vertexColours[uIndex] = c;
        }
    }

    void instantlyRerouteOfferPacketsToPreds(
        uint32_t vIndex, uint32_t offeringVertexIndex, size_t k, 
        std::vector<ColouringStageMailbox>& vertexMailboxes, 
        const std::vector<uint32_t>& vertexColours, 
        std::vector<uint32_t>& Vkr
    );

    inline void computeCumDisputableEdgesPerLevelCounts(bool forceRecomputation) {
        if (!forceRecomputation && m_cumDisputableEdgesPerLevelCounts.has_value()) return;
        m_cumDisputableEdgesPerLevelCounts = _findDisputableEdgesPerLevelCounts(*m_graph);
        auto& cumDisputableEdgesPerLevelCountsValue = m_cumDisputableEdgesPerLevelCounts.value();
        size_t n = cumDisputableEdgesPerLevelCountsValue.size();
        for (size_t level=1; level<n; ++level) {
            cumDisputableEdgesPerLevelCountsValue[level] += cumDisputableEdgesPerLevelCountsValue[level-1];
        }
    }

    inline void computeVerticesPerLevel(bool forceRecomputation) {
        if (!forceRecomputation && m_verticesPerLevel.value_or(nullptr) != nullptr) return;
        m_verticesPerLevel.value().reset(
            new ArrayOfArrays<uint32_t>(std::move(_findVerticesPerLevel(*m_graph)))
        );
        // TODO: extract to seperate function
        auto& verticesPerLevelValue = *(m_verticesPerLevel.value());
        size_t n = m_verticesPerLevel.value()->getNumberOfNestedArrays();
        m_cumVerticesPerLevelCounts = std::vector<size_t>(n, 0);
        auto& cumVerticesPerLevelCountsValue = m_cumVerticesPerLevelCounts.value();
        cumVerticesPerLevelCountsValue[0] = verticesPerLevelValue.getSizeOfArr(0);
        for (size_t level=1; level<n; ++level) {
            cumVerticesPerLevelCountsValue[level] = cumVerticesPerLevelCountsValue[level-1] + verticesPerLevelValue.getSizeOfArr(level);
        }
    }

    const AlgorithmParams m_algorithmParams;

    const GraphInterface* m_graph;
    std::optional<std::vector<size_t>> m_cumDisputableEdgesPerLevelCounts;
    std::optional<std::unique_ptr<ArrayOfArraysInterface<uint32_t>>> m_verticesPerLevel; 
    std::optional<std::vector<size_t>> m_cumVerticesPerLevelCounts;

};

}

#undef _findDisputableEdgesPerLevelCounts
#undef _findVerticesPerLevel
#undef _differentColours

#endif