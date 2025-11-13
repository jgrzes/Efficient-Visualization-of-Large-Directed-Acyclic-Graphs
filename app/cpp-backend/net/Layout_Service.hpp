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
#include "../algorithms/Layout_Drawer.h"
#include "../algorithms/Graph_Colourer.h"
#include "serialized_message_processing.hpp"

namespace net {

using Graph = data_structures::Graph;
using ThreadPool = concurrency::ThreadPool;
using LayoutDrawer = algorithms::LayoutDrawer;
using GraphColourer = algorithms::GraphColourer;

constexpr timeval createTimeval(time_t seconds, suseconds_t microseconds) {
    return timeval{seconds, microseconds};
}

class LayoutService {

    using GraphBuildEntry = std::tuple<size_t, Graph::AdjList, bool>;
    using CartesianCoords = algorithms::CartesianCoords;

public:

    LayoutService(
        const std::string& ipAdddress, int port,
        const std::string& qapServiceIpAddress,
        int qapServicePort, 
        size_t clientHandlingThreadCount,
        size_t layoutCreationThreadPoolSize, 
        timeval timewaitOnClientRequestReading = createTimeval(3, 0),
        std::optional<uint16_t> optMaxListenQueueSize = std::nullopt,
        bool startImmediately = true 
    ) : m_ipAddress{ipAdddress}, m_port{port}, 
        m_qapServiceIpAddress{qapServiceIpAddress}, 
        m_qapServicePort{qapServicePort},
        m_timewaitOnClientRequestReading{timewaitOnClientRequestReading},
        m_clientHandlingThreadCount{clientHandlingThreadCount}, 
        m_layoutServiceThreadPool{layoutCreationThreadPoolSize, startImmediately} {

        setAndValidateMaxListenQueueSize(optMaxListenQueueSize);
        m_serverRunning = false;
        if (startImmediately) start();
    }

    void setAndValidateMaxListenQueueSize(
        std::optional<uint16_t> optMaxListenQueueSize = std::nullopt
    );

    void setColouringParams(const GraphColourer::AlgorithmParams& params);
    void setColouringParams(GraphColourer::AlgorithmParams&& params); 

    void setMaxRecursionInGraphColouring(uint32_t maxRecursion);
    void setDefaultEpsilonInLayoutDrawing(double defaultEpsilon);

    void setLayoutFindingParams(const LayoutDrawer::AlgorithmParams& params);
    void setLayoutFindingParams(LayoutDrawer::AlgorithmParams&& params);

    void start();
    void shutDown();

private:

    void createClientHandlingThreads();
    void internalStart(const bool& finalizeStartUp, std::condition_variable& serverStartUpCV);

    uint16_t readGraphIdFromClientDataChunk(const std::string& strNewData) {
        return readGraphIdFromGraphMessageChunk(strNewData);
    }

    void sendReturnLayoutString(int clientFd, const std::vector<CartesianCoords>& layoutVector);

    // Returns true if graph has been fully constructed, 
    // otherwise returns false
    bool modifyReqestGraphAfterReceivingNewData(const std::string& strNewData, int threadId, int clientFd) {
        uint16_t graphId = readGraphIdFromGraphMessageChunk(strNewData);
        std::unique_lock<std::mutex> lock(m_graphBuildEntriesMutexes[threadId]);
        auto graphBuildEntry = std::move(m_graphAdjListsForClientRequests[threadId][graphId]);
        lock.unlock();    
        updateGraphBuildEntry(strNewData, graphBuildEntry);
        bool isFinal = std::get<2>(graphBuildEntry);        
        lock.lock();
        m_graphAdjListsForClientRequests[threadId][graphId] = std::move(graphBuildEntry);
        lock.unlock();
        return isFinal;
    }

    bool m_serverRunning;
    std::thread m_serverThread;
    
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

    std::vector<std::unordered_map<uint16_t, GraphBuildEntry>> m_graphAdjListsForClientRequests;
    std::vector<std::unordered_map<uint16_t, std::pair<int, std::optional<std::vector<CartesianCoords>>>>> m_graphLayoutsForClientRequests;
    std::vector<std::mutex> m_graphBuildEntriesMutexes;

    ThreadPool m_layoutServiceThreadPool;
    std::unique_ptr<GraphColourer::AlgorithmParams> m_colouringParams = nullptr;
    std::unique_ptr<LayoutDrawer::AlgorithmParams> m_layoutAlgParams = nullptr;
    uint32_t m_maxRecursionInGraphColouring = 1;
    double m_defaultEpsilonInLayoutDrawing = 1.0;

};

}

#endif