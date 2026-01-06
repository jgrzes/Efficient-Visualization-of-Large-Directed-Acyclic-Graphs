#include "algorithm_params_creation.hpp"

#include <random>
#include <math.h>

namespace algorithms {

#define SIGNUM_EPS 1e-6
#define _signum(_x) ((std::abs(_x) < SIGNUM_EPS) ? 0 : (_x > 0 ? 1 : -1))

GraphColourer::AlgorithmParams createDefaultGraphColourerAlgParams() {
    return GraphColourer::AlgorithmParams(
        [dEdgesThresholdCoeff = 3, minCumCountOfVertices = 3](uint32_t level, uint32_t cumDisputableEdgesAtLevel, uint32_t cumVerticesAtLevel) -> bool {
            if (cumVerticesAtLevel < minCumCountOfVertices) return false;
            return level >= 1 && (cumDisputableEdgesAtLevel * dEdgesThresholdCoeff) > cumVerticesAtLevel;
        }, 
        [](uint32_t level, uint32_t commonVerticesCount) -> bool {
            return commonVerticesCount >= 3;
        }, 3
    );
}


LayoutDrawer::AlgorithmParams createDefaultLayoutDrawerAlgParams() {
    LayoutDrawer::AlgorithmParams layoutAlgorithmParams;
    
    layoutAlgorithmParams.FInterspringCalculator = [
        w1XInterspring = 3, w2XInterspring = 1, 
        w1YInterspring = 3, w2YInterspring = 1, 
        w3YInterspring = 1, w4YInterspring = 1
    ](uint32_t uColour, uint32_t uLevel, uint32_t vColour, uint32_t vLevel) -> std::pair<double, double> {
        int64_t a = static_cast<int64_t>(uColour) - static_cast<int64_t>(vColour);
        uint32_t b = std::abs(a);
        int64_t c = static_cast<int64_t>(uLevel) - static_cast<int64_t>(vLevel);
        return {
            w1XInterspring * static_cast<double>(std::pow(b, w2XInterspring)) * _signum(-a), 
            w1YInterspring * static_cast<double>(std::pow(b, w2YInterspring)) * w3YInterspring * static_cast<double>(std::pow(std::abs(c), w4YInterspring)) * _signum(c)
        };
    };
    
    layoutAlgorithmParams.FInterspringPushUpwardsValueCalculator = [](auto p) -> std::pair<double, double> {
        return {p.first * 0.75, 0};
    };

    layoutAlgorithmParams.epsilonForColourRootCalculator = [boxWidthCoeff = 3.0](uint32_t maxWidth) -> double {
        return static_cast<double>(maxWidth) * boxWidthCoeff;
    };

    layoutAlgorithmParams.maxVertexCountFromEpsilonCalculator = [inverseBoxWidthCoeff = 1.0 / 3.0](double epsilon) -> uint32_t {
        return static_cast<uint32_t>(epsilon * inverseBoxWidthCoeff);
    };

    layoutAlgorithmParams.maxNoiseEpsilonCalculator = [intervalWidthPercentage = 0.04](uint32_t n, double intervalWidth) -> double {
        double eps0 = intervalWidth * intervalWidthPercentage;
        return eps0 / std::log2(static_cast<double>(n+1));
    };

    layoutAlgorithmParams.randomDeltaNoiseCoeffCalculator = [low=0.2, high=0.4]() -> double {
        static std::random_device rd;
        static std::mt19937 rng(rd());
        static std::uniform_real_distribution<double> dist(low, high);
        return dist(rng);
    };

    layoutAlgorithmParams.numberOfBucketsCalculator = [targetNumOfElementsPerBucket = 12.0](uint32_t cumNumberOfElements) -> uint32_t {
        return static_cast<uint32_t>(
            std::ceil(static_cast<double>(cumNumberOfElements) / targetNumOfElementsPerBucket)
        );
    };

    layoutAlgorithmParams.firstLevelChildPadding = 2.5;
    layoutAlgorithmParams.nestedColourChildPadding = 0.4;
    layoutAlgorithmParams.gAcceleration = 9.81;
    layoutAlgorithmParams.baseVerexWeight = 1.0;
    // layoutAlgorithmParams.addWeightFromChildrenCoeff = 0.04;
    layoutAlgorithmParams.addWeightFromChildrenCoeff = 0;
    layoutAlgorithmParams.kInitialLayoutCoeff = 1.8;
    layoutAlgorithmParams.nextLevelDownCoeffForPredicted = 0.45;
    layoutAlgorithmParams.minDistanceBetweenLevelsCoeff = 0.25;

    layoutAlgorithmParams.minRequiredEdgeAngleRequriedRad = 20 * (M_PI/180);
    layoutAlgorithmParams.minRequiredDistanceBetweenAdjacentLevels = 10.0;

    layoutAlgorithmParams.sCoeff = 1.05; 
    layoutAlgorithmParams.defaultAlphaP = 0.5;
    layoutAlgorithmParams.defaultBetaP = 1.5;
    layoutAlgorithmParams.marginPadding = 0.1;
    // layoutAlgorithmParams.pullUpCoeff = 0.1;
    layoutAlgorithmParams.pullUpCoeff = 0;


    layoutAlgorithmParams.springFCalculator = [
        springFEps = 1e-6
    ](std::pair<double, double> d) -> std::pair<double, double> {
        static const double c1s = 0.0075;
        static const double c2s = 0.1;

        auto [dx, dy] = d;
        double signumDx = (std::abs(dx) < springFEps)
            ? 0
            : ((dx > 0) ? 1 : -1);
        double signumDy = (std::abs(dy) < springFEps)
            ? 0
            : ((dy > 0) ? 1 : -1);    

        dx = std::abs(dx);
        dy = std::abs(dy);
        auto dLength = std::sqrt(std::pow(dx, 2) + std::pow(dy, 2));
        if (dLength < springFEps) return {0, 0};
        auto sinAlpha = dy / dLength;
        auto cosAlpha = dx / dLength;
        return {
            signumDx * cosAlpha * c1s * std::log(std::max(1.0, dLength/c2s)), 
            signumDy * sinAlpha * c1s * std::log(std::max(1.0, dLength/c2s))
        };
    };

    layoutAlgorithmParams.repulsionFCalculator = [
        repulsionFEps = 1e-6
    ](std::pair<double, double> d, bool areAdj) -> std::pair<double, double> {
        static const double cr = 1.2;
        static const double crAdj = 0.7;

        auto [dx, dy] = d;
        double signumDx = (std::abs(dx) < repulsionFEps)
            ? 0
            : ((dx > 0) ? 1 : -1);
        double signumDy = (std::abs(dy) < repulsionFEps)
            ? 0
            : ((dy > 0) ? 1 : -1);    

        dx = std::abs(dx);
        dy = std::abs(dy);
        auto dLength = std::sqrt(std::pow(dx, 2) + std::pow(dy, 2));
        if (dLength < repulsionFEps) return {0, 0};
        auto sinAlpha = dy / dLength;
        auto cosAlpha = dx / dLength;
        return {
            signumDx * cosAlpha * (areAdj ? crAdj : cr) / (std::pow(dLength, 2)), 
            signumDy * sinAlpha * (areAdj ? crAdj : cr) / (std::pow(dLength, 2))
        };
    };

    layoutAlgorithmParams.maxRadiusOfRepulsionField = 6;
    layoutAlgorithmParams.fineTuningForceMoveCoeff = 0.1;
    layoutAlgorithmParams.minBoxWidthForUncoloured = 40;
    layoutAlgorithmParams.minYDistanceBetweenUncolouredLevels = 4;

    return layoutAlgorithmParams;
}

#undef SIGNUM_EPS
#undef _signum

}