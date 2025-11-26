#include "input_generation_for_qap.h"

namespace utils {

uint32_t findMaxColourIndexInColourHierarchy(const ColouringHierarchyNode& colourNode) {
    uint32_t maxColourIndexInSubtree = colourNode.colour;
    for (const auto& childColourNodePtr : colourNode.childrenPtrs) {
        maxColourIndexInSubtree = std::max(
            maxColourIndexInSubtree, 
            findMaxColourIndexInColourHierarchy(*childColourNodePtr)
        );
    }
    return maxColourIndexInSubtree;
}


SparseMatrix<uint64_t, true> createInterColourNonRecursive(
    const ColouredGraph& graph, const ColouringHierarchyNode& rootColourNode,
    std::optional<uint32_t> optMaxColourIndex
) {
    uint32_t maxColourIndex = (optMaxColourIndex.has_value())
        ? optMaxColourIndex.value()
        : findMaxColourIndexInColourHierarchy(rootColourNode);

    SparseMatrix<uint64_t, true> interColourNR(maxColourIndex+1);
    size_t n = graph.getVertexCount();
    for (uint32_t uIndex=0; uIndex<n; ++uIndex) {
        if (data_structures::shouldSkipVertex(graph, uIndex)) continue;
        uint32_t cu = graph.getVertexColour(uIndex);
        const auto Nu = graph.N(uIndex);
        for (uint32_t vIndex : Nu) {
            interColourNR.at(cu, graph.getVertexColour(vIndex)) += 1;
        }
    }
    
    return interColourNR;
}


uint64_t fillFPrimMatrixCell(
    const ColouringHierarchyNode& nrNode, const ColouringHierarchyNode& rNode, 
    const SparseMatrix<uint64_t, true>& interColourNR, 
    SparseMatrix<uint64_t, false>& FPrim
) {

    uint32_t cnr = nrNode.colour;
    uint32_t cr = rNode.colour;
    if (FPrim.hasDataAt(cnr, cr)) {
        return FPrim.at(cnr, cr);
    }

    uint32_t fnrr = 0;
    for (const auto& rNodeChildPtr : rNode.childrenPtrs) {
        fnrr += fillFPrimMatrixCell(nrNode, *rNodeChildPtr, interColourNR, FPrim);
    }

    fnrr += interColourNR.dataAtOr(cnr, cr, 0);
    FPrim.at(cnr, cr) = fnrr;

    // std::cout << "FPrim: " << nrNode.colour << ", " << rNode.colour << ": (" << fnrr << ")\n";
    // for (const uint32_t uIndex : nrNode.verticesOfColour) std::cout << uIndex << " ";
    // std::cout << "\n";
    // for (const uint32_t uIndex : rNode.verticesOfColour) std::cout << uIndex << " ";
    // std::cout << "\n\n";

    return fnrr;
}


uint64_t fillFMatrixCell(
    const ColouringHierarchyNode& xNode, const ColouringHierarchyNode& yNode, 
    const SparseMatrix<uint64_t, true>& interColourNR, 
    SparseMatrix<uint64_t, true>& F, 
    SparseMatrix<uint64_t, false>& FPrim
) {

    uint32_t cx = xNode.colour;
    uint32_t cy = yNode.colour;
    if (F.hasDataAt(cx, cy)) {
        return F.at(cx, cy);
    }

    size_t n, m;

    n = xNode.childrenPtrs.size();
    for (uint32_t i=0; i<n; ++i) {
        for (uint32_t j=i+1; j<n; ++j) {
            fillFMatrixCell(
                *xNode.childrenPtrs[i], *xNode.childrenPtrs[j], 
                interColourNR, F, FPrim
            );
        }
    }

    m = yNode.childrenPtrs.size();
    for (uint32_t i=0; i<m; ++i) {
        for (uint32_t j=i+1; j<m; ++j) {
            fillFMatrixCell(
                *yNode.childrenPtrs[i], *yNode.childrenPtrs[j], 
                interColourNR, F, FPrim
            );
        }
    }

    uint64_t fxy = 0;
    for (const auto& xNodeChild : xNode.childrenPtrs) {
        for (const auto& yNodeChild : yNode.childrenPtrs) {
            fxy += fillFMatrixCell(
                *xNodeChild, *yNodeChild, 
                interColourNR, F, FPrim
            );
        }
    }

    for (const auto& xNodeChild : xNode.childrenPtrs) {
        fxy += fillFPrimMatrixCell(yNode, *xNodeChild, interColourNR, FPrim);
    }

    for (const auto& yNodeChild : yNode.childrenPtrs) {
        fxy += fillFPrimMatrixCell(xNode, *yNodeChild, interColourNR, FPrim);
    }

    fxy += interColourNR.dataAtOr(cx, cy, 0);
    F.at(cx, cy) = fxy;

    // std::cout << "F: " << xNode.colour << ", " << yNode.colour << ": (" << fxy << ")\n";
    // for (const uint32_t uIndex : xNode.verticesOfColour) std::cout << uIndex << " ";
    // std::cout << "\n";
    // for (const uint32_t uIndex : yNode.verticesOfColour) std::cout << uIndex << " ";
    // std::cout << "\n\n";

    return fxy;
}


FMatricesForQAPTuple createFMatricesForColoursQAP(
    const ColouringHierarchyNode& rootColourNode, 
    const ColouredGraph& graph, 
    std::optional<uint32_t> optMaxColourIndex, 
    std::optional<std::reference_wrapper<SparseMatrix<uint64_t, true>>> optInterColourNR
) {

    uint32_t maxColourIndex = (optMaxColourIndex.has_value())
        ? optMaxColourIndex.value()
        : findMaxColourIndexInColourHierarchy(rootColourNode);

    size_t n;
    SparseMatrix<uint64_t, true> F(maxColourIndex+1);
    SparseMatrix<uint64_t, false> FPrim(maxColourIndex+1);

    if (optInterColourNR.has_value()) {
        n = rootColourNode.childrenPtrs.size();
        for (size_t i=0; i<n; ++i) {
            for (size_t j=i+1; j<n; ++j) {
                fillFMatrixCell(
                    *rootColourNode.childrenPtrs[i], 
                    *rootColourNode.childrenPtrs[j], 
                    optInterColourNR.value(), F, FPrim
                );
            }
        }
    } else {
        SparseMatrix<uint64_t, true> interColourNR = createInterColourNonRecursive(
            graph, rootColourNode, maxColourIndex
        );
        n = rootColourNode.childrenPtrs.size();
        for (size_t i=0; i<n; ++i) {
            for (size_t j=i+1; j<n; ++j) {
                fillFMatrixCell(
                    *rootColourNode.childrenPtrs[i], 
                    *rootColourNode.childrenPtrs[j], 
                    interColourNR, F, FPrim
                );
            }
        }
    }    
    return {std::move(F), std::move(FPrim)};
}

}