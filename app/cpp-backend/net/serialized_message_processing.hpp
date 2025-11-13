#ifndef NET__SERIALIZED_MESSAGE_PROCESSING_H
#define NET__SERIALIZED_MESSAGE_PROCESSING_H

#include <tuple>
#include <string>
#include <sstream>
#include <vector>

#include "../data-structures/Graph.h"

namespace net {

using Graph = data_structures::Graph;
using CartesianCoords = std::pair<double, double>;
using GraphBuildEntry = std::tuple<size_t, Graph::AdjList, bool>;


uint16_t readGraphIdFromGraphMessageChunk(const std::string& graphMessageChunk);

// Expects `graphMessageChunk` to be in following form:
// `graph_id`=<number> `is_final`=<true|fals> `n`=<number> `E`={<n1>:[a1,b1,c1,d1,...] <n2>:[a2,b2,c2,d2,...] ...}
void updateGraphBuildEntry(const std::string& graphMessageChunk, GraphBuildEntry& graphBuildEntry);

std::vector<std::string> buildLayoutPositionsReturnStringVector(
    const std::vector<CartesianCoords>& layoutPositions, size_t maxStringChunkSize = 1024
);

}

#endif