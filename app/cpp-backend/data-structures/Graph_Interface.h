#ifndef DATA_STRUCTURES__GRAPH_INTERFACE_H
#define DATA_STRUCTURES__GRAPH_INTERFACE_H

#include <cstdint>
#include <vector>
#include <unordered_set>
#include <iostream>
#include <iterator>
#include <memory>

namespace data_structures {

using size_t = std::size_t;
using ArgEdgeList = std::vector<std::pair<uint32_t, uint32_t>>;
// TODO: create a more optimized data structure for AdjList
using ArgAdjList = std::vector<std::unordered_set<uint32_t>>; 

// forward declarion of non-abstract graph class
class Graph;

class GraphInterface {

public:

    using VertexAdjSet = std::unordered_set<uint32_t>;
    using AdjList = std::vector<VertexAdjSet>;

    struct Vertex {

        constexpr Vertex(uint32_t vIndex) : index{vIndex}, level{-1} {}

        uint32_t index;
        int64_t level;

        bool seeIfLevelComputed() const {return level >= 0;}
    };

    enum class GraphImplCopyingMode : uint8_t {
        SHALLOW_COPY = 0, 
        DEEP_COPY = 1
    };


    class Neighbourhood;
    class BaseNeighbourhoodView;

    // Iterator over the a vertex neighbourhood. Does not own its data.
    class NeighbourhoodIterator {
        
    public:

        friend BaseNeighbourhoodView;
        bool operator!=(const NeighbourhoodIterator& otherBaseNeighbourhoodIt) const;
        bool operator==(const NeighbourhoodIterator& otherBaseNeighbourhoodIt) const;
        uint32_t operator*() const {return *m_it;}
        const uint32_t* operator->() const {return m_it.operator->();}
        uint32_t* operator->() {return const_cast<uint32_t*>(m_it.operator->());}
        NeighbourhoodIterator& operator++();
        NeighbourhoodIterator operator++(int);

    private:

        NeighbourhoodIterator(const BaseNeighbourhoodView* owner, VertexAdjSet& N);
        NeighbourhoodIterator(const BaseNeighbourhoodView* owner, VertexAdjSet& N, size_t n);

        const BaseNeighbourhoodView* const m_owner;
        VertexAdjSet::iterator m_it;

    };

    class BaseNeighbourhoodView {

    public:    

        friend GraphInterface;
        friend Neighbourhood;
        NeighbourhoodIterator begin() const {return NeighbourhoodIterator(this, m_N);}
        NeighbourhoodIterator begin() {return NeighbourhoodIterator(this, m_N);}
        NeighbourhoodIterator end() const {return NeighbourhoodIterator(this, m_N, m_N.size());}
        NeighbourhoodIterator end() {return NeighbourhoodIterator(this, m_N, m_N.size());}
        size_t size() const {return m_N.size();}

    protected:

        BaseNeighbourhoodView(const GraphInterface* owner, VertexAdjSet& N) : m_owner{owner}, m_N{N} {}
        BaseNeighbourhoodView(const GraphInterface* owner, const VertexAdjSet& N) : BaseNeighbourhoodView(owner, const_cast<VertexAdjSet&>(N)) {}

        bool reachedEnd(const NeighbourhoodIterator& it) const {return it.m_it == m_N.end();}
        virtual bool shouldIgnoreAndJumpForward(const NeighbourhoodIterator& it) const {return false;}

        const GraphInterface* const m_owner;
        VertexAdjSet& m_N;

    };

    class Neighbourhood : public std::unique_ptr<BaseNeighbourhoodView> {

    public:

        using BaseClass = std::unique_ptr<BaseNeighbourhoodView>;
        Neighbourhood(BaseNeighbourhoodView* baseNeighbourhoodViewPtr) : BaseClass{baseNeighbourhoodViewPtr} {}
        Neighbourhood(const Neighbourhood& otherNeighbourhood) = delete;
        Neighbourhood(Neighbourhood&& otherNeighbourhood) : BaseClass{std::move(static_cast<BaseClass&>(otherNeighbourhood))} {}

        NeighbourhoodIterator begin() const {return get()->begin();}
        NeighbourhoodIterator begin() {return get()->begin();}
        NeighbourhoodIterator end() const {return get()->end();}
        NeighbourhoodIterator end() {return get()->end();}
        size_t size() const {return get()->size();}

    };

    GraphInterface() {}

    virtual const Graph& getUnderlyingGraphImpl() const = 0;
    virtual Graph& getUnderlyingGraphImpl() = 0;

    // Vertex count takes into consideration both enabled and disabled vertices.
    virtual size_t getVertexCount() const = 0;
    virtual bool isDirected() const = 0;

    // neighbourhood getting methods
    virtual const Neighbourhood N(uint32_t vIndex) const;
    virtual Neighbourhood N(uint32_t vIndex);
    virtual const Neighbourhood N(const Vertex& v) const;
    virtual Neighbourhood N(const Vertex& v) {return std::move(N(v.index));}

    // reverse neighbourhood getting methods
    virtual const Neighbourhood NR(uint32_t vIndex) const;
    virtual Neighbourhood NR(uint32_t vIndex);
    virtual const Neighbourhood NR(const Vertex& v) const;
    virtual Neighbourhood NR(const Vertex& v) {return std::move(NR(v.index));}

    virtual const Vertex& getVertex(uint32_t vIndex) const = 0;
    virtual Vertex& getVertex(uint32_t vIndex) = 0;
    virtual const std::vector<uint32_t>& getRootList() const  = 0;
    virtual const std::vector<uint32_t>& getLeavesList() const = 0;

    virtual void setLevelForVertex(uint32_t vIndex, int level) = 0;

    virtual bool shouldSkipVertex(uint32_t vIndex) const {return false;}
    virtual bool shouldSkipVertex(const Vertex& v) const {return false;}

    friend std::ostream& operator<<(std::ostream& os, const GraphInterface& graph);

    virtual ~GraphInterface() = default;

protected:

    virtual const VertexAdjSet& NAsVertexAdjSet(uint32_t vIndex) const;
    virtual VertexAdjSet& NAsVertexAdjSet(uint32_t vIndex);

    virtual const VertexAdjSet& NRAsVertexAdjSet(uint32_t vIndex) const;
    virtual VertexAdjSet& NRAsVertexAdjSet(uint32_t vIndex);

};

std::ostream& operator<<(std::ostream& os, const GraphInterface& graph);

// The function that checks if a vertice should be skipped due (e.g. due to being disabled).
inline bool shouldSkipVertex(const GraphInterface& graph, uint32_t vIndex) {
    return graph.shouldSkipVertex(vIndex);
} 

inline bool shouldSkipVertex(const GraphInterface& graph, const GraphInterface::Vertex& v) {
    return graph.shouldSkipVertex(v);
}

}

#endif 