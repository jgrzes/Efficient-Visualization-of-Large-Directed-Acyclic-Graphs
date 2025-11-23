#include "input_generation_for_qap.h"

namespace utils {

uint32_t findMaxColourIndexInColourHierarchy(const ColouringHierarchyNode& colourNode) {
    uint32_t maxColourIndexInSubtree = colourNode.colour;
    for (const auto& childColourNode : colourNode.children) {
        maxColourIndexInSubtree = std::max(
            maxColourIndexInSubtree, 
            findMaxColourIndexInColourHierarchy(childColourNode)
        );
    }
    return maxColourIndexInSubtree;
}

// TODO: Optimize this function to utilise `ErodingEdgeVecTuple` approach.
FMatrixDataT fillFMatrix(
    const ColouringHierarchyNode& xNode, 
    const ColouringHierarchyNode& yNode, 
    const GraphInterface& graph, 
    SparseMatrix<FMatrixDataT>& F, 
    SparseMatrix<bool>& alreadyCalculated
) {

    if (alreadyCalculated.dataAtOr(xNode.colour, yNode.colour, false)) {
        return F.at(xNode.colour, yNode.colour);
    }

    size_t n;
    n = xNode.children.size();
    for (size_t i=0; i<n; ++i) {
        for (size_t j=i+1; j<n; ++j) {
            fillFMatrix(
                xNode.children[i], xNode.children[j], graph, F, alreadyCalculated
            );
        }
    }

    n = yNode.children.size();
    for (size_t i=0; i<n; ++i) {
        for (size_t j=i+1; j<n; ++j) {
            fillFMatrix(
                yNode.children[i], yNode.children[j], graph, F, alreadyCalculated
            );
        }
    }
    
    for (const auto& yNodeChild : yNode.children) {
        fillFMatrix(xNode, yNodeChild, graph, F, alreadyCalculated);
    }
    for (const auto& xNodeChild : xNode.children) {
        fillFMatrix(xNodeChild, yNode, graph, F, alreadyCalculated);
    }

    uint64_t fxyShallow = 0;
    uint64_t fxyDeep = 0;

    for (const auto& xNodeChild : xNode.children) {
        // a === fx'y_shallow
        // b === fx'y_deep
        const auto&& [a, b] = fillFMatrix(
            xNodeChild, yNode, graph, F, alreadyCalculated
        );
        fxyShallow += a;
        fxyDeep += b;
    }

    for (const auto& yNodeChild : yNode.children) {
        // a === fxy'_shallow
        // b === fxy'_deep
        const auto&& [a, b] = fillFMatrix(
            xNode, yNodeChild, graph, F, alreadyCalculated
        );
        fxyShallow += a;
        fxyDeep += b;
    }

    if (fxyDeep % 2 == 1) {
        throw std::runtime_error{
            "Fill F Matrix error: fxyDeep is an odd number"
        };
    }
    fxyDeep /= 2;

    // Especially unefficient part.
    uint64_t interColourNonRecursive = 0;
    for (const uint32_t uIndex : xNode.verticesOfColour) {
        const auto Nu = graph.N(uIndex);
        for (const uint32_t vIndex : yNode.verticesOfColour) {
            if (Nu.contains(vIndex)) {
                // std::cout << uIndex << " " << vIndex << "\n";
                ++interColourNonRecursive;
            }
        }
    }

    for (const uint32_t vIndex : yNode.verticesOfColour) {
        const auto Nv = graph.N(vIndex);
        for (const uint32_t uIndex : xNode.verticesOfColour) {
            if (Nv.contains(uIndex)) {
                // std::cout << vIndex << " " << uIndex << "\n";
                ++interColourNonRecursive;
            }
        }
    }

    F.at(xNode.colour, yNode.colour) = {interColourNonRecursive, fxyShallow + fxyDeep};
    std::cout << xNode.colour << ", " << yNode.colour << ": (" << (interColourNonRecursive) << ", " << fxyShallow + fxyDeep << ")\n";
    for (const uint32_t uIndex : xNode.verticesOfColour) std::cout << uIndex << " ";
    std::cout << "\n";
    for (const uint32_t uIndex : yNode.verticesOfColour) std::cout << uIndex << " ";
    std::cout << "\n";

    alreadyCalculated.at(xNode.colour, yNode.colour) = true;
    return F.at(xNode.colour, yNode.colour);
}


SparseMatrix<FMatrixDataT> createFMatrixForColoursQAP(
    const ColouringHierarchyNode& rootColourNode, 
    const GraphInterface& graph,
    std::optional<uint32_t> optMaxColourIndex
) {

    uint32_t maxColourIndex = (optMaxColourIndex.has_value()) 
        ? optMaxColourIndex.value()
        : findMaxColourIndexInColourHierarchy(rootColourNode);

    SparseMatrix<FMatrixDataT> F(maxColourIndex+1);
    SparseMatrix<bool> alreadyCalculated(maxColourIndex+1);
    size_t n = rootColourNode.children.size();
    for (size_t i=0; i<n; ++i) {
        for (size_t j=i+1; j<n; ++j) {
            fillFMatrix(
                rootColourNode.children[i], 
                rootColourNode.children[j], 
                graph, F, alreadyCalculated
            );    
        }
    }

    return F;

}

}