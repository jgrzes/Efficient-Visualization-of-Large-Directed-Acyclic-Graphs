#ifndef NET__GRPC_LAYOUT_SERVICE_H
#define NET__GRPC_LAYOUT_SERVICE_H

#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/uuid/uuid_io.hpp>

#include "net_compiled_from_proto/py_to_cpp_backend.grpc.pb.h"
#include "net_compiled_from_proto/py_to_cpp_backend.pb.h"
#include "../algorithms/Graph_Colourer.h"
#include "../algorithms/Layout_Drawer.h"
#include "../logging/boost_logging.hpp"

namespace net {

using GraphColourer = algorithms::GraphColourer;
using LayoutDrawer = algorithms::LayoutDrawer;
using Graph = data_structures::Graph;
using GraphInterface = data_structures::GraphInterface;
using ColouredGraph = data_structures::ColouredGraph;

class GrpcLayoutService final : public GraphLayoutService::Service {

public:

    GrpcLayoutService(
        const GraphColourer::AlgorithmParams& colouringAlgParams, 
        const LayoutDrawer::AlgorithmParams& layoutAlgParams, 
        uint32_t maxRecursionDepthInGraphColouring, 
        double defaultEpsilonInLayoutDrawing
    ) : m_colouringAlgParams{colouringAlgParams}, m_layoutAlgParams{layoutAlgParams}, 
        m_maxRecursionDepthInGraphColouring{maxRecursionDepthInGraphColouring}, 
        m_defaultEpsilonInLayoutDrawing{defaultEpsilonInLayoutDrawing} {}

    grpc::Status computeGraphLayout(grpc::ServerContext* context, const EdgeList* edgeList, GraphLayout* response);

private:

    void fillFileWithColourHierarchy(
        std::ofstream& outputFileStream, 
        const GraphColourer::ColourHierarchyNode& colourHierarchyNode, 
        uint32_t indent = 1
    ) const;

    void callQAPPythonScript(
        ColouredGraph& graph, 
        GraphColourer::ColourHierarchyNode& colourHierarchyRoot
    ) const;

    void callQAPScriptAndModifyColourHierarchy(
        ColouredGraph& graph, 
        GraphColourer::ColourHierarchyNode& colourHierarchyRoot, 
        const std::string& colourHierarchyAndFMatrixPathFile
    ) const;

    void fillVectorOfColourHierarchyNodesPtr(
        const GraphColourer::ColourHierarchyNode& colourHierarchyNode,
        std::vector<GraphColourer::ColourHierarchyNode*>& colourHierarchyNodesPtrs
    ) const;

    void sortChildrenInColourHierarchyNodeWithRecursion(
        GraphColourer::ColourHierarchyNode& colourHierarchyNode
    ) const;

    void flipYCoordinates(std::vector<std::pair<double, double>>& graphLayout) {
        for (auto& [x, y] : graphLayout) y = -y;    
    }

    void pushLayoutToFirstQuarterOfCartesianSpace(
        std::vector<std::pair<double, double>>& graphLayout, double xPadding = 0.25, double yPadding = 0.25
    );

    void buildColourHierarchyString(
        const GraphColourer::ColourHierarchyNode& colourHierarchyNode, 
        std::string& colourHierarchyString, 
        uint32_t indent = 1
    ) const;

    GraphColourer::AlgorithmParams m_colouringAlgParams;
    LayoutDrawer::AlgorithmParams m_layoutAlgParams;
    uint32_t m_maxRecursionDepthInGraphColouring;
    double m_defaultEpsilonInLayoutDrawing;

};

}

#endif
