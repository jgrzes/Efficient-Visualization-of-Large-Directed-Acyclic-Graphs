#ifndef GRAPH_PREPROCESSING__EDGE_AND_VERTEX_PROCESSING_FUNCTIONS_H
#define GRAPH_PREPROCESSING__EDGE_AND_VERTEX_PROCESSING_FUNCTIONS_H

#include "../data-structures/Partially_Disabled_Graph.h"
#include "../data-structures/Array_of_Arrays.h"

namespace graph_preprocessing {

using GraphInterface = data_structures::GraphInterface;
using Graph = data_structures::Graph;
using PDGraph = data_structures::PartiallyDisabledGraph;
template <typename T> using ArrayOfArraysInterface = data_structures::ArrayOfArraysInterface<T>;
template <typename T> using ArrayOfArrays = data_structures::ArrayOfArrays<T>;
using Edge = std::pair<uint32_t, uint32_t>;

// This function assumes that no vertices in the passed graph are disabled.
PDGraph removeDanglingPathsFromGraph(
    const GraphInterface& graph, 
    PDGraph::GraphStoringPolicy pdGraphStoringPolicy = PDGraph::GraphStoringPolicy::SHARED_POINTER
);

std::vector<size_t> findDisputableEdgesPerLevelCounts(const GraphInterface& graph);

ArrayOfArrays<Edge> findDisputableEdgesPerLevel(const GraphInterface& graph);

std::vector<size_t> findVerticesPerLevelsCounts(const GraphInterface& graph);

ArrayOfArrays<uint32_t> findVerticesPerLevels(const GraphInterface& graph);

std::vector<size_t> findEnabledDisputableEdgesCountsFromContainer(
    const ArrayOfArraysInterface<Edge>& disputableEdgesPerLevel, 
    const GraphInterface& graph
);

ArrayOfArrays<Edge> findEnabledDisputableEdgesFromErodingContainer(
    ArrayOfArraysInterface<Edge>& erodingDisputableEdgesPerLevel, 
    const GraphInterface& graph
);

std::vector<size_t> findEnabledVerticesCountsFromContainer(
    const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
    const GraphInterface& graph
);

ArrayOfArrays<uint32_t> findEnabledVerticesFromErodingContainer(
    ArrayOfArraysInterface<uint32_t>& erodingVerticesPerLevel, 
    const GraphInterface& graph
);

std::vector<size_t> findVerticesPerLevelsCounts(
    const std::vector<uint32_t>& verticesPerLevelVector, 
    const GraphInterface& graph
);

ArrayOfArrays<uint32_t> findVerticesPerLevels(
    const std::vector<uint32_t>& verticesPerLevelVector, 
    const GraphInterface& graph, 
    bool trimFrontLevelsWithNoVertices = true
);
    
}

#endif 