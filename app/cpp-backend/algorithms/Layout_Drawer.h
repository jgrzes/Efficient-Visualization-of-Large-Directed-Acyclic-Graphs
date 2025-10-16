#ifndef ALGORITHMS__LAYOUT_DRAWER_H
#define ALGORITHMS__LAYOUT_DRAWER_H

#include <tuple>
#include <vector>
#include <functional>
#include <optional>
#include <type_traits>
#include <array>

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
using Vertex = data_structures::GraphInterface::Vertex;

// TODO: Adapt the class to work with recursive colours
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
        double gAcceleration;
        double baseVerexWeight;
        double addWeightFromChildrenCoeff;
        double kInitialLayoutCoeff;
        
        double sCoeff;
        double defaultAlphaP;
        double defaultBetaP;
        double marginPadding;
        double pullUpCoeff;

        double minBoxWidthForUncoloured;

        double yDistanceBetweenUncolouredLevels;
    }; 

    LayoutDrawer(const AlgorithmParams& algorithmParams) : 
        m_algorithmParams{algorithmParams},
        m_graph{nullptr}, m_rootColourNode{nullptr}, 
        m_cumFInterspring{1}, m_epsilonsForVertices{0} {}

    LayoutDrawer(AlgorithmParams&& algorithmParams) : 
        m_algorithmParams{std::move(algorithmParams)},
        m_graph{nullptr}, m_rootColourNode{nullptr}, 
        m_cumFInterspring{1}, m_epsilonsForVertices{0} {}

    std::vector<CartesianCoords> findLayoutForGraph(
        ColouredGraph& graph, ColourHierarchyNode& rootColourNode,
        double defaultEpsilon  
    );

private:

    using EqualColourDepthColourFinderT = std::function<std::pair<uint32_t, uint32_t>(uint32_t, uint32_t)>;

    struct F {
        
        using PotentialMinimaListT = std::variant<const std::array<double, 1>, const std::array<double, 3>>;

        F(const Vertex& v, const double& xp) : v{v}, xp{xp} {} 
        virtual double operator()(double x, uint32_t k) const = 0;
        virtual PotentialMinimaListT getPotentialMinima() const = 0;

        const Vertex& v;
        const double& xp;
    };

    struct Fp : public F {

        Fp(const Vertex& v, const double& xp, double alphaP, double betaP, double gP) :
            F{v, xp}, alphaP{alphaP}, betaP{betaP}, gP{gP} {}

        double operator()(double x, uint32_t k) const override {
            if (x - (xp + gP) >= 0) {
                return alphaP * (x - xp - gP);
            } else if (xp + gP >= x && x >= xp) {
                return betaP * (-x + xp + gP);
            } else {
                return operator()(2*xp - x, k);
            }
        }

        PotentialMinimaListT getPotentialMinima() const override {
            return std::array<double, 3>{xp, xp + gP, xp - gP};
        }

        double alphaP;
        double betaP;
        double gP;
    };

    struct Fcs : public F {

        Fcs(const Vertex& v, const double& xp, double alphaP) :
            F{v, xp}, alphaP{alphaP} {}

        double operator()(double x, uint32_t k) const override {
            if (k != v.level) {
                throw std::runtime_error{
                    "Fcs error: attempted to call the function with a disallowed k value ("
                    + std::string("k must be equal to " + v.level) + ")"
                }; 
            }
            if (x - xp >= 0) {
                return alphaP * (x - xp);
            } else {
                return operator()(2*xp - x, k);
            }
        }

        PotentialMinimaListT getPotentialMinima() const override {
            return std::array<double, 1>{xp};
        }

        double alphaP;    

    };

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

    uint32_t findMaxWidthForColourSubgraphNotNested(uint32_t colourRootIndex);

    void findEpsilonsForColourRoots(
        // SparseArray<double>& epsilonsForVertices, 
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode = std::nullopt
    );

    void findLayoutForColouredSubgraph(
        const ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
        const std::pair<double, double>& startingPositionForColourRoot, 
        const std::pair<double, double>& boxBounds
    );

    void findInitialLayoutForColouredSubgraph(
        ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
        const std::pair<double, double>& startingPositionForColourRoot, 
        const std::pair<double, double>& boxBounds
    );

    std::vector<std::unique_ptr<F>> buildFCollectionForVertex(
        uint32_t vIndex, const std::unordered_set<uint32_t>& alreadyDrawnVerticesSet, double wPrim
    );

    std::unique_ptr<F> buildF(
        uint32_t vIndex, uint32_t k, double s
        // double alphaP, double betaP
    ) const;

    double findPositionXThatMinimizesFCollection(
        const std::vector<std::unique_ptr<F>>& FCollection, uint32_t k
    ) const;

    void createGapsAlongXAxisBetweenVertices(
        std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions,
        const std::pair<double, double>& boxBounds
    );

    void createGapForTwoConsecutiveVertices(
        std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions, 
        size_t i, std::optional<double>& gamma, 
        const std::pair<double, double>& boxBounds
    );

    // TODO: Come up with a better way of drawing uncoloured vertices
    void drawUncolouredPartOfGraph(
        const ArrayOfArraysInterface<uint32_t>& verticesPerLevel, 
        uint32_t kl, 
        const std::pair<double, double>& boxBounds
    );

    const AlgorithmParams m_algorithmParams;

    ColouredGraph* m_graph;
    ColourHierarchyNode* m_rootColourNode;
    std::vector<ColourHierarchyNode*> m_colourNodesPtrs;
    uint32_t m_maxColour;

    std::vector<uint32_t> m_pinkIndices;
    std::vector<uint32_t> m_blueIndices;
    SparseArray<std::pair<double, double>> m_cumFInterspring;
    SparseArray<double> m_epsilonsForVertices;

    std::vector<std::pair<double, double>> m_layoutPositions;

};

}

#endif