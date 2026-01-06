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
#include "../data-structures/Sparse_Matrix.h"
#include "../data-structures/Bucketified_Line_Segment.hpp"
#include "../data-structures/One_Pair_Field_Array_Wrapper.hpp"
#include "../graph-preprocessing/edge_and_vertex_processing_functions.h"
#include "../data-structures/Cartesian_Surface_Grid.h"
#include "../utils/arithmetic_ops_for_pair_overloads.hpp"
#include "../logging/boost_logging.hpp"

namespace algorithms {

using CartesianCoords = std::pair<double, double>;
using ColouredGraph = data_structures::ColouredGraph;
using ColourHierarchyNode = GraphColourer::ColourHierarchyNode;
template <typename T, bool Symmetrical>
using SparseMatrix = data_structures::SparseMatrix<T, Symmetrical, true>;
template <typename T>
using SparseArray = data_structures::SparseArray<T, true>;
template <typename T>
using ArrayOfArraysInterface = data_structures::ArrayOfArraysInterface<T>;
using Vertex = data_structures::GraphInterface::Vertex;
template <typename T, typename LC, typename I>
using CartesianSurfaceGrid = data_structures::CartesianSurfaceGrid<T, LC, I>;
template <typename T, typename LC, typename I>
using BucketifiedLineSegment = data_structures::BucketifiedLineSegment<T, LC, I>;
template <typename T, typename R, typename S, size_t PairIndex>
using OnePairFieldArrayWrapper = data_structures::OnePairFieldArrayWrapper<T, R, S, PairIndex>; 

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
        // epsilon -> max_vertex_count_on_a_single_level
        using MaxVertexCountFromEpsilonCalculatorT = std::function<uint32_t(double)>;
        // number_of_vertices_in_F_collection, interval_width -> max noise epsilon 
        using MaxNoiseEpsilonCalculatorT = std::function<double(uint32_t, double)>;

        FInterspringCalculatorT FInterspringCalculator;
        FInterspringPushUpwardsValueCalculatorT FInterspringPushUpwardsValueCalculator;
        EpsilonForColourRootCalculatorT epsilonForColourRootCalculator;
        MaxVertexCountFromEpsilonCalculatorT maxVertexCountFromEpsilonCalculator;
        MaxNoiseEpsilonCalculatorT maxNoiseEpsilonCalculator;
        std::function<double()> randomDeltaNoiseCoeffCalculator;
        std::function<uint32_t(uint32_t)> numberOfBucketsCalculator;

        double firstLevelChildPadding;
        double nestedColourChildPadding;
        double gAcceleration;
        double baseVerexWeight;
        double addWeightFromChildrenCoeff;
        double kInitialLayoutCoeff;
        double nextLevelDownCoeffForPredicted;
        double minDistanceBetweenLevelsCoeff;

        // Expressed in degrees (0, 2PI)
        float minRequiredEdgeAngleRequriedRad;
        double minRequiredDistanceBetweenAdjacentLevels;
        
        double sCoeff;
        double defaultAlphaP;
        double defaultBetaP;
        double marginPadding;
        double pullUpCoeff;

        using SpringForceCalculatorT = std::function<std::pair<double, double>(std::pair<double, double>)>;
        SpringForceCalculatorT springFCalculator;
        using RepulsionForceCalculatorT = std::function<std::pair<double, double>(std::pair<double, double>, bool)>;
        RepulsionForceCalculatorT repulsionFCalculator;
        double maxRadiusOfRepulsionField;
        double fineTuningForceMoveCoeff;

        double minBoxWidthForUncoloured;
        double minYDistanceBetweenUncolouredLevels;
    }; 

    LayoutDrawer(const AlgorithmParams& algorithmParams) : 
        m_algorithmParams{algorithmParams},
        m_graph{nullptr}, m_rootColourNode{nullptr}, 
        m_cumFInterspring{1}, m_epsilonsForVertices{0},
        m_layoutXPositionsWrapperPtr{nullptr},
        m_optLogGraphId{std::nullopt} {}

    LayoutDrawer(AlgorithmParams&& algorithmParams) : 
        m_algorithmParams{std::move(algorithmParams)},
        m_graph{nullptr}, m_rootColourNode{nullptr}, 
        m_cumFInterspring{1}, m_epsilonsForVertices{0},
        m_layoutXPositionsWrapperPtr{nullptr},
        m_optLogGraphId{std::nullopt} {}

    std::vector<CartesianCoords> findLayoutForGraph(
        ColouredGraph& graph, ColourHierarchyNode& rootColourNode,
        double defaultEpsilon  
    );

    void setLogGraphId(const std::string& logGraphId) {m_optLogGraphId = logGraphId;}
    void setLogGraphId(std::string&& logGraphId) {m_optLogGraphId.emplace(std::move(logGraphId));}

private:

    using EqualColourDepthColourFinderT = std::function<std::pair<uint32_t, uint32_t>(uint32_t, uint32_t)>;

    struct F {
        
        using PotentialMinimaListT = std::variant<const std::array<double, 1>, const std::array<double, 3>>;

        F(const Vertex& v, const double& xp) : v{v}, xp{xp} {} 
        virtual double operator()(double x, uint32_t k) const = 0;
        virtual PotentialMinimaListT getPotentialMinima() const = 0;

        const Vertex& v;
        const double& xp;

        virtual ~F() = default;
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

    struct FCollection : public std::vector<std::unique_ptr<F>> {

        using BaseClass = std::vector<std::unique_ptr<F>>;

        // Note: Does not check if the real underlying value is of type Fp
        void emplace_back_fp(std::unique_ptr<F>&& uniqueFPtrRValue, uint32_t vIndex) {
            BaseClass::emplace_back(std::move(uniqueFPtrRValue));
            ++FpCount;    
            FpVertexIndices.emplace_back(vIndex);
        }

        // Note: Does not check if the real underlying value is of type Fcs
        void emplace_back_fcs(std::unique_ptr<F>&& uniqueFPtrRValue, uint32_t vIndex) {
            BaseClass::emplace_back(std::move(uniqueFPtrRValue));
            ++FcsCount;
        }

        std::vector<uint32_t> getFpVertexIndices() const {return FpVertexIndices;}
        std::vector<uint32_t> extractFpVertexIndices() {return std::move(FpVertexIndices);}

        uint32_t FpCount;
        uint32_t FcsCount;
        std::vector<uint32_t> FpVertexIndices;
        std::vector<uint32_t> FcsVertexIndices;
    };

    void performPinkIndicesConstruction(
        uint32_t& currentPink, 
        std::optional<std::reference_wrapper<std::string>> optPinkIndicesStrRef = std::nullopt, 
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColourNode = std::nullopt
    );

    void performBlueIndicesConstruction(
        uint32_t& currentBlue,
        std::optional<std::reference_wrapper<std::string>> optBlueIndicesStrRef = std::nullopt, 
        std::optional<std::reference_wrapper<ColourHierarchyNode>> optColopurNode = std::nullopt
    );

    void emplaceColourNodesInArray();

    void buildfirstVertexOfColourForLevelMarkers();

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

    // Returns fixed right box bound, which may become larger than `boxBounds.second`
    // because of nested level padding between child colour boxes, 
    // see (`m_algorithmParams.nestedColourChildPadding`).
    double findLayoutForColouredSubgraph(
        const ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
        const std::pair<double, double>& startingPositionForColourRoot, 
        const std::pair<double, double>& boxBounds
    );

    void drawNestedColourSubgraphs(
        const std::vector<uint32_t>& colourOrder
    );

    void fixUpwardPointingEdgesInColourNodeChildren(const ColourHierarchyNode& colourNode);

    void adjustAllYCoordinatesToSatisifyDownwardFlow();

    // Returns higehst y coord assigned to any vertice during the execution of the method
    double findInitialLayoutForColouredSubgraph(
        ArrayOfArraysInterface<uint32_t>& verticesPerLevelForColour, 
        std::pair<double, double> startingPositionForColourRoot, 
        const std::pair<double, double>& boxBounds
    );

    void moveVerticeFromXOptBasedOnNoise(
        double xOpt, double noise, 
        BucketifiedLineSegment<
            uint32_t, OnePairFieldArrayWrapper<double, double, double, 1>&, size_t
        >& xPositionsBucketified
    );

    // `otherBorderInfSign` can be either 1 (for +inf) or -1 (for -inf)
    void moveAllVerticesInXRangeToNewXRange(
        const std::pair<double, double>& baseXRange, double newXRangeBorder, 
        int8_t otherBorderInfSign, double moveDistanceFunctionSubtrahend, double moveDistanceFunctionCoeff, 
        BucketifiedLineSegment<
            uint32_t, OnePairFieldArrayWrapper<double, double, double, 1>&, size_t
        >& xPositionsBucketified, 
        std::optional<std::reference_wrapper<std::vector<uint32_t>>> precomputedVerticesInXRangeIndices = std::nullopt
    );

    FCollection buildFCollectionForVertex(
        uint32_t vIndex, const std::unordered_set<uint32_t>& alreadyDrawnVerticesSet, double wPrim
    );

    std::unique_ptr<F> buildF(
        uint32_t vIndex, uint32_t k, double s
        // double alphaP, double betaP
    ) const;

    double findPositionXThatMinimizesFCollection(
        const std::vector<std::unique_ptr<F>>& FCollection, uint32_t k
    ) const;

    void moveElementsToTheInterval(
        const std::pair<double, double>& intervalBounds, 
        std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions 
    ) const;

    void createGapsAlongXAxisBetweenVertices(
        std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions,
        const std::pair<double, double>& boxBounds, double gapEpsilon
    );

    // void createGapForTwoConsecutiveVertices(
    //     std::vector<std::pair<uint32_t, double>>& VkVerticesXPositions, 
    //     size_t i, std::optional<double>& gamma, 
    //     const std::pair<double, double>& boxBounds, double gapEpsilon
    // );

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
    std::vector<bool> m_colourSubgraphAlreadyDrawn;
    std::vector<std::pair<double, double>> m_colourSubgraphsXBoxBounds;
    std::vector<double> m_colourSubgraphsLargestYCoords;
    uint32_t m_maxColour;

    // rows - colours, columns - levels
    SparseMatrix<uint32_t, false> m_firstVertexOfColourForLevelMarkers;
    std::vector<double> m_maxYCoordForALevel;
    std::vector<long double> m_cumYCoordDiffForLevels;
    std::vector<uint32_t> m_termCountForLevels;

    std::vector<uint32_t> m_pinkIndices;
    std::vector<uint32_t> m_blueIndices;
    SparseArray<std::pair<double, double>> m_cumFInterspring;
    SparseArray<double> m_epsilonsForVertices;

    std::vector<std::pair<double, double>> m_layoutPositions;
    std::unique_ptr<OnePairFieldArrayWrapper<double, double, double, static_cast<uint8_t>(1)>> m_layoutXPositionsWrapperPtr;
    std::vector<std::pair<int64_t, std::vector<uint32_t>>> m_lastFpIndices;

    std::optional<std::string> m_optLogGraphId;

};

}

#endif