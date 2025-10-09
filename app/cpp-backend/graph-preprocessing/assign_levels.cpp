#include "assign_levels.h"

#include <stdexcept>
#include <deque>
#include <tuple>
#include <iostream>

namespace graph_preprocessing {

void assignLevelsInGraph(GraphInterface& graph) {
    auto rootPointerList = graph.getRootList();
    if (rootPointerList.empty()) {
        std::runtime_error{"Assign levels error: graph must have at least one root"};
    }

    std::deque<std::pair<uint32_t, int>> q;
    std::deque<std::pair<uint32_t, int>> qPrim;
    for (const auto root : rootPointerList) {
        q.push_back({root, 0});
    }

    std::vector<bool> shouldInspect(graph.getVertexCount(), true);
    std::vector<uint32_t> liveIvCollection;
    liveIvCollection.reserve(graph.getVertexCount());
    for (size_t u=0; u<graph.getVertexCount(); ++u) {
        liveIvCollection.emplace_back(graph.NR(u).size());
    }

    #define _extractFront(_q, _u, _uLevel) (std::tie(_u, _uLevel) = _q.front(), _q.pop_front())
    while (!(q.empty() && qPrim.empty())) {
        uint32_t u;
        int uLevel;
        if (!q.empty()) _extractFront(q, u, uLevel);
        else _extractFront(qPrim, u, uLevel);

        if (shouldInspect[u]) {
            shouldInspect[u] = false;
            graph.setLevelForVertex(u, uLevel);
            for (const auto v : graph.N(u)) {
                if (--liveIvCollection[v] == 0) {
                    q.push_back({v, uLevel+1});
                } else {
                    qPrim.push_back({v, uLevel+1});
                }
            }
            
        }
    }

    #undef _extractFront
}

}