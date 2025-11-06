#ifndef NET__LAYOUT_SERVICE_H
#define NET__LAYOUT_SERVICE_H

#include <string>
#include <list>
#include <optional>
#include <vector>
#include <thread>
#include <mutex>
#include <tuple>
#include <unordered_map>
#include <sys/time.h>

#include "../data-structures/Graph.h"
#include "../concurrency/Thread_Pool.hpp"

namespace net {

using Graph = data_structures::Graph;
using ThreadPool = concurrency::ThreadPool;

constexpr timeval createTimeval(time_t seconds, suseconds_t microseconds) {
    return timeval{seconds, microseconds};
}

class LayoutService {

public:

    LayoutService(
        const std::string& ipAdddress, int port,
        const std::string& qapServiceIpAddress,
        int qapServicePort, 
        size_t clientHandlingThreadCount,
        timeval timewaitOnClientRequestReading = createTimeval(3, 0),
        std::optional<uint16_t> optMaxListenQueueSize = std::nullopt,
        bool startImmediately = true 
    ) : m_ipAddress{ipAdddress}, m_port{port}, 
        m_qapServiceIpAddress{qapServiceIpAddress}, 
        m_qapServicePort{qapServicePort},
        m_timewaitOnClientRequestReading{timewaitOnClientRequestReading},
        m_clientHandlingThreadCount{clientHandlingThreadCount} {

        setAndValidateMaxListenQueueSize(optMaxListenQueueSize);
        m_serverRunning = false;
        if (startImmediately) internalStart();
    }

    void setAndValidateMaxListenQueueSize(
        std::optional<uint16_t> optMaxListenQueueSize = std::nullopt
    );

private:

    // std::tuple<Graph, bool> parseRequestMessageFromClient();

    void createClientHandlingThreads();
    void internalStart();

    bool m_serverRunning;
    size_t m_clientHandlingThreadCount;
    timeval m_timewaitOnClientRequestReading;

    std::string m_ipAddress;
    int m_port;
    std::string m_qapServiceIpAddress;
    int m_qapServicePort;
    uint16_t m_maxListenQueueSize;

    std::vector<std::thread> m_clientHandlingThreads;
    std::vector<std::list<int>> m_clientFdsForThreads;
    std::vector<std::mutex> m_clientListModMutexes;
    std::vector<std::unordered_map<int, Graph::AdjList>> m_graphAdjListsForClientRequests;

};

}

#endif