#ifndef DATA_STRUCTURES__PARTIALLY_DISABLED_GRAPH_H
#define DATA_STRUCTURES__PARTIALLY_DISABLED_GRAPH_H

#include "Graph.h"
#include <memory>
#include <variant>

namespace data_structures {

// Graph view which allows some vertices of the graph to be temporarily disabled.
// Has a view of a graph, but may not directly own (see below), rather stores it in a pointer.
// View to graph can be stored in a raw pointer or in a shared ptr, based on disclosed `storingPolicy`.
// If `storingPolicy` is set to `GraphStoringPolicy::RAW_POINTER_OWNING` the class takes full and exclusive ownership of the graph object.
class PartiallyDisabledGraph : public GraphInterface {

public:

    using VertexAdjSet = std::unordered_set<uint32_t>;

    enum class GraphStoringPolicy: uint8_t {
        RAW_POINTER_NON_OWNING = 0, 
        RAW_POINTER_OWNING = 1,
        SHARED_POINTER = 2
    };

    class PartiallyDisabledNeighbourhoodView : public BaseNeighbourhoodView {

    public:

        friend PartiallyDisabledGraph;

    protected:

        bool shouldIgnoreAndJumpForward(const NeighbourhoodIterator& it) const;

        PartiallyDisabledNeighbourhoodView(const GraphInterface* owner, VertexAdjSet& N) : 
            BaseNeighbourhoodView{owner, N} {}
            
        PartiallyDisabledNeighbourhoodView(const GraphInterface* owner, const VertexAdjSet& N) : 
            BaseNeighbourhoodView{owner, const_cast<VertexAdjSet&>(N)} {}

    };

    PartiallyDisabledGraph(Graph* graphPtr, GraphStoringPolicy storingPolicy = GraphStoringPolicy::SHARED_POINTER);
    PartiallyDisabledGraph(Graph* graphPtr, const std::vector<uint32_t>& verticesToDisable, GraphStoringPolicy storingPolicy = GraphStoringPolicy::SHARED_POINTER);
    // Creates a `PartiallyDisabledGraph` object in either deep copying or shallow copying mode.
    // If the deep copying mode is selected a new graph will be created and stored in the `m_graphView` field 
    // and `m_storingMode` will be set to `GraphStoringMode::RAW_POINTER_OWNING`, so will take full ownership of the graph object.
    // If the shallow copying mode is selected and `graph` argument stores a object of implementation variety (e.g. `Graph`)
    // then the class will not own the object - `m_storingPolicy` will be set to `GraphStoringMode::RAW_POINTER_NON_OWNING`. 
    // If `graph` is of view variety (e.g. `PartiallyDisabledGraph`) then the ownership policy will be set based on `graph`'s storing policy.
    PartiallyDisabledGraph(GraphInterface& graph, GraphImplCopyingMode graphImplCopyingMode);

    const Graph& getUnderlyingGraphImpl() const override;
    Graph& getUnderlyingGraphImpl() override;
    
    size_t getVertexCount() const override {return m_graphView->getVertexCount();} 
    bool isDirected() const override {return m_graphView->isDirected();}

    const Neighbourhood N(uint32_t vIndex) const override;
    Neighbourhood N(uint32_t vIndex) override;
    const Neighbourhood N(const Vertex& v) const override;
    Neighbourhood N(const Vertex& v) override {return std::move(N(v.index));}

    const Neighbourhood NR(uint32_t vIndex) const override;
    Neighbourhood NR(uint32_t vIndex) override;
    const Neighbourhood NR(const Vertex& v) const override;
    Neighbourhood NR(const Vertex& v) override {return std::move(NR(v.index));}

    const Vertex& getVertex(uint32_t vIndex) const override {return m_graphView->getVertex(vIndex);}
    Vertex& getVertex(uint32_t vIndex) override {return m_graphView->getVertex(vIndex);}
    const std::vector<uint32_t>& getRootList() const override {recomputeRootsIfNeeded(); return m_graphView->getRootList();}
    const std::vector<uint32_t>& getLeavesList() const override {return m_graphView->getLeavesList();}

    void setLevelForVertex(uint32_t vIndex, int level) override {return m_graphView->setLevelForVertex(vIndex, level);}

    GraphStoringPolicy getGraphStroingPolicy() const {return m_storingPolicy;}
    void forgetUnderlyingGraphImpl() {
        m_storingPolicy = GraphStoringPolicy::RAW_POINTER_NON_OWNING;
        m_graphView = GraphView(nullptr);
    }
    
    const std::vector<bool>& getDisabledFlagsVec() const {return m_disabledFlags;}
    std::vector<uint32_t> getDisabledVerticesList() const;

    void setDisabledFlagsVec(const std::vector<bool>& newDisabledFlags) {m_disabledFlags = newDisabledFlags;}

    bool isVertexDisabled(uint32_t vIndex) const {return m_disabledFlags[vIndex];}
    bool isVertexDisabled(const Vertex& v) const {return m_disabledFlags[v.index];}
    void disableVertex(uint32_t vIndex) {m_disabledFlags[vIndex] = true;}
    void disableVertex(const Vertex& v) {m_disabledFlags[v.index] = true;}
    void enableVertex(uint32_t vIndex) {m_disabledFlags[vIndex] = false;}
    void enableVertex(const Vertex& v) {m_disabledFlags[v.index] = false;}

    void disableVertices(const std::vector<uint32_t>& verticesToDisable);
    void enableVertices(const std::vector<uint32_t>& verticesToEnable);
    void changeStateOfVertices(const std::vector<std::pair<uint32_t, bool>>& newVerticesStates);

    virtual ~PartiallyDisabledGraph();

protected: 

    void recomputeRootsIfNeeded() const;
    void recomputeLeavesIfNeeded() const;

    struct GraphView : public std::variant<Graph*, std::shared_ptr<Graph>> {
        using BaseClass = std::variant<Graph*, std::shared_ptr<Graph>>;
        GraphView() = delete;
        GraphView(const GraphView& otherGraphView) : BaseClass(static_cast<const BaseClass&>(otherGraphView)) {}
        GraphView(nullptr_t) : BaseClass{static_cast<Graph*>(nullptr)} {}
        GraphView(Graph* graph) : BaseClass{graph} {}
        GraphView(std::shared_ptr<Graph> graph) : BaseClass{graph} {}

        Graph* operator->() const;
        Graph* operator->();
    };

    GraphView m_graphView;
    GraphStoringPolicy m_storingPolicy;
    std::vector<bool> m_disabledFlags;

};

// The function that checks if a vertice should be skipped due (e.g. due to being disabled).
inline bool shouldSkipVertex(const GraphInterface& graph, uint32_t vIndex) {
    if (auto castedGraph = dynamic_cast<const PartiallyDisabledGraph*>(&graph);
        castedGraph != nullptr) {

        return castedGraph->isVertexDisabled(vIndex);
    } else return false;
}    

inline bool shouldSkipVertex(const GraphInterface* graph, const GraphInterface::Vertex& v) {
    return shouldSkipVertex(graph, v.index);
}

}

#endif