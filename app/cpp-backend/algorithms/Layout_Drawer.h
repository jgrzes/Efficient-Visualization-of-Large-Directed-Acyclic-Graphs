#ifndef ALGORITHMS__LAYOUT_DRAWER_H
#define ALGORITHMS__LAYOUT_DRAWER_H

#include <tuple>
#include <vector>
#include <functional>
#include <optional>
#include <type_traits>

#include "../data-structures/Coloured_Graph.h"
#include "Graph_Colourer.h"
#include "../data-structures/Sparse_Array.h"
#include "../graph-preprocessing/edge_and_vertex_processing_functions.h"

namespace std {

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>>
operator+(const std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    return std::make_pair<T, R>(tr1.first + tr2.first, tr1.second + tr2.second);
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>&>
operator+=(std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    tr1.first += tr2.first;
    tr1.second += tr2.second;
    return tr1;
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>>
operator-(const std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    return std::make_pair<T, R>(tr1.first - tr2.first, tr1.second - tr2.second);
}

template <typename T, typename R>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R>, std::pair<T, R>&>
operator-=(std::pair<T, R>& tr1, const std::pair<T, R>& tr2) {
    tr1.first -= tr2.first;
    tr1.second -= tr2.second;
    return tr1;
}

template <typename T, typename R, typename C>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R> && std::is_arithmetic_v<C>, std::pair<T, R>>
operator*(const std::pair<T, R>& tr, const C& c) {
    return {tr.first * c, tr.second * c};
} 

template <typename T, typename R, typename C>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R> && std::is_arithmetic_v<C>, std::pair<T, R>>
operator*(const C& c, const std::pair<T, R>& tr) {
    return {c * tr.first, c * tr.second};
} 

template <typename T, typename R, typename C>
std::enable_if_t<std::is_arithmetic_v<T> && std::is_arithmetic_v<R> && std::is_arithmetic_v<C>, std::pair<T, R>&>
operator*=(std::pair<T, R>& tr, const C& c) {
    tr.first *= c;
    tr.second *= c;
    return tr;
}

}

namespace algorithms {

using CartesianCoords = std::pair<double, double>;
using ColouredGraph = data_structures::ColouredGraph;
using ColourHierarchyNode = GraphColourer::ColourHierarchyNode;
template <typename T>
using SparseArray = data_structures::SparseArray<T, true>;
template <typename T>
using ArrayOfArraysInterface = data_structures::ArrayOfArraysInterface<T>;

class LayoutDrawer {

public:

    struct AlgorithmParams {

        // u_colour, u_level, v_colour, v_level -> F_interspring(u, v) that affects u
        using FInterspringCalculatorT = std::function<std::pair<double, double>(uint32_t, uint32_t, uint32_t, uint32_t)>;
        // f_interspring_from_child -> f_interspring to add to vertex
        using FInterspringPushUpwardsValueCalculatorT = std::function<std::pair<double, double>(std::pair<double, double>)>;
        // max_vertex_count_on_a_single_level -> epsilon
        using EpsilonForColourRootCalculatorT = std::function<double(uint32_t)>;

        FInterspringCalculatorT FInterspringCalculator;
        FInterspringPushUpwardsValueCalculatorT FInterspringPushUpwardsValueCalculator;
        EpsilonForColourRootCalculatorT epsilonForColourRootCalculator;
        double firstLevelChildPadding;
    }; 

    LayoutDrawer() : m_graph{nullptr}, m_rootColourNode{nullptr}, m_cumFInterspring{1} {}

    std::vector<CartesianCoords> findLayoutForGraph(
        ColouredGraph& graph, ColourHierarchyNode& rootColourNode,
        double defaultEpsilon  
    );

private:

    using EqualColourDepthColourFinderT = std::function<std::pair<uint32_t, uint32_t>(uint32_t, uint32_t)>;

    void findVerticesWithCustomEpsilonsAndFixColourRoots(
        std::vector<uint32_t>& verticesWithCustomEpsilons,
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode = std::nullopt
    );

    std::vector<uint32_t> getColourRoots(ColourHierarchyNode& colourNode, bool pushRootsToTheFront = true);

    void performPinkIndicesConstruction(
        // std::vector<uint32_t>& pinkIndices, 
        uint32_t currentPink = 0,
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode = std::nullopt
    );

    void performBlueIndicesConstruction(
        // std::vector<uint32_t>& blueIndices, 
        uint32_t currentBlue = 0,
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColopurNode = std::nullopt
    );

    void emplaceColourNodesInArray();

    void performEmplacingColourNodesInArrayForColourSubtree(
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode = std::nullopt
    );

    void buildBaseCumFInterspring(EqualColourDepthColourFinderT&& equalColourDepthColourFinder);

    // Only call this after base cumFInterspring has been built.
    void transferFInterspringUpwards(const ArrayOfArraysInterface<uint32_t>& verticesPerLevel);

    double findEpsilonForColourRoot(uint32_t colourRootIndex);

    const AlgorithmParams m_algorithmParams;

    ColouredGraph* m_graph;
    ColourHierarchyNode* m_rootColourNode;
    std::vector<ColourHierarchyNode*> m_colourNodesPtrs;
    uint32_t m_maxColour;

    std::vector<uint32_t> m_pinkIndices;
    std::vector<uint32_t> m_blueIndices;
    SparseArray<std::pair<double, double>> m_cumFInterspring;

};

}

#endif