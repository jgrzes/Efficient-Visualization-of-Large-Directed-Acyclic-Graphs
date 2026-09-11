#ifndef ALGORITHMS__ALGORITHM_PARAMS_CREATION_H
#define ALGORITHMS__ALGORITHM_PARAMS_CREATION_H

#include "Graph_Colourer.h"
#include "Layout_Drawer.h"

namespace algorithms {
struct GraphColourerTuningParams {
    uint32_t dEdgesThresholdCoeff = 3;
    uint32_t minCumCountOfVertices = 3;
    uint32_t mergeCommonVerticesThreshold = 3;
    uint32_t minNumberOfVerticesAtStartingLevel = 3;
};

struct LayoutDrawerTuningParams {
    double xInterspringWeight = 3.0;
    double xInterspringPower = 1.0;
    double interspringUpwardsTransferCoeff = 0.75;

    double boxWidthCoeff = 3.0;
    double noiseIntervalWidthPercentage = 0.04;

    double nestedColourChildPadding = 0.4;
    double minRequiredDistanceBetweenAdjacentLevels = 10.0;
};

GraphColourer::AlgorithmParams createGraphColourerAlgParams(
    const GraphColourerTuningParams& params
);

LayoutDrawer::AlgorithmParams createLayoutDrawerAlgParams(
    const LayoutDrawerTuningParams& params
);

GraphColourer::AlgorithmParams createDefaultGraphColourerAlgParams();

LayoutDrawer::AlgorithmParams createDefaultLayoutDrawerAlgParams();

}

#endif