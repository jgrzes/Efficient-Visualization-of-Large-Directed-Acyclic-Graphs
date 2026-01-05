#include "assign_levels.h"

#include <stdexcept>
#include <deque>
#include <tuple>
#include <iostream>

#include "../logging/boost_logging.hpp"

namespace graph_preprocessing {

void assignLevelsInGraph(GraphInterface& graph) {
    auto rootPointerList = graph.getRootList();
    if (rootPointerList.empty()) {
        throw std::runtime_error{"Assign levels error: graph must have at least one root"};
    }

    std::deque<std::pair<uint32_t, int>> q;
    std::deque<std::pair<uint32_t, int>> qPrim;
    for (const auto root : rootPointerList) {
        q.push_back({root, 0});
    }

    std::vector<bool> shouldInspect(graph.getVertexCount(), true);
    int64_t remainingInspectionsCount = shouldInspect.size();
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
        else {
            _extractFront(qPrim, u, uLevel);
            logging::log_warning(
                "Taken out " + std::to_string(u) + ", level = " + std::to_string(uLevel) +
                " from secondary (qPrim) queue when assigning levels."
            );
        }

        if (shouldInspect[u]) {
            shouldInspect[u] = false;
            graph.setLevelForVertex(u, uLevel);
            for (const auto v : graph.N(u)) {
                // std::cout << u << " -> " << v << "\n";
                if (--liveIvCollection[v] == 0) {
                    q.push_back({v, uLevel+1});
                } else {
                    qPrim.push_back({v, uLevel+1});
                }
            }
            
        }

        --remainingInspectionsCount;
        if (remainingInspectionsCount == 0) break;
    }

    #undef _extractFront
}

}