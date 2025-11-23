#ifndef UTILS__INPUT_GENERATION_FOR_QAP_H
#define UTILS__INPUT_GENERATION_FOR_QAP_H

#include <tuple>
#include <optional>
#include <vector>
#include <cstdint>

#include "../data-structures/Coloured_Graph.h"
#include "../data-structures/Sparse_Matrix.h"
#include "../algorithms/Graph_Colourer.h"

namespace utils {

using ColouringHierarchyNode = algorithms::GraphColourer::ColourHierarchyNode;
template <typename T, bool Symmetric = true>
using SparseMatrix = data_structures::SparseMatrix<T, Symmetric, true>;

using Edge = std::pair<uint32_t, uint32_t>;
using ColouredGraph = data_structures::ColouredGraph;
using GraphInterface = data_structures::GraphInterface;
// <F, FPrim>
using FMatricesForQAPTuple = std::pair<SparseMatrix<uint64_t, true>, SparseMatrix<uint64_t, false>>;

uint32_t findMaxColourIndexInColourHierarchy(const ColouringHierarchyNode& colourNode);

SparseMatrix<uint64_t, true> createInterColourNonRecursive(
    const ColouredGraph& graph, const ColouringHierarchyNode& rootColourNode,
    std::optional<uint32_t> optMaxColourIndex = std::nullopt
);

uint64_t fillFPrimMatrixCell(
    const ColouringHierarchyNode& nrNode, const ColouringHierarchyNode& rNode, 
    const SparseMatrix<uint64_t, true>& interColourNR, 
    SparseMatrix<uint64_t, false>& FPrim
);

uint64_t fillFMatrixCell(
    const ColouringHierarchyNode& xNode, const ColouringHierarchyNode& yNode, 
    const SparseMatrix<uint64_t, true>& interColourNR, 
    SparseMatrix<uint64_t, true>& F, 
    SparseMatrix<uint64_t, false>& FPrim
); 

// Execution may be made more efficient by passing precomputed `optMaxColourIndex` and `optInterColourNR`.
FMatricesForQAPTuple createFMatricesForColoursQAP(
    const ColouringHierarchyNode& rootColourNode, 
    const ColouredGraph& graph,
    std::optional<uint32_t> optMaxColourIndex = std::nullopt, 
    std::optional<std::reference_wrapper<SparseMatrix<uint64_t, true>>> optInterColourNR = std::nullopt
);

}

#endif 